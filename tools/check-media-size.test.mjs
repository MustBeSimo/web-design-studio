import test from 'node:test';
import assert from 'node:assert/strict';
import { oversized, ALLOW } from './check-media-size.mjs';

test('the allowlist names only media the live site plays', () => {
  assert.deepEqual(ALLOW, ['examples/kern-calibration/assets/kern-color.mp4', 'assets/brand/renaissance-h3-15s.mp4']);
});

test('returns files over the limit, largest first, excluding the allowlist', () => {
  const entries = [
    { path: 'a.mp4', size: 6_000_000 },
    { path: 'b.jpg', size: 400_000 },
    { path: 'examples/kern-calibration/assets/kern-color.mp4', size: 11_000_000 },
    { path: 'c.mov', size: 9_000_000 },
  ];
  const result = oversized(entries, { limit: 5_000_000, allow: ['examples/kern-calibration/assets/kern-color.mp4'] });
  assert.deepEqual(result.map((e) => e.path), ['c.mov', 'a.mp4']);
});

test('a file exactly at the limit passes', () => {
  assert.deepEqual(oversized([{ path: 'x', size: 5_000_000 }], { limit: 5_000_000 }), []);
});
