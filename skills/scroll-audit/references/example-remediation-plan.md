# Web Design Studio scroll audit report

## https://example.invalid/fieldnote-atlas -- 27 October 2026

**Fictional worked example.** The page, selectors and observations below are
invented to demonstrate the report. No live page was fetched or measured.

### Executive summary
A fictional travel journal has three chapters and one pinned map orbit. Illustrative
scope: authorised homepage, desktop Chromium emulation, normal and reduced motion,
forward/reverse scrolling and keyboard traversal. Mobile, assistive technology,
listener inspection and performance traces are not assessed. The motion explains
the journey, but the orbit persists under reduced motion; fix that first.

### Overall score: not assessed
**Grade: not assessed** — incomplete device and performance evidence prevents an overall grade.

### Dimension scores
| Dimension | Score | Grade | Status | Weight | Weighted |
|---|---|---|---|---|---|
| Pacing | 89 | B | Warning; desktop scenario only | 25% | 22.25 |
| Performance | 85 provisional | B provisional | Warning; trace/mobile missing | 25% | not assessed |
| Accessibility | 29 provisional | F provisional | Critical; reduced-motion cap | 25% | not assessed |
| Emotional Arc | 76 | B | Warning; narrative judgment | 25% | 19 |

### Detection summary
- Scroll library: GSAP in the fictional source; pin count: 1, total duration: 300vh.
- Parallax layers: 0, maximum per chapter: 0; 3D transforms: 1 element, `#orbit`.
- Compositor layers (desktop): not assessed; compositor layers (mobile): not assessed.
- Scroll jank (10s test): not assessed; event listeners / passive count: not assessed.

### Deduction ledger
All entries refer to the illustrative observations; formula and taste penalties stay separate.
| Dimension | Evidence and count | Formula deduction | Taste deduction / cap | Result |
|---|---|---|---|---|
| Pacing | One missing free-flow interval after `#orbit`; one title ends at 80% of its reveal | −6 (cap 18), −5 (cap 10) | None; other desktop pacing checks clear in scenario | 100 − 6 − 5 = 89 |
| Performance | One animated width on `#route-reveal` | −5 (cap 25) | Layout-property animation −10; remaining measurements unavailable | 100 − 5 − 10 = 85 provisional |
| Accessibility | Reduced-motion support absent; one rapid orbit remains in reduced mode | −25 support, −25 vestibular trigger | 3D under reduced motion −15; critical cap 29 | min(100 − 25 − 25 − 15, 29) = 29 provisional |
| Emotional Arc | Both adjacent chapter transitions repeat the same crossfade, obscuring the journey's change of place | 2 × −8 (cap 16) | Adjacent transition repetition −8 once | 100 − 16 − 8 = 76 |
No jank band is applied without a trace. Missing checks receive no invented pass;
unlisted narrative penalties are zero in this scenario, not universal design advice.

### Taste guardrail check
| Rule | Status | Notes |
|---|---|---|
| Blur animation | PASS | None in illustrative source. |
| Scroll-jacking on narrow screens | not assessed | Mobile unavailable. |
| Consecutive pins without breathing room | PASS | One pin; separate pacing gap penalty above. |
| Parallax on small text | PASS | No text parallax. |
| setState in scroll handler | PASS | No React state in this source. |
| Layout-property animation | FAIL | Width on `#route-reveal`. |
| Excess depth layers | PASS | No parallax depth layers. |
| Raw scroll listener without rAF | not assessed | Listener inspection unavailable. |
| 3D on touch / reduced motion | FAIL | Reduced-motion orbit; touch not assessed. |
| Auto-playing scroll motion | PASS | Orbit responds to user scroll only. |
| Same easing for all chapter animations | PASS | Treatments differ in source. |
| Default easing | PASS | None in illustrative source. |
| All text centre-aligned | PASS | Alignment follows content roles. |
| Repeated depth multipliers | PASS | No parallax depth multipliers. |
| Repeated adjacent transitions | FAIL | Both use the same crossfade. |
| Repeated adjacent titles | PASS | Titles have distinct reading roles. |
| Same palette temperature across chapters | PASS | Journey shifts atmosphere with its subject. |

### Critical issues (fix first)
1. **Reduced-motion orbit persists** — observed in the hypothetical reduced-mode replay at `#orbit`; Accessibility −65 before cap. Replace the camera orbit with a readable static map in that mode; preserve keyboard traversal. Estimated effort: 2 hours. Source filename not supplied; locate the orbit timeline before editing.

### Warnings (fix soon)
1. **Width animation** — illustrative source at `#route-reveal`; Performance −15. Use a compositor-friendly reveal that preserves the map's meaning, then capture a trace. Estimate: 1 hour.
2. **Compressed reading break and late title** — replay after `#orbit`; Pacing −11. Restore a free-flow reading interval and reveal the title before the reading hold. Estimate: 1 hour.
3. **Repeated crossfades** — both chapter boundaries; Emotional Arc −24. Make transitions express departure and arrival; review the full sequence. Estimate: 1 hour.

### Recommendations (nice to have)
Collect mobile, listener, trace and assistive-technology evidence before assigning a complete grade. Expected score improvement: not assessed; evidence may reveal further deductions. Estimate: 2 hours.

### Estimated fix effort
- Critical: 2 hours; warnings: 3 hours; recommendations: 2 hours; **total: 7 hours**, all illustrative estimates.

### Before/after score projection
These are conditional rubric calculations, not repair results; no fixes were performed.
| Dimension | Current | After Critical Fixes | After All Fixes |
|---|---|---|---|
| Pacing | 89 | 89 | 100 if both observed penalties clear |
| Performance | 85 provisional | 85 provisional | not assessed; missing trace/mobile checks |
| Accessibility | 29 provisional | not assessed; cap may clear, coverage incomplete | not assessed; complete remaining checks |
| Emotional Arc | 76 | 76 | 100 if both repetition penalties clear |
| **Overall** | **not assessed** | **not assessed** | **not assessed** |

Next step: offer the critical repair through `cinematic-scroll` if installed and
requested, then repeat the same conditions and add the missing checks.
