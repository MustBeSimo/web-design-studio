import test from 'node:test';
import assert from 'node:assert/strict';
import { validateTriggerCases } from './trigger-schema.mjs';

const skills = ['cinematic-scroll', 'scroll-audit', 'launch-page-strategy'];
const valid = { skill: 'scroll-audit', query: 'why does my page feel stuck?', should_trigger: true };

test('accepts skill-specific labels, including the same query routed differently', () => {
  assert.deepEqual(validateTriggerCases([
    valid,
    { ...valid, skill: 'launch-page-strategy', should_trigger: false },
  ], skills), []);
});

test('rejects absent and unknown skill names instead of silently treating them as cinematic-scroll', () => {
  for (const skill of [undefined, '', 'unknown-skill', 42]) {
    assert.equal(validateTriggerCases([{ ...valid, skill }], skills).length, 1);
  }
});

test('rejects malformed cases and empty datasets', () => {
  for (const cases of [undefined, {}, [], [null], [{ ...valid, query: ' ' }], [{ ...valid, query: 7 }], [{ ...valid, should_trigger: 'false' }]]) {
    assert.ok(validateTriggerCases(cases, skills).length > 0);
  }
});
