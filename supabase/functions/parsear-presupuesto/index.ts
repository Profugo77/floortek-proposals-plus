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

async function buscarPrecioTiendaPisos(productName: string): Promise<{ precio: number; imagen: string | null; nombre_exacto: string } | null> {
  try {
    const searchUrl = `https://tiendapisos.com/?s=${encodeURIComponent(productName)}&post_type=product`;
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'es-AR,es;q=0.9',
      },
    });
    const html = await res.text();

    const productBlocks = html.match(/<li[^>]*class="[^"]*product[^"]*"[^>]*>[\s\S]*?<\/li>/gi) || [];
    
    for (const block of productBlocks.slice(0, 1)) {
      const nameMatch = block.match(/<h2[^>]*>(.*?)<\/h2>/i);
      const priceMatch = block.match(/<bdi[^>]*>\s*<span[^>]*>\$<\/span>\s*([\d.,]+)\s*<\/bdi>/i)
        || block.match(/<span class="woocommerce-Price-amount[^"]*"[^>]*>.*?([\d.,]+)<\/span>/i);
      const imgMatch = block.match(/<img[^>]*src="([^"]+)"[^>]*>/i);

      if (nameMatch) {
        const rawPrice = priceMatch?.[1]?.replace(/\./g, '').replace(',', '.') || '0';
        return {
          nombre_exacto: nameMatch[1].replace(/<[^>]*>/g, '').trim(),
          precio: parseFloat(rawPrice) || 0,
          imagen: imgMatch?.[1] || null,
        };
      }
    }
  } catch (e) {
    console.error('Error scraping:', e);
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
          // Don't search for labor items
          return {
            producto_nombre: item.nombre,
            producto_imagen: null,
            tipo: 'mano_obra' as const,
            precio_unitario: 0,
            cantidad: item.cantidad || 1,
            descuento: item.descuento || 0,
            fuente: 'manual',
          };
        }

        // Priority 1: Check local DB (uploaded CSV prices)
        const dbResult = await buscarEnBaseDeDatos(item.nombre);
        if (dbResult && dbResult.precio > 0) {
          return {
            producto_nombre: dbResult.nombre_exacto,
            producto_imagen: null,
            tipo: 'material' as const,
            precio_unitario: dbResult.precio,
            cantidad: item.cantidad || 1,
            descuento: item.descuento || 0,
            fuente: 'base_datos',
          };
        }

        // Priority 2: Scrape tiendapisos.com
        const found = await buscarPrecioTiendaPisos(item.nombre);
        if (found && found.precio > 0) {
          return {
            producto_nombre: found.nombre_exacto,
            producto_imagen: found.imagen,
            tipo: 'material' as const,
            precio_unitario: found.precio,
            cantidad: item.cantidad || 1,
            descuento: item.descuento || 0,
            fuente: 'tiendapisos',
          };
        }

        // Fallback: manual entry
        return {
          producto_nombre: item.nombre,
          producto_imagen: null,
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
