export const runtime = 'nodejs';

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Falta variable de entorno: ${name}`);
  return v;
}

export async function POST(req: Request) {
  try {
    const { messages, preset } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Formato inválido: falta messages[]' }),
        { status: 400 }
      );
    }

    const apiKey = env('OPENROUTER_API_KEY');
    const baseURL = 'https://openrouter.ai/api/v1';

    // 👇 Pon aquí tu preset por defecto (el que copias de OpenRouter tal cual: "@preset/nombre")
    const DEFAULT_PRESET = '@preset/bebe';

    // Si recibimos un preset dinámico desde el front, lo usamos; si no, usamos el default
    const modelId =
      typeof preset === 'string' && preset.startsWith('@preset/')
        ? preset
        : DEFAULT_PRESET;

    const res = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3000',
        'X-Title': 'Chat MVP',
      },
      body: JSON.stringify({
        model: modelId,
        messages,
        stream: false,
        max_tokens: 512,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return new Response(
        JSON.stringify({
          error: `OpenRouter error (${res.status}).`,
          hint: text || 'Revisa API key o preset.',
        }),
        { status: 502 }
      );
    }

    const data = await res.json();
    const content =
      data?.choices?.[0]?.message?.content ??
      data?.choices?.[0]?.text ??
      '';

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'Respuesta vacía del modelo.' }),
        { status: 502 }
      );
    }

    return new Response(content, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      status: 200,
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || String(err) }),
      { status: 500 }
    );
  }
}