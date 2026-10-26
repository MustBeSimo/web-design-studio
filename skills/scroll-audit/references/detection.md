# Detect the scroll experience

Use browser observation and accessible source together. Record the route, time,
browser, viewport, device or emulation, motion preference and sampling method.
Inspect only the authorised page. Follow its settled state, not an assumed delay.

An HTML fetch can expose implementation clues, but cannot establish runtime timing,
keyboard behavior or the actual rendered result. Mark those checks unavailable
when browser inspection is missing. Avoid injecting monitoring that changes the
behavior being measured; record any instrumentation and its limitations.

## Pinned and fixed sections

Inspect sticky and fixed positioning, pin configurations and the section's actual
movement relative to scrolling. Distinguish persistent navigation from a story pin.
Record each chapter's selector, start, end, scroll distance in viewport-height units,
release behavior and the free-flow interval before the next pin. Count consecutive
pins and note jumps, overlaps or content that cannot be reached by keyboard.

## Parallax layers

Compare computed transforms at several scroll positions and after reversing.
Look for movement correlated with scroll, including data-driven depth attributes.
A transform hint alone is not evidence of parallax. CSS animation may change a
computed transform without mutating an inline style.
Record layer count per chapter and viewport, displacement-to-scroll ratios,
animated properties and repeated ratios in adjacent chapters.

## Scroll-driven animations

Inspect available event-listener information, animation configuration, observers
and timeline state. Identify the installed library when evidence exposes it.
Record listener counts and passive settings only when the tooling can inspect them.
Check whether updates share a scheduled frame, whether handlers read layout and
whether framework state updates drive each scroll change. Record selectors,
source locations when available and observed consequences.

## Smooth scrolling

Check library instances, configuration and actual scroll progression. Scroll-related
CSS alone does not establish that a smoothing library is running.
Record the library and version only if exposed, its smoothing configuration when
available, and the measured position trace. Keep scroll-position jitter separate
from frame-time jank. A screenshot sequence does not establish either measurement.

## Three-dimensional transforms

Inspect perspective, preserved depth and computed rotation. Identify which elements
move, what initiates movement and whether text or controls move with them.
Compare touch and reduced-motion behavior. Record the transform, trigger and
fallback per element. A canvas scene may require rendered-state inspection rather
than CSS-transform detection; state the inspection limit.

## CSS animations tied to scroll

Inspect scroll and view timelines, timeline-related rules and animation state
changes linked to position. Record the animation count and animated properties.
Check the supported state and a browser without the enhancement when available.
Verify that essential content remains present when a timeline is unsupported.

## Scroll snap

Inspect native snap settings and library snap configuration. Record mandatory or
proximity behavior, snap points and their distance from pin boundaries. Test slow
and quick movement in both directions, plus keyboard travel. Note a snap that
re-enters a pin, skips content or prevents a requested destination from settling.

## Measurement record

Use the source rubric's ten-second scroll observation for runtime sampling when
available. Record the device, gesture, trace duration, frame sampling method and
formula used to calculate jank. Do not call position jitter a dropped-frame rate.
Use the same method for before/after comparisons and disclose emulation or software
rendering. Do not extend those results to untested hardware.

Keep a structured evidence record in the report or an accompanying artifact when
requested. Include:

- target, timestamp, route state, device, viewport and motion preference;
- pins with selector, start, end, duration and release observations;
- parallax layers with selector, ratio, animated properties and chapter;
- libraries, versions and scheduling evidence when inspectable;
- listeners, passive status, layout reads and state updates;
- three-dimensional transforms and touch or reduced-motion alternatives;
- timeline and snap observations;
- will-change usage and measured compositor layers, not guessed layer counts;
- performance trace, jank definition, sample duration and unavailable measurements;
- keyboard path, content availability and supporting frames or source locations.

Use "not observed" for a check performed with no finding, "not applicable" for a
mechanism absent from the page, and "not assessed" for missing evidence. Keep those
states distinct when applying [scoring](scoring.md).
