# Scoring reference

The four calculation blocks, seventeen taste deductions and critical caps below
retain the values in this repository's audit-mode.md. They are inherited audit
thresholds, not house-style design defaults. The user's brand still determines
typography, palette and visual treatment. Explain any conflict between an inherited
aesthetic check and the project's stated intent instead of silently changing a rule.

Start each dimension at 100 and apply its formula. Then apply the taste-table
deductions to the named dimension, clamp at zero and apply any critical cap.
An overlapping formula and taste check remain separate entries in the ledger;
show both so their combined effect is explicit. Average the four final dimensions
with equal weights of 25%. Do not subtract the taste deductions a second time
from the overall average. Keep the unrounded result when determining its band.

Record the evidence, occurrence count and deduction cap for every applied rule.
The source defines breathing room as a free-flow interval of at least 80vh,
rhythm relative to 1.2s/100vh, and compositor budgets below 10 desktop layers
and below 4 mobile layers. These values interpret its formulas, not new defaults.
For the overlapping jank bands, use only one deduction: 5% through 10% uses 10
points, above 10% through 15% uses 20, and above 15% uses 35. State this boundary
convention in the report. Do not invent a jank value when no trace is available.

Aesthetic findings require an explanation tied to the subject and reading sequence.
Unavailable evidence does not earn a pass. Mark affected dimensions provisional or
not assessed and withhold a complete overall grade when material checks are missing.
This rubric does not certify legal compliance, conversion, frame rate on other
devices or superiority over another workflow.

## Pacing

```
baseScore = 100
for each pin outside 150-400vh:    deduct 8 points (max -24)
for each missing breathing room:    deduct 6 points (max -18)
for scroll-jacking detected:        deduct 30 points
for snap within 10vh of pin edge:  deduct 5 points each (max -15)
for title reveal ending >75%:      deduct 5 points each (max -10)
for rhythm deviation >40%:         deduct 15 points
score = max(0, baseScore - deductions)
```

## Performance

```
baseScore = 100
for each non-transform animated property:       deduct 5 points (max -25)
for layout reads in scroll handlers:             deduct 8 points each (max -24)
for will-change >3 elements:                     deduct 8 points
for will-change applied globally:                deduct 20 points
for filter animation during scroll:              deduct 25 points
for jank 5-10%:                                  deduct 10 points
for jank 10-15%:                                 deduct 20 points
for jank >15%:                                   deduct 35 points
for images loading during scroll:                deduct 10 points
for no passive: true on scroll:                  deduct 15 points
for mobile layer budget exceeded:                deduct 10 points
for setState in scroll handler:                  deduct 25 points
score = max(0, baseScore - deductions)
```

## Accessibility

```
baseScore = 100
for no reduced-motion support:                  deduct 25 points
for 3D rotation on touch devices:               deduct 20 points
for keyboard navigation broken in pins:          deduct 20 points
for auto-playing scroll motion:                  deduct 15 points
for content hidden behind animations:            deduct 20 points
for missing ARIA labels on pinned content:       deduct 8 points
for focus trap in pinned section:                deduct 12 points
for vestibular trigger (rapid spin/tilt):        deduct 25 points
for screen reader incompatibility:               deduct 15 points
score = max(0, baseScore - deductions)
```

## Emotional arc

```
baseScore = 100
for repetitive title treatment:                  deduct 8 points each repeat (max -24)
for repetitive depth ratios between chapters:    deduct 6 points each (max -18)
for same transition type adjacent:               deduct 8 points each (max -16)
for same color temperature all chapters:         deduct 10 points
for generic parallax with no variation:          deduct 25 points
for motion contradicts content:                  deduct 20 points
for no detectable arc structure:                 deduct 20 points
for missing atmosphere/background treatment:     deduct 5 points each (max -15)
score = max(0, baseScore - deductions)
```

## Taste violations

| Violation | Deduction | Applied To |
|-----------|----------|------------|
| Animating `filter: blur()` during scroll | -15 Performance | Performance |
| Scroll-jacking content <800px | -15 Pacing | Pacing |
| >3 consecutive pins without breathing room | -10 Pacing | Pacing |
| Parallax on text <18px | -8 Emotional Arc | Emotional Arc |
| `setState` in scroll handler | -15 Performance | Performance |
| Animating width/height/top/left/margin/padding | -10 Performance | Performance |
| >7 depth layers per chapter | -8 Performance | Performance |
| Raw scroll listener without rAF | -8 Performance | Performance |
| 3D rotation on touch / reduced-motion | -15 Accessibility | Accessibility |
| Auto-playing scroll motion | -15 Accessibility + -10 Pacing | Both |
| Same easing for all animations in chapter | -5 Emotional Arc | Emotional Arc |
| Default easing (`ease`, `ease-in-out`, `linear`) | -5 Emotional Arc per instance | Emotional Arc |
| Center-aligned all text | -5 Emotional Arc | Emotional Arc |
| Repeated depth multiplier between chapters | -5 Emotional Arc | Emotional Arc |
| Same transition type between adjacent chapters | -8 Emotional Arc | Emotional Arc |
| Same title treatment between adjacent chapters | -8 Emotional Arc | Emotional Arc |
| Same palette temperature across all chapters | -5 Emotional Arc | Emotional Arc |

## Critical caps

- Scroll-jacking + auto-play: max Pacing score = 29 (F tier)
- Filter animation during scroll: max Performance score = 29 (F tier)
- No reduced-motion support + vestibular triggers: max Accessibility score = 29 (F tier)
