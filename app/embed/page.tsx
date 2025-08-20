'use client';
import { useMemo, useRef, useState } from 'react';

type Msg = { role: 'user'|'assistant'; content: string; image?: string };

const PERSONAS: Record<string, string> = {
  sofia: 'Eres Sofía: +18, coqueta y elegante. Todo consensuado. Prohibido menores o ilegal.',
  valentina: 'Eres Valentina: +18, cálida y directa. Todo consensuado. Prohibido menores o ilegal.',
};

export default function Embed() {
  const [prompt, setPrompt] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [genImage, setGenImage] = useState(false);

  const persona = useMemo(() => {
    const sp = new URLSearchParams(window.location.search);
    return sp.get('persona') || 'sofia';
  }, []);

  const systemPrompt = PERSONAS[persona] || PERSONAS.sofia;

  async function send() {
    if (!prompt.trim()) return;
    const next = [...msgs, { role: 'user' as const, content: prompt }];
    setMsgs(next);
    setPrompt('');

    if (genImage) {
      setLoading(true);
      const res = await fetch('/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) {
        setMsgs(prev => [...prev, { role: 'assistant', content: data?.error || 'No se pudo generar la imagen.' }]);
        return;
      }
      setMsgs(prev => [...prev, { role: 'assistant', content: 'Imagen generada', image: data.image }]);
      return;
    }

    setLoading(true);
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system: systemPrompt,
        messages: next,
      }),
    });

    if (!res.ok || !res.body) {
      setLoading(false);
      setMsgs(prev => [...prev, { role: 'assistant', content: 'Error al conectar con el modelo.' }]);
      return;
    }

    const reader = res.body.getReader();
    let acc = '';
    setMsgs(prev => [...prev, { role: 'assistant', content: '' }]);

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      acc += new TextDecoder().decode(value);
      setMsgs(prev => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: 'assistant', content: acc };
        return copy;
      });
    }
    setLoading(false);
  }

  return (
    <main style={{
      fontFamily: 'system-ui, sans-serif',
      background: '#0b0b0b',
      color: 'white',
      minHeight: '100svh',
      display: 'grid',
      placeItems: 'center',
      padding: 16,
    }}>
      <div style={{ width: 'min(100%, 720px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Chat — {persona}</h1>
          <label style={{ marginLeft: 'auto', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={genImage} onChange={e => setGenImage(e.target.checked)} />
            Generar imagen
          </label>
        </div>

        <div style={{ border: '1px solid #ffffff22', borderRadius: 16, padding: 12 }}>
          <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ textAlign: m.role === 'user' ? 'right' : 'left' }}>
                <div style={{
                  display: 'inline-block',
                  padding: '8px 12px',
                  borderRadius: 14,
                  background: m.role === 'user' ? '#fff' : '#ffffff14',
                  color: m.role === 'user' ? '#000' : '#fff',
                  maxWidth: '100%',
                  wordBreak: 'break-word',
                }}>
                  {m.image ? <img src={m.image} alt="imagen" style={{ borderRadius: 12, maxWidth: '100%' }} /> : m.content}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); send(); }} style={{ display: 'flex', gap: 8 }}>
            <input
              placeholder={genImage ? 'Describe la imagen…' : 'Escribe aquí…'}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              disabled={loading}
              style={{ flex: 1, padding: '10px 12px', borderRadius: 12, border: 0, color: '#000' }}
            />
            <button
              disabled={loading}
              style={{ padding: '10px 16px', borderRadius: 12, border: 0, background: '#fff', color: '#000', fontWeight: 600 }}
            >
              {loading ? 'Generando…' : genImage ? 'Imaginar' : 'Enviar'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}