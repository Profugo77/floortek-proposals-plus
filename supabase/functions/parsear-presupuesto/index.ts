import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ParsedItem {
  nombre: string;
  cantidad: number;
  tipo: 'material' | 'mano_obra';
  precio_unitario: number;
  descuento: number;
}

interface ParsedPresupuesto {
  cliente_nombre: string;
  cliente_direccion: string;
  cliente_telefono: string;
  items: ParsedItem[];
}

async function buscarEnBaseDeDatos(productName: string): Promise<{ precio: number; nombre_exacto: string } | null> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sb = createClient(supabaseUrl, supabaseKey);

    // Extract meaningful keywords (skip generic words)
    const stopWords = ['piso', 'pisos', 'metro', 'metros', 'm2', 'de', 'con', 'para', 'el', 'la', 'los', 'las', 'un', 'una', 'del', 'al', 'en', 'por', 'tipo', 'color', 'modelo'];
    const keywords = productName
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 1 && !stopWords.includes(w));

    if (keywords.length === 0) return null;

    // Try exact ilike first
    const { data: exactData } = await sb
      .from('productos')
      .select('nombre, precio')
      .ilike('nombre', `%${productName}%`)
      .limit(1);

    if (exactData && exactData.length > 0 && exactData[0].precio > 0) {
      return { nombre_exacto: exactData[0].nombre, precio: exactData[0].precio };
    }

    // Fetch all products and score them by keyword matches
    const { data: allProducts } = await sb
      .from('productos')
      .select('nombre, precio')
      .gt('precio', 0);

    if (!allProducts || allProducts.length === 0) return null;

    let bestMatch: { nombre: string; precio: number } | null = null;
    let bestScore = 0;

    for (const prod of allProducts) {
      const nombreLower = prod.nombre.toLowerCase();
      let score = 0;
      for (const kw of keywords) {
        if (nombreLower.includes(kw)) {
          score += kw.length; // longer keyword matches are worth more
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatch = prod;
      }
    }

    // Require at least one meaningful keyword match
    if (bestMatch && bestScore >= 3) {
      console.log(`DB match: "${productName}" -> "${bestMatch.nombre}" (score: ${bestScore})`);
      return { nombre_exacto: bestMatch.nombre, precio: bestMatch.precio };
    }
  } catch (e) {
    console.error('Error buscando en DB:', e);
  }
  return null;
}

async function imageUrlToBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const b64 = btoa(binary);
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    return `data:${contentType};base64,${b64}`;
  } catch (e) {
    console.error('Error converting image to base64:', e);
    return null;
  }
}

