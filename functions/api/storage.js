// Cloudflare Pages Function: GET/POST /api/storage
// Потребує прив'язаного KV namespace під назвою LIBRARY_KV
// (Dashboard → Pages project → Settings → Functions → KV namespace bindings)

const ALLOWED_KEYS = new Set([
  'library:books',
  'library:reviews',
  'library:config',
  'library:borrowers'
]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  if (!key || !ALLOWED_KEYS.has(key)) {
    return json({ error: 'Невідомий або відсутній ключ' }, 400);
  }
  if (!env.LIBRARY_KV) {
    return json({ error: 'KV namespace LIBRARY_KV не прив\'язано до цього Pages-проєкту' }, 500);
  }
  const value = await env.LIBRARY_KV.get(key);
  return json({ key, value });
}

export async function onRequestPost({ request, env }) {
  if (!env.LIBRARY_KV) {
    return json({ error: 'KV namespace LIBRARY_KV не прив\'язано до цього Pages-проєкту' }, 500);
  }
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: 'Некоректний JSON у тілі запиту' }, 400);
  }
  const { key, value } = body || {};
  if (!key || !ALLOWED_KEYS.has(key)) {
    return json({ error: 'Невідомий або відсутній ключ' }, 400);
  }
  if (typeof value !== 'string') {
    return json({ error: 'value має бути рядком (JSON.stringify перед відправкою)' }, 400);
  }
  // невеликий запобіжник від надто великих значень
  if (value.length > 4_500_000) {
    return json({ error: 'Значення завелике (>4.5MB)' }, 413);
  }
  await env.LIBRARY_KV.put(key, value);
  return json({ key, ok: true });
}
