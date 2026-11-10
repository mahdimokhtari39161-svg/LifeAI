'use strict';
const http = require('node:http');
const PORT = Number(process.env.PORT || 8787);
const API_KEY = process.env.OPENAI_API_KEY || '';
const MODEL = process.env.OPENAI_MODEL || 'gpt-6-luna';
const ALLOWED_ORIGINS = (process.env.APP_ORIGIN || '').split(',').map(x => x.trim()).filter(Boolean);
const buckets = new Map();
const modes = {
  general: 'You are LifeAI, a helpful, accurate everyday assistant. Respond in the language used by the user.',
  translate: 'You are a professional translator. Preserve meaning, tone, names and formatting. Ask only if the target language is unclear.',
  write: 'You are a professional writing assistant. Produce clear, polished, ready-to-use text in the requested language and tone.',
  learn: 'You are a patient tutor. Explain step by step, use examples, and distinguish facts from uncertainty.',
  plan: 'You are a practical planning assistant. Give an actionable, realistic plan with clear priorities.'
};
function send(res, status, body, origin) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Vary': 'Origin' };
  if (origin && ALLOWED_ORIGINS.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  res.writeHead(status, headers); res.end(JSON.stringify(body));
}
function readBody(req, limit = 24000) {
  return new Promise((resolve, reject) => {
    let raw = '', size = 0;
    req.on('data', chunk => { size += chunk.length; if (size > limit) { reject(new Error('Request too large')); req.destroy(); } else raw += chunk; });
    req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}
function rateAllowed(req) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  const now = Date.now(), old = buckets.get(ip) || { start: now, count: 0 };
  if (now - old.start > 60000) { old.start = now; old.count = 0; }
  old.count++; buckets.set(ip, old);
  return old.count <= 20;
}
const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || '';
  if (req.method === 'OPTIONS') {
    if (ALLOWED_ORIGINS.includes(origin)) {
      res.writeHead(204, { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600', Vary: 'Origin' });
      return res.end();
    }
    return send(res, 403, { error: 'Origin not allowed' });
  }
  if (req.url === '/health' && req.method === 'GET') return send(res, 200, { ok: true, service: 'LifeAI API', model: MODEL, configured: Boolean(API_KEY) });
  if (req.url !== '/api/ai' || req.method !== 'POST') return send(res, 404, { error: 'Not found' }, origin);
  if (!ALLOWED_ORIGINS.includes(origin)) return send(res, 403, { error: 'Origin not allowed. Set APP_ORIGIN to your exact website origin.' });
  if (!rateAllowed(req)) return send(res, 429, { error: 'Rate limit reached. Try again shortly.' }, origin);
  if (!API_KEY) return send(res, 503, { error: 'AI service is not configured. Add OPENAI_API_KEY on the server.' }, origin);
  try {
    const body = await readBody(req);
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const mode = typeof body.mode === 'string' && modes[body.mode] ? body.mode : 'general';
    if (!prompt || prompt.length > 12000) return send(res, 400, { error: 'Prompt must contain 1 to 12000 characters.' }, origin);
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, instructions: modes[mode], input: prompt, max_output_tokens: 1800 })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return send(res, response.status >= 500 ? 502 : response.status, { error: result.error?.message || 'AI provider request failed.' }, origin);
    let output = result.output_text || '';
    if (!output && Array.isArray(result.output)) output = result.output.flatMap(item => item.content || []).filter(c => c.type === 'output_text').map(c => c.text).join('\n');
    return send(res, 200, { output }, origin);
  } catch (error) {
    return send(res, 400, { error: error.message || 'Request failed.' }, origin);
  }
});
server.listen(PORT, () => console.log(`LifeAI API listening on ${PORT}`));
