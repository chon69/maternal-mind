const { requireAdmin, ok, fail, preflight } = require('../lib/auth');

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL    = 'openai/gpt-oss-120b';

const SYSTEM_PROMPT = `Eres la asistente de Chon, creadora de Maternal Mind, una plataforma de mindfulness y bienestar para mamás.
Ayudas a:
- Crear plantillas de email cálidas, auténticas y en tono cercano (en español, tuteo)
- Escribir descripciones de eventos, talleres, cursos y retiros maternales
- Generar textos para el Kit de Pausa (módulos de mindfulness)
- Crear secuencias de bienvenida, seguimiento o anuncio
- Redactar posts o mensajes para redes sociales sobre maternidad consciente

Estilo: cálido, poético pero claro, sin cursilería. Voz en primera persona cuando escribas como Chon.
Usa emojis con moderación (solo cuando aporten).
Cuando generes emails, incluye el HTML completo si te lo piden.`;

async function callGroq(messages, apiKey) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: MODEL, messages, max_tokens: 2048, temperature: 0.75 }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return fail('Method not allowed', 405);

  try { requireAdmin(event); }
  catch (e) { return fail(e.message, e.status || 403); }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return fail('Invalid JSON'); }

  const { messages } = body;
  if (!Array.isArray(messages) || !messages.length) return fail('messages[] requerido');

  const fullMessages = [{ role: 'system', content: SYSTEM_PROMPT }, ...messages];

  try {
    let reply;
    try {
      reply = await callGroq(fullMessages, process.env.GROQ_API_KEY);
    } catch (e) {
      console.warn('Primary Groq key failed, trying fallback:', e.message);
      reply = await callGroq(fullMessages, process.env.GROQ_API_KEY_FALLBACK);
    }
    return ok({ reply });
  } catch (err) {
    console.error('Both Groq keys failed:', err);
    return fail('El servicio de IA no está disponible temporalmente', 503);
  }
};
