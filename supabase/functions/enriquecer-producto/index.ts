const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

function extraerM2PorCaja(html: string, characteristics: string[], introDesc: string | null): number | null {
  // Busca patrones tipo "Caja x 2.20 m²", "2,20 m2 por caja", "M2 por caja: 2.20", etc.
  const fuentes = [html, characteristics.join(' \n '), introDesc || ''].join(' \n ');
  const patrones = [
    /(\d+[.,]\d+|\d+)\s*m[2²]\s*(?:por|\/|x)\s*caja/i,
    /caja\s*(?:de|x|con)?\s*(\d+[.,]\d+|\d+)\s*m[2²]/i,
    /m[2²]\s*(?:por|\/)\s*caja\s*[:=]?\s*(\d+[.,]\d+|\d+)/i,
    /contenido\s*(?:de\s*)?caja\s*[:=]?\s*(\d+[.,]\d+|\d+)\s*m[2²]/i,
  ];
  for (const re of patrones) {
    const m = fuentes.match(re);
    if (m && m[1]) {
      const val = parseFloat(m[1].replace(',', '.'));
      if (!isNaN(val) && val > 0 && val < 20) return val;
    }
  }
  return null;
}

async function buscarEnTiendaPisos(productName: string): Promise<{ imagen: string | null; descripcion: string | null; m2_por_caja: number | null } | null> {
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

    // Extract product characteristics
    const characteristics: string[] = [];

    const tableRows = [...html.matchAll(/<tr[^>]*>\s*<t[hd][^>]*>([\s\S]*?)<\/t[hd]>\s*<t[hd][^>]*>([\s\S]*?)<\/t[hd]>\s*<\/tr>/gi)];
    for (const row of tableRows) {
      const label = row[1].replace(/<[^>]*>/g, '').trim();
      const value = row[2].replace(/<[^>]*>/g, '').trim();
      if (label && value && label.length < 60 && value.length < 200) {
        characteristics.push(`${label}: ${value}`);
      }
    }

    const liMatches = [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];
    for (const li of liMatches) {
      const text = li[1].replace(/<[^>]*>/g, '').trim();
      if (text.length > 5 && text.length < 200 && !text.includes('$') && !text.includes('Agregar') && !text.includes('carrito')) {
        if (text.includes(':') || /(?:mm|cm|m2|kg|espesor|ancho|largo|capa|clase|resist|garant|click|formato|dimens)/i.test(text)) {
          if (!characteristics.some(c => c === text)) {
            characteristics.push(text);
          }
        }
      }
    }

    let introDesc: string | null = null;
    const h2Matches = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)];
    for (const m of h2Matches) {
      const text = m[1].replace(/<[^>]*>/g, '').trim();
      if (text.length > 20 && !text.includes('$') && text !== productName) {
        introDesc = text.substring(0, 300);
        break;
      }
    }

    if (!introDesc) {
      const descMatch = html.match(/Piso\s+(?:vin[ií]lico|flotante|SPC|laminado)[^<]{10,300}/i);
      if (descMatch) introDesc = descMatch[0].trim();
    }

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

    let descripcion: string | null = null;
    const parts: string[] = [];
    if (introDesc) parts.push(introDesc);
    if (characteristics.length > 0) {
      parts.push('\nCaracterísticas:\n• ' + characteristics.slice(0, 15).join('\n• '));
    }
    if (parts.length > 0) {
      descripcion = parts.join('\n').substring(0, 1000);
    }

    console.log(`Description: ${descripcion ? descripcion.length + ' chars, ' + characteristics.length + ' specs' : 'none'}`);

    const imgUrl = imgMatch?.[1] || null;
    let imagen: string | null = null;
    if (imgUrl) {
      console.log(`Downloading image: ${imgUrl}`);
      imagen = await imageUrlToBase64(imgUrl);
      console.log(`Image converted: ${imagen ? 'yes' : 'no'}`);
    }

    const m2_por_caja = extraerM2PorCaja(html, characteristics, introDesc);
    console.log(`m² por caja: ${m2_por_caja ?? 'no detectado'}`);

    return { imagen, descripcion, m2_por_caja };
  } catch (e) {
    console.error('Error fetching product page:', e);
  }
  return null;
}

// Fallback null result helper
const NULL_RESULT = { imagen: null, descripcion: null, m2_por_caja: null };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { nombre } = await req.json();
    if (!nombre || nombre.trim().length < 3) {
      return new Response(JSON.stringify(NULL_RESULT), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Enriching product:', nombre);
    const result = await buscarEnTiendaPisos(nombre);

    return new Response(JSON.stringify({
      imagen: result?.imagen || null,
      descripcion: result?.descripcion || null,
      m2_por_caja: result?.m2_por_caja ?? null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ imagen: null, descripcion: null }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
