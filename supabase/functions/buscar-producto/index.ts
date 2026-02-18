const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    if (!query || query.trim().length < 2) {
      return new Response(JSON.stringify({ found: false, query }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const searchTerm = query.trim();
    console.log('Buscando producto:', searchTerm);

    // Search tiendapisos.com
    const searchUrl = `https://tiendapisos.com/?s=${encodeURIComponent(searchTerm)}&post_type=product`;
    
    let html = '';
    try {
      const res = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'es-AR,es;q=0.9',
        },
      });
      html = await res.text();
    } catch (fetchErr) {
      console.error('Error fetching tiendapisos.com:', fetchErr);
      return new Response(JSON.stringify({ found: false, query: searchTerm }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract product data from HTML using simple regex patterns
    // Look for WooCommerce product structures
    const products: Array<{ nombre: string; precio: number; imagen: string | null; link: string }> = [];

    // WooCommerce typically has product items with class "product"
    const productBlocks = html.match(/<li[^>]*class="[^"]*product[^"]*"[^>]*>[\s\S]*?<\/li>/gi) || [];

    for (const block of productBlocks.slice(0, 5)) {
      // Extract product name
      const nameMatch = block.match(/<h2[^>]*class="[^"]*woocommerce-loop-product__title[^"]*"[^>]*>(.*?)<\/h2>/i)
        || block.match(/<h2[^>]*>(.*?)<\/h2>/i);
      
      // Extract price
      const priceMatch = block.match(/<span class="woocommerce-Price-amount[^"]*"[^>]*>.*?(\d[\d.,]*)<\/span>/i)
        || block.match(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/);
      
      // Extract image
      const imgMatch = block.match(/<img[^>]*src="([^"]+)"[^>]*>/i);
      
      // Extract link
      const linkMatch = block.match(/<a[^>]*href="([^"]+)"[^>]*>/i);

      if (nameMatch) {
        const rawPrice = priceMatch?.[1]?.replace(/\./g, '').replace(',', '.') || '0';
        const precio = parseFloat(rawPrice);
        
        products.push({
          nombre: nameMatch[1].replace(/<[^>]*>/g, '').trim(),
          precio: isNaN(precio) ? 0 : precio,
          imagen: imgMatch?.[1] || null,
          link: linkMatch?.[1] || '',
        });
      }
    }

    if (products.length === 0) {
      // Try a broader approach - use AI to extract from the page
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (LOVABLE_API_KEY) {
        // Send a condensed version of the HTML to AI
        const textContent = html
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .substring(0, 8000);

        try {
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
                  content: 'Sos un extractor de productos de una tienda online argentina de pisos y revestimientos. Dado el texto de una página de búsqueda, extraé los productos encontrados. Respondé SOLO con JSON válido, sin markdown. Si no encontrás productos, respondé {"products":[]}. Formato: {"products":[{"nombre":"...","precio":1234.56,"imagen":null}]}'
                },
                {
                  role: 'user',
                  content: `Busqué "${searchTerm}" en tiendapisos.com. Extraé los productos del siguiente contenido:\n\n${textContent}`
                }
              ],
              temperature: 0.1,
            }),
          });

          const aiData = await aiRes.json();
          const aiText = aiData.choices?.[0]?.message?.content || '';
          
          try {
            const parsed = JSON.parse(aiText);
            if (parsed.products?.length > 0) {
              for (const p of parsed.products.slice(0, 5)) {
                products.push({
                  nombre: p.nombre,
                  precio: typeof p.precio === 'number' ? p.precio : parseFloat(p.precio) || 0,
                  imagen: p.imagen || null,
                  link: '',
                });
              }
            }
          } catch {
            console.log('AI response not parseable:', aiText);
          }
        } catch (aiErr) {
          console.error('AI extraction error:', aiErr);
        }
      }
    }

    if (products.length > 0) {
      return new Response(JSON.stringify({
        found: true,
        query: searchTerm,
        products,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ found: false, query: searchTerm }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ found: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
