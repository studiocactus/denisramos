const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
function loader(fetch) {
  const exports = {};
  const code = stripTypeScriptTypes(fs.readFileSync('src/lib/load-content.ts', 'utf8')).replace('export async function loadContent', 'exports.loadContent = async function loadContent');
  vm.runInNewContext(code, { exports, fetch, AbortSignal, setTimeout, clearTimeout });
  return exports.loadContent;
}
test('public content recovers from transient HTTP and network failures', async () => {
  let calls = 0;
  const load = loader(async () => { calls++; if (calls === 1) return new Response('', {status:503}); if (calls === 2) throw new TypeError('offline'); return new Response('{}'); });
  assert.equal((await load(false, new AbortController().signal)).status, 200);
  assert.equal(calls, 3);
});
test('public retries are bounded', async () => {
  let calls = 0;
  const load = loader(async () => { calls++; return new Response('', {status:502}); });
  assert.equal((await load(false, new AbortController().signal)).status, 502);
  assert.equal(calls, 3);
});
test('authorization failures are not retried and admin uses its own scope', async () => {
  const urls = [];
  const load = loader(async url => { urls.push(url); return new Response('', {status:401}); });
  await load(true, new AbortController().signal);
  assert.deepEqual(urls, ['/api/content?admin=1']);
});
test('navigation cancellation stops retries', async () => {
  const controller = new AbortController();
  let calls = 0;
  const load = loader(async () => { calls++; controller.abort(); throw new Error('cancelled'); });
  await assert.rejects(load(false, controller.signal));
  assert.equal(calls, 1);
});
