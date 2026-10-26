# Remediation plan template

Write the template below to remediation-plan.md. It retains the report fields and
check thresholds from this repository's audit-mode.md, with the current product
name and sentence case headings. These are audit fields, not design defaults.

Replace placeholders only with supported findings. Use "not assessed" where a
number or pass/fail result is unavailable. In the executive summary, name the
route, browser, device or emulation, motion preference, scope and missing checks.
Explain the observation and deduction ledger behind each score. Include all
seventeen taste checks from [scoring](scoring.md), extending the summary table as
needed. Label effort estimates and projected scores as estimates. A projected
score is not a measured repair result. If the audit is incomplete, replace the
overall score and grade placeholders with "not assessed" and give the reason.

```markdown
# Web Design Studio scroll audit report

## [Site URL] -- [Date]

### Executive summary
[Brief description of the site and overall impression]

### Overall score: [X]/100

**Grade: [A/B/C/D/F]**

### Dimension scores
| Dimension   | Score | Grade | Status   | Weight | Weighted |
|-------------|-------|-------|----------|--------|----------|
| Pacing      | XX    | A/B/C/D/F | Pass/Warning/Critical | 25% | XX |
| Performance | XX    | A/B/C/D/F | Pass/Warning/Critical | 25% | XX |
| Accessibility| XX   | A/B/C/D/F | Pass/Warning/Critical | 25% | XX |
| Emotional Arc| XX   | A/B/C/D/F | Pass/Warning/Critical | 25% | XX |

### Detection summary
- Scroll library: [GSAP/Lenis/Locomotive/Custom/none]
- Pin count: [N] (total duration: [X]vh)
- Parallax layers: [N] (max per chapter: [N])
- 3D transforms: [N] elements
- Compositor layers (desktop): [N]
- Compositor layers (mobile): [N]
- Scroll jank (10s test): [X]%
- Event listeners: [N] scroll listeners, [N] passive

### Taste guardrail check
| Rule | Status | Notes |
|------|--------|-------|
| No blur animation | [PASS/FAIL] | |
| No scroll-jacking <800px | [PASS/FAIL] | |
| Pin breathing room >=80vh | [PASS/FAIL] | |
| Max 7 layers per chapter | [PASS/FAIL] | |
| 3D disabled on touch | [PASS/FAIL] | |
| No auto-play | [PASS/FAIL] | |
| Reduced motion support | [PASS/FAIL] | |
| Varied title treatments | [PASS/FAIL] | |
| Varied transitions | [PASS/FAIL] | |
| Varied depth ratios | [PASS/FAIL] | |

### Critical issues (fix first)
1. **[Issue Title]** -- Impact: [Dimension -X points] -- Fix: [Specific, actionable fix with estimated effort]
   - Evidence: [Detection evidence]
   - Code hint: [File or pattern to change]

### Warnings (fix soon)
1. **[Issue Title]** -- Impact: [Dimension -X points] -- Fix: [Specific fix]
   - Evidence: [Detection evidence]

### Recommendations (nice to have)
1. **[Suggestion]** -- Expected improvement: [Dimension +X points]
   - Rationale: [Why this helps]

### Estimated fix effort
- Critical: X hours
- Warnings: X hours
- Recommendations: X hours
- **Total: X hours**

### Before/after score projection
| Dimension   | Current | After Critical Fixes | After All Fixes |
|-------------|---------|---------------------|-----------------|
| Pacing      | XX      | XX (+X)             | XX (+X)         |
| Performance | XX      | XX (+X)             | XX (+X)         |
| Accessibility| XX     | XX (+X)             | XX (+X)         |
| Emotional Arc| XX     | XX (+X)             | XX (+X)         |
| **Overall** | **XX**  | **XX (+X)**         | **XX (+X)**     |
```
