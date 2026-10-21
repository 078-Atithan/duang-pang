import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createAppServer } from '../../server/app.js';
import { payload, responseFixture, providerResponse, geminiResponse } from '../helpers.js';

test('HTTP server serves assets, protects private files, enforces origin and consent', async (context) => {
  let providerCalls = 0;
  const server = createAppServer({ apiKey: 'private-test-key', model: 'test', fetchImpl: async () => {
    providerCalls += 1;
    return providerResponse(geminiResponse(JSON.stringify(responseFixture())));
  } });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  context.after(() => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = (url) => fetch(`${base}${url}`);
  const post = (body, origin = base) => fetch(`${base}/api/reading`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(body) });
  assert.equal((await get('/')).status, 200);
  assert.match((await get('/js/main.js')).headers.get('content-type'), /javascript/);
  assert.deepEqual(await (await get('/api/config')).json(), { mode: 'ai' });
  for (const url of ['/.env', '/server/server.js', '/tests/unit/server.test.js', '/server/ai/prompt.js', '/package.json', '/assets/%2e%2e%2fserver/server.js']) assert.equal((await get(url)).status, 404);
  assert.equal((await post({ ...payload(), consent: false })).status, 400);
  assert.equal((await post(payload(), 'https://unrelated.example')).status, 403);
  assert.equal(providerCalls, 0);
  assert.equal((await post(payload())).status, 200);
  assert.equal(providerCalls, 1);
  for (let index = 0; index < 4; index += 1) await post(payload());
  const limited = await post(payload());
  assert.equal(limited.status, 429);
  assert.equal((await limited.json()).code, 'rate_limit');
  assert.equal((await get('/api/reading')).status, 405);
});

test('hosted mode: host and origin allowlists, CORS, per-visitor and daily limits', async (context) => {
  let providerCalls = 0;
  const pages = 'https://078-atithan.github.io';
  const server = createAppServer({
    apiKey: 'private-test-key', model: 'test', allowedOrigins: [pages], allowedHosts: ['reading.example.com'],
    readingsPerMinute: 2, dailyLimit: 3, trustProxy: true,
    fetchImpl: async () => { providerCalls += 1; return providerResponse(geminiResponse(JSON.stringify(responseFixture()))); },
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  context.after(() => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); }));
  const port = server.address().port;
  // fetch() forbids overriding Host, so use node:http for hosted-style requests.
  const call = (method, pathname, headers = {}, body) => new Promise((resolve, reject) => {
    const request = http.request({ host: '127.0.0.1', port, method, path: pathname, headers: { Host: 'reading.example.com', ...headers } }, (response) => {
      let text = ''; response.on('data', (chunk) => { text += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: text ? JSON.parse(text) : null }));
    });
    request.on('error', reject); request.end(body);
  });
  const read = (visitor, origin = pages) => call('POST', '/api/reading', { Origin: origin, 'Content-Type': 'application/json', 'X-Forwarded-For': visitor }, JSON.stringify(payload()));

  assert.equal((await call('GET', '/api/config', { Host: 'evil.example' })).status, 403, 'Unknown hosts are rejected');
  const config = await call('GET', '/api/config', { Origin: pages });
  assert.equal(config.headers['access-control-allow-origin'], pages);
  assert.deepEqual(config.body, { mode: 'ai' });
  const preflight = await call('OPTIONS', '/api/reading', { Origin: pages, 'Access-Control-Request-Method': 'POST' });
  assert.equal(preflight.status, 204);
  assert.match(preflight.headers['access-control-allow-methods'], /POST/);
  assert.equal((await call('OPTIONS', '/api/reading', { Origin: 'https://unrelated.example' })).status, 403);
  const blocked = await read('1.1.1.1', 'https://unrelated.example');
  assert.equal(blocked.status, 403);
  assert.equal(blocked.headers['access-control-allow-origin'], undefined);

  assert.equal((await read('1.1.1.1')).status, 200);
  assert.equal((await read('1.1.1.1')).status, 200);
  const limited = await read('1.1.1.1');
  assert.equal(limited.status, 429);
  assert.equal(limited.body.code, 'rate_limit');
  assert.equal(limited.headers['access-control-allow-origin'], pages, 'Errors stay readable by the allowed site');
  assert.equal((await read('2.2.2.2')).status, 200, 'Another visitor has their own allowance');
  const capped = await read('3.3.3.3');
  assert.equal(capped.status, 503);
  assert.equal(capped.body.code, 'daily_limit');
  assert.equal(providerCalls, 3);
});
