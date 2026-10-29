import {timingSafeEqual} from 'node:crypto';

export function activityHandler(token, origin, snapshot) {
  return async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    const reply = (status, body) => { res.writeHead(status); res.end(JSON.stringify(body)); };
    const provided = Buffer.from(String(req.headers.authorization ?? '').replace(/^Bearer /, ''));
    const expected = Buffer.from(token);
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return reply(401, {});
    if (req.method !== 'POST' || !/^application\/json(?:;|$)/i.test(req.headers['content-type'] ?? '')) return reply(405, {});
    if (req.headers.origin && req.headers.origin !== origin()) return reply(403, {});
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 1024) return reply(413, {});
    }
    reply(200, {result: snapshot()});
  };
}
