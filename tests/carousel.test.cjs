const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
const source = stripTypeScriptTypes(fs.readFileSync('src/lib/carousel.ts', 'utf8')).replaceAll('export function ', 'function ');
const api = vm.runInNewContext(`${source}; ({ carouselStops, nearestCarouselStop })`);
const stops = (offsets, max) => Array.from(api.carouselStops(offsets, max));

test('desktop end has one stop even when three final projects share the viewport', () => {
  const pages = stops([0, 560, 1120, 1680, 2240, 2800, 3360], 2240);
  assert.deepEqual(pages, [0, 560, 1120, 1680, 2240]);
  const last = api.nearestCarouselStop(pages, 2240);
  assert.equal(last, pages.length - 1);
  assert(pages[last - 1] < 2240, 'one previous click must move away from the end');
});
test('partial final viewport, fractional pixels and manual scroll resolve to real pages', () => {
  const pages = stops([0, 540.5, 1081, 1621.5, 2162], 1700.25);
  assert.deepEqual(pages, [0, 540.5, 1081, 1621.5, 1700.25]);
  assert.equal(api.nearestCarouselStop(pages, 1699.5), 4);
  assert.equal(api.nearestCarouselStop(pages, 1060), 2);
});
test('mobile keeps every reachable page and non-overflowing content has no extra steps', () => {
  assert.deepEqual(stops([0, 340, 680], 680), [0, 340, 680]);
  assert.deepEqual(stops([0, 560], 0), [0]);
  assert.deepEqual(stops([], 0), []);
});
