/** Validate per-skill trigger labels; this does not evaluate routing accuracy. */
export function validateTriggerCases(cases, skills) {
  if (!Array.isArray(cases) || !cases.length) return ['cases must be a non-empty array'];
  const known = new Set(skills);
  return cases.flatMap((entry, index) => {
    if (!entry || !known.has(entry.skill) || typeof entry.query !== 'string' ||
        !entry.query.trim() || typeof entry.should_trigger !== 'boolean') {
      return [`case ${index + 1} requires a known skill, non-empty query and boolean should_trigger`];
    }
    return [];
  });
}
