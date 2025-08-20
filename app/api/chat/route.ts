// app/api/chat/route.ts
export const runtime = 'edge'; // solo una vez

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Falta variable de entorno: ${name}`);
  return v;
}

export async function POST(req: Request) {
  try {
    const { messages, system, model } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Formato inválido: falta messages[]' }), { status: 400 });
    }

    const apiKey = env('OPENROUTER_API_KEY');
    const baseURL = 'https://openrouter.ai/api/v1';
    const modelId = model || process.env.OPENROUTER_MODEL || 'openrouter/auto';

    // Llamada directa a OpenRouter (sin streaming para simplificar)
    const res = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3000',
        'X-Title': 'Viability Chat MVP',
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          ...(system ? [{ role: 'system', content: system }] : []),
          ...messages,
        ],
        stream: false,
        max_tokens: 512,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return new Response(JSON.stringify({
        error: `OpenRouter no responde OK (${res.status}).`,
        hint: text || 'Revisa API key, modelo o límites.',
      }), { status: 502 });
    }

    const data = await res.json();
    const content =
      data?.choices?.[0]?.message?.content ??
      data?.choices?.[0]?.text ??
      '';

    if (!content) {
      return new Response(JSON.stringify({ error: 'Respuesta vacía del modelo.' }), { status: 502 });
    }

    // Devolvemos texto plano; tu frontend ya va leyendo del body.
    return new Response(content, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      status: 200,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || String(err) }), { status: 500 });
  }
}