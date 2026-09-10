const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { stripTypeScriptTypes } = require('node:module');

function load(file, dependencies = {}) {
  let output = stripTypeScriptTypes(fs.readFileSync(file, 'utf8'));
  const names = [...output.matchAll(/export (?:async )?(?:function|const) (\w+)/g)].map(match => match[1]);
  output = output.replace(/import (\{[^}]+\}) from ([^;]+);/g, 'const $1 = require($2);').replace(/export /g, '');
  output += '\nObject.assign(module.exports, {' + names.join(',') + '});';
  const module = { exports: {} };
  new Function('require', 'module', 'exports', 'process', 'fetch', output)(
    name => dependencies[name] ?? require(name), module, module.exports,
    dependencies.process ?? process, dependencies.fetch ?? fetch,
  );
  return module.exports;
}
const lib = load('src/lib/prospecting.ts');
const query = { segment: 'Padarias', location: 'Santos', country: 'BR', minRating: 0, phoneOnly: false };
const token = 'test-only-access-token-with-32-characters';
const place = { id: 'fixture-1', displayName: { text: 'Negócio fictício de teste' }, businessStatus: 'OPERATIONAL', rating: 4.2, userRatingCount: 15 };
const request = (data = query, password = token) => new Request('http://localhost/api/prospects', { method: 'POST', headers: { authorization: `Bearer ${password}`, 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
const route = (mockFetch, env = { GOOGLE_PLACES_API_KEY: 'test-key-not-real', PROSPECTING_ACCESS_TOKEN: token }) => load('src/app/api/prospects/route.ts', { '@/lib/prospecting': lib, process: { env }, fetch: mockFetch });

test('filters websites, closed businesses, duplicate IDs and missing identities', () => {
  const matches = lib.selectProspects([place, place, { ...place, id: 'has-site', websiteUri: 'https://example.com' }, { ...place, id: 'closed', businessStatus: 'CLOSED_PERMANENTLY' }, { ...place, id: '' }], query);
  assert.deepEqual(matches.map(item => item.id), ['fixture-1']);
  assert.equal(matches[0].phone, '');
  assert.match(matches[0].mapsUrl, /^https:\/\/www.google.com\/maps/);
});
test('rating and phone filters handle unavailable data', () => {
  assert.equal(lib.selectProspects([place], { ...query, phoneOnly: true }).length, 0);
  assert.equal(lib.selectProspects([{ ...place, rating: undefined }], { ...query, minRating: 4 }).length, 0);
  assert.equal(lib.selectProspects([{ ...place, internationalPhoneNumber: '+551300000000' }], { ...query, minRating: 4, phoneOnly: true }).length, 1);
});
test('validates query and rejects unsafe external links', () => {
  assert.ok(lib.parseProspectQuery(query));
  for (const input of [null, {}, { ...query, country: '__proto__' }, { ...query, segment: ' ' }, { ...query, minRating: '4' }, { ...query, pageToken: 'x'.repeat(4001) }]) assert.equal(lib.parseProspectQuery(input), null);
  assert.equal(lib.safeWebUrl('javascript:alert(1)'), '');
});
test('unconfigured and unauthorized requests never call Google', async () => {
  let called = 0;
  const mock = async () => { called++; throw new Error('Unexpected upstream call'); };
  assert.equal((await route(mock, {}).POST(request())).status, 503);
  assert.equal((await route(mock).POST(request(query, 'incorrect'))).status, 401);
  assert.equal(called, 0);
});
test('rejects malformed input and cross-origin requests before upstream', async () => {
  const api = route(async () => { throw new Error('Unexpected upstream call'); });
  assert.equal((await api.POST(request({ ...query, segment: '' }))).status, 400);
  const crossOrigin = request(); crossOrigin.headers.set('origin', 'https://example.com');
  assert.equal((await api.POST(crossOrigin)).status, 403);
});
test('forwards pagination, keeps secret server-side and returns filtered counts', async () => {
  let body;
  const api = route(async (url, init) => {
    assert.equal(url, 'https://places.googleapis.com/v1/places:searchText');
    assert.equal(init.headers['X-Goog-Api-Key'], 'test-key-not-real');
    assert.ok(init.headers['X-Goog-FieldMask'].includes('places.websiteUri'));
    body = JSON.parse(init.body);
    return Response.json({ places: [place, { ...place, id: 'website', websiteUri: 'https://example.com' }], nextPageToken: 'page-3' });
  });
  const response = await api.POST(request({ ...query, pageToken: 'page-2' }));
  const payload = await response.json();
  assert.equal(body.pageToken, 'page-2'); assert.equal(body.pageSize, 20);
  assert.equal(payload.scanned, 2); assert.equal(payload.prospects.length, 1);
  assert.equal(payload.nextPageToken, 'page-3');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.ok(!JSON.stringify(payload).includes('test-key-not-real'));
});
test('upstream quota failures and timeouts remain errors, not empty searches', async () => {
  const quota = await route(async () => new Response('', { status: 429 })).POST(request());
  assert.equal(quota.status, 429); assert.match((await quota.json()).error, /cota/);
  const timeout = await route(async () => { throw new Error('upstream failure'); }).POST(request());
  assert.equal(timeout.status, 504);
});
test('limits bursts before more paid requests are sent', async () => {
  let called = 0;
  const api = route(async () => { called++; return Response.json({ places: [] }); });
  for (let i = 0; i < 10; i++) assert.equal((await api.POST(request())).status, 200);
  assert.equal((await api.POST(request())).status, 429);
  assert.equal(called, 10);
});