async function buscarEnTiendaPisos(productName: string): Promise<{ imagen: string | null; descripcion: string | null } | null> {
  try {
    const slug = productName
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');

    const productUrl = `https://tiendapisos.com/producto/${slug}/`;
    console.log(`Fetching product page: ${productUrl}`);

    const res = await fetch(productUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
    });

    if (!res.ok) {
      console.log(`Product page returned ${res.status}`);
      return null;
    }

    const html = await res.text();

    if (html.includes('No se encontró esa página') || html.includes('error404')) {
      console.log('Product page is 404');
      return null;
    }

    // Extract main product image URL
    const imgMatch = html.match(/<img[^>]*width="800"[^>]*src="(https:\/\/tiendapisos\.com\/wp-content\/uploads\/[^"]*\.jpg)"/i)
      || html.match(/<img[^>]*src="(https:\/\/tiendapisos\.com\/wp-content\/uploads\/[^"]*\.jpg)"[^>]*width="800"/i)
      || html.match(/<img[^>]*src="(https:\/\/tiendapisos\.com\/wp-content\/uploads\/\d{4}\/\d{2}\/[^"]*\.jpg)"/i);

    // Extract product characteristics from the page
    const characteristics: string[] = [];

    // Look for table rows with product specs (common WooCommerce pattern)
    const tableRows = [...html.matchAll(/<tr[^>]*>\s*<t[hd][^>]*>([\s\S]*?)<\/t[hd]>\s*<t[hd][^>]*>([\s\S]*?)<\/t[hd]>\s*<\/tr>/gi)];
    for (const row of tableRows) {
      const label = row[1].replace(/<[^>]*>/g, '').trim();
      const value = row[2].replace(/<[^>]*>/g, '').trim();
      if (label && value && label.length < 60 && value.length < 200) {
        characteristics.push(`${label}: ${value}`);
      }
    }

    // Look for list items with specs
    const liMatches = [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];
    for (const li of liMatches) {
      const text = li[1].replace(/<[^>]*>/g, '').trim();
      if (text.length > 5 && text.length < 200 && !text.includes('$') && !text.includes('Agregar') && !text.includes('carrito')) {
        // Only add if it looks like a spec (contains colon or descriptive keywords)
        if (text.includes(':') || /(?:mm|cm|m2|kg|espesor|ancho|largo|capa|clase|resist|garant|click|formato|dimens)/i.test(text)) {
          if (!characteristics.some(c => c === text)) {
            characteristics.push(text);
          }
        }
      }
    }

    // Extract h2 description as fallback intro
    const h2Matches = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)];
    let introDesc: string | null = null;
    for (const m of h2Matches) {
      const text = m[1].replace(/<[^>]*>/g, '').trim();
      if (text.length > 20 && !text.includes('$') && text !== productName) {
        introDesc = text.substring(0, 300);
        break;
      }
    }

    if (!introDesc) {
      const descMatch = html.match(/Piso\s+(?:vin[ií]lico|flotante|SPC|laminado)[^<]{10,300}/i);
      if (descMatch) {
        introDesc = descMatch[0].trim();
      }
    }

    // Also extract from <div class="woocommerce-product-details__short-description"> or similar
    const shortDescMatch = html.match(/class="[^"]*short[_-]?description[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if (shortDescMatch) {
      const shortText = shortDescMatch[1].replace(/<[^>]*>/g, '').trim();
      if (shortText.length > 10 && !characteristics.some(c => c.includes(shortText.substring(0, 20)))) {
        if (introDesc && !introDesc.includes(shortText.substring(0, 20))) {
          introDesc = introDesc + '\n' + shortText;
        } else if (!introDesc) {
          introDesc = shortText;
        }
      }
    }

    // Build full description
    let descripcion: string | null = null;
    const parts: string[] = [];
    if (introDesc) parts.push(introDesc);
    if (characteristics.length > 0) {
      parts.push('\nCaracterísticas:\n• ' + characteristics.slice(0, 15).join('\n• '));
    }
    if (parts.length > 0) {
      descripcion = parts.join('\n').substring(0, 1000);
    }

    console.log(`Description built: ${descripcion ? descripcion.length + ' chars, ' + characteristics.length + ' specs' : 'none'}`);

    const imgUrl = imgMatch?.[1] || null;
    
    // Convert image to base64 server-side to avoid CORS issues on client
    let imagen: string | null = null;
    if (imgUrl) {
      console.log(`Downloading image: ${imgUrl}`);
      imagen = await imageUrlToBase64(imgUrl);
      console.log(`Image converted to base64: ${imagen ? 'yes (' + imagen.length + ' chars)' : 'no'}`);
    }
    
    return { imagen, descripcion };
  } catch (e) {
    console.error('Error fetching product page:', e);
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript } = await req.json();
    if (!transcript || transcript.trim().length < 5) {
      return new Response(JSON.stringify({ error: 'Transcripción muy corta' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Parsing transcript:', transcript);

    // Step 1: Use AI to parse the dictation into structured data
    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Sos un asistente que parsea dictados de presupuestos de una empresa de pisos y revestimientos en Argentina.

El usuario va a dictar de corrido algo como: "presupuesto para Juan Pérez, dirección Av. Corrientes 1234, teléfono 1155667788, 20 metros de porcelanato calacatta, 15 metros de piso laminado roble, 30 metros de zócalo, mano de obra instalación 50 metros"

Extraé la información en este formato JSON exacto (sin markdown, solo JSON):
{
  "cliente_nombre": "string o vacío",
  "cliente_direccion": "string o vacío", 
  "cliente_telefono": "string o vacío",
  "items": [
    {
      "nombre": "nombre del producto tal como se buscaría en una tienda online",
      "cantidad": número,
      "tipo": "material" o "mano_obra",
      "descuento": número (0 si no se menciona)
    }
  ]
}

Reglas:
- Si menciona "mano de obra", "instalación", "colocación", "trabajo" → tipo = "mano_obra"
- Todo lo demás (pisos, porcelanatos, zócalos, adhesivos, etc.) → tipo = "material"
- Si no dice cantidad, usá 1
- Si menciona descuento o porcentaje de descuento, ponelo en el campo descuento
- Los nombres de producto deben ser claros para buscar en tiendapisos.com
- Respondé SOLO con JSON válido, sin texto adicional ni markdown`
          },
          {
            role: 'user',
            content: transcript
          }
        ],
        temperature: 0.1,
      }),
    });

    const aiData = await aiRes.json();
    const aiText = aiData.choices?.[0]?.message?.content || '';
    
    let parsed: ParsedPresupuesto;
    try {
      // Clean potential markdown wrapping
      const cleanJson = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleanJson);
    } catch {
      console.error('Failed to parse AI response:', aiText);
      return new Response(JSON.stringify({ error: 'No se pudo interpretar el dictado. Intentá de nuevo con más claridad.' }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Parsed:', JSON.stringify(parsed));

    // Step 2: For each item, search tiendapisos.com for real prices
    const enrichedItems = await Promise.all(
      (parsed.items || []).map(async (item) => {
        if (item.tipo === 'mano_obra') {
          return {
            producto_nombre: item.nombre,
            producto_imagen: null,
            producto_descripcion: null,
            tipo: 'mano_obra' as const,
            precio_unitario: 0,
            cantidad: item.cantidad || 1,
            descuento: item.descuento || 0,
            fuente: 'manual',
          };
        }

        // Priority 1: Check local DB (uploaded CSV prices)
        const dbResult = await buscarEnBaseDeDatos(item.nombre);
        
        // Use the exact DB name for tienda page fetch (better match than generic dictated name)
        const searchName = dbResult?.nombre_exacto || item.nombre;
        const tiendaResult = await buscarEnTiendaPisos(searchName);

        if (dbResult && dbResult.precio > 0) {
          return {
            producto_nombre: dbResult.nombre_exacto,
            producto_imagen: tiendaResult?.imagen || null,
            producto_descripcion: tiendaResult?.descripcion || null,
            tipo: 'material' as const,
            precio_unitario: dbResult.precio,
            cantidad: item.cantidad || 1,
            descuento: item.descuento || 0,
            fuente: 'base_datos',
          };
        }

        // Fallback: manual entry (no separate tienda price lookup since we fetch the page directly now)
        return {
          producto_nombre: item.nombre,
          producto_imagen: tiendaResult?.imagen || null,
          producto_descripcion: tiendaResult?.descripcion || null,
          tipo: item.tipo as 'material' | 'mano_obra',
          precio_unitario: 0,
          cantidad: item.cantidad || 1,
          descuento: item.descuento || 0,
          fuente: 'manual',
        };
      })
    );

    return new Response(JSON.stringify({
      cliente_nombre: parsed.cliente_nombre || '',
      cliente_direccion: parsed.cliente_direccion || '',
      cliente_telefono: parsed.cliente_telefono || '',
      items: enrichedItems,
      transcript,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Error interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
