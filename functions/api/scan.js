const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SCAN_PROMPT = `You are analyzing a photo of Pokémon trading cards laid out for sale/inventory. Identify every visible card and read any sticker price on each card.

Return ONLY a JSON array. Each element:
{
  "name": "Card name (e.g. Charizard ex)",
  "set": "Set name or code if visible (e.g. SV1, Obsidian Flames)",
  "number": "Set number if visible (e.g. 025/198)",
  "price": null or number (the sticker price in dollars, null if no sticker visible),
  "condition": "NM" or whatever is marked, default "NM",
  "notes": "any other visible info (holo, reverse holo, full art, graded, etc)"
}

Rules:
- Identify ALL cards visible in the image
- Read sticker prices carefully — they may be handwritten or printed labels
- If a price sticker says "$12" or "12.00", return price as 12
- If no price sticker is visible on a card, set price to null
- Include set numbers, rarity symbols, and any distinguishing info you can read
- Return raw JSON only, no markdown fences, no explanation`;

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestPost(context) {
  try {
    const authHeader = context.request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ') || !authHeader.slice(7).trim()) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const { image, media_type } = await context.request.json();
    if (!image || !media_type) {
      return new Response(JSON.stringify({ error: 'Missing image or media_type' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Strip data URI prefix if present
    const base64Data = image.replace(/^data:[^;]+;base64,/, '');

    const geminiKey = context.env.GEMINI_API_KEY;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inlineData: {
                  mimeType: media_type,
                  data: base64Data,
                }
              },
              {
                text: SCAN_PROMPT,
              }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4000,
          }
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse JSON from response (handle possible markdown fences)
    let cards = [];
    try {
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      cards = JSON.parse(cleaned);
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Failed to parse Gemini response', raw: text }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ cards }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error', details: err.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
}
