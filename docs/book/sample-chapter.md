<!-- Free sample chapter from *The Cinematic Web: Scroll-Driven Web Design with Claude Code, Codex and Reusable AI Skills* by Simone Leonelli (2026). Kindle edition: https://www.amazon.com/dp/B0HPYP923J. Reproduced by the author; all rights reserved. -->

> **Free sample chapter** from *The Cinematic Web* by Simone Leonelli. The full book has twelve chapters and a prompt appendix. [Kindle edition](https://www.amazon.com/dp/B0HPYP923J).

# Chapter 3: The twelve scroll patterns

A client sends me a link and says "something like this." Nine times out of ten the page they are pointing at is one of twelve things. The names change, the brand changes, the library changes, but the mechanics are the same twelve mechanics, and each one fits some subjects and ruins others. Once you can name the pattern, you can stop copying the reference and start asking whether it belongs on your client's page at all.

These twelve come from the scroll-patterns reference that ships with the Web Design Studio toolkit (github.com/MustBeSimo/web-design-studio). Each has a depth configuration, a scroll behaviour, a mobile strategy, a performance budget and a list of places not to use it. I am not going to reproduce the reference. I am going to tell you what each pattern is for, when I reach for it, where it goes wrong, and the one line I give the agent to start.

## How to read a pattern

Every pattern in the reference is described as a stack of layers, each with a speed multiplier. A layer at 0.15x drifts slowly and reads as far away. A layer at 1.00x moves with the page. A layer at 1.20x moves faster than the page and reads as foreground. Three to five layers is the usual budget. The multipliers are the whole trick of parallax: they are a fake camera, and the fake only works while the layers are few and the speeds are consistent.

Each pattern also names a pin duration, measured in viewport heights. A hero pinned for 200vh means the visitor scrolls two screens while the hero stays put and changes. Longer pins buy more time for the transformation and cost more patience.

Every pattern switches behaviour below 768px. Almost all of them drop the pin, cut the layers to three or fewer, and replace clip-path reveals with opacity fades. Mobile is a composition, not a shrunken desktop. When you brief the agent for a pattern, you are briefing two compositions.

And every pattern has a trap. The reference lists these as "when not to use". I have met every one of them on a live site. Read the trap before you read the behaviour. A pattern whose trap describes your page is the wrong pattern however good the reference looked.

Choose from the subject, not the reference. A true chronology points at the timeline. A single object with meaningful sides points at the orbit. An essay points at the longread. Eight shipped features point at the release. If the subject gives no answer, no pattern will, and the story brief needs more work first.

## Openings

Three patterns exist to begin a page with weight.

### 1. Pinned Hero

**What it is.** A full-viewport hero that stays fixed while the scroll reveals it: the title unmasks over the first part of the pin, the background drifts a few percent, and the whole stage scales down and fades in the last stretch before a crane move into the next section. Pin duration 200 to 300vh, five layers at most.

**When it fits.** Brand introductions, product launches, any opening that needs a single dramatic image to land before the argument starts.

**The trap.** Content-heavy landing pages and anything people need to scan. A pinned hero is two or three screens of near-empty scroll before the first real paragraph. If the visitor arrived with a question, you have delayed the answer. Below 768px the pin should go entirely and the hero becomes a static stacked block.

**Prompt.** Use cinematic-scroll to build a pinned hero for [subject] where the title unmasks over the first 40% of a 250vh pin and the stage never goes empty; static stacked layout under 768px.

### 10. Landing Sequence

**What it is.** Four to six full-viewport scenes, each 100 to 150vh, wiping upward one after the other with a parallax difference between outgoing and incoming. Headlines split by character. Backgrounds breathe with a slow scale. Scroll snaps to scene centres on release, so there is no in-between state.

**When it fits.** Event pages, campaign microsites, splash experiences. Anything that is a sequence of statements rather than an argument.

**The trap.** Informational pages, and any page whose job is to get the visitor to an external link. The sequence forces linear consumption and delays the action. Repeat visitors skip scenes; give them a skip button or they will leave. On mobile, cut to three scenes at 80vh and replace character splits with word fades.

**Prompt.** Use cinematic-scroll to build a five-scene landing sequence for [event] with snap-to-scene, wipe-up transitions, a visible skip control, and three scenes only below 768px.

### 5. Chaptered Release

**What it is.** The Shopify Editions shape. Five to eight pinned chapters, each with its own visual world: the background colour morphs between chapters, a fixed title holds during each one, feature cards stagger in, and the outgoing chapter fades to about 0.3 opacity before the incoming reaches 0.7, so there is never a blank screen.

**When it fits.** Product releases, feature announcements, campaign reveals. Anything with a natural "here are the eight things we shipped" structure.

**The trap.** Pages people return to, pages where features need comparing side by side, and pages where early content matters for search, because pinned chapters push it below the fold. Clean up outgoing chapter layers as you go or the compositor count climbs chapter by chapter. On mobile, three chapters at most, hard colour cuts, no stagger.

**Prompt.** Use cinematic-scroll to build a six-chapter release page for [product] where each chapter has its own background colour and title, chapters cross-fade without a blank frame, and mobile shows the three most important chapters unpinned.

## Explaining

Three patterns exist to make the scroll do the explaining.

### 2. Scrubbed Timeline

**What it is.** The scroll drives a timeline. A connecting line draws itself with `stroke-dashoffset` mapped one to one to progress, event cards slide in from alternating sides at computed positions, and a year label follows the active event. Pin 150 to 250vh per segment.

**When it fits.** Roadmaps, company history, process explanations. Anything with a true order.

**The trap.** More than twenty events, which should be broken into chaptered segments, and any set of events that is not actually chronological, because the scroll metaphor is a time axis and a false one confuses. Below 768px the line goes static and the cards stack vertically.

**Prompt.** Use cinematic-scroll to build a scrubbed timeline of [eight milestones] where the connecting line draws with scroll progress and cards alternate sides; vertical stack with a static line under 768px.

### 9. Data Story

**What it is.** Charts that build as you scroll. Bars scale up from their baseline, line paths draw left to right, labels fade in once their data point reaches most of its final value, and key statistics count up to their real figures. One actively animating chart per viewport.

**When it fits.** Annual reports, impact pages, research presentations. Anywhere a number is the climax of a paragraph.

**The trap.** Real-time dashboards, where scroll fights live data; pages where precise comparison is the point, because animation slows comparison; and any series with more than fifty points, which should be aggregated or shown static. Only animate numbers you can source. On mobile, skip the counting and show the final values at once.

**Prompt.** Use cinematic-scroll to build a data story for [report] with scroll-drawn bar and line charts, counted statistics using only the figures in `data.json`, and final values shown immediately below 768px.

### 7. 3D Product Orbit

**What it is.** A product turns in space as the visitor scrolls, `rotateY` from 0 to 360 degrees across a 300 to 500vh pin, with a shadow plane that tightens edge-on, spec callouts that appear at particular angles, and a radial background whose hue shifts with progress. Done in CSS 3D with front, back and side plates, or with real geometry when the detail demands it.

**When it fits.** Device launches, automotive reveals, any object whose back and sides say something.

**The trap.** Round or simple objects where the other views add nothing, comparison pages where the visitor wants to see three products at once, and audiences on low-end devices. One active 3D scene per page. Below 768px it becomes a swipeable carousel through 180 degrees.

**Prompt.** Use cinematic-scroll to build a scroll-driven product orbit for [object] using the four plates in `assets/`, with spec callouts at 45, 135 and 270 degrees, and a swipe carousel instead of 3D under 768px.

## Reading

Three patterns exist for pages people actually read.

### 4. Sticky Narrative

**What it is.** A sticky sidebar holds a short narrative track while evidence scrolls past at half speed. The sidebar text swaps at section boundaries with a plain 300ms crossfade and no movement, and a thin line fills to show progress. Sections at least 120vh so the reading pace holds.

**When it fits.** Long-form journalism, case studies, tutorials. Anything where a guide voice should stay beside the material.

**The trap.** Short content under about 2000px, where the sticky element feels gratuitous; non-linear reference content; and any design where the sidebar needs to be interactive. Six sidebar states is the ceiling. Below 768px the sidebar becomes a heading above each section and sticky goes away.

**Prompt.** Use cinematic-scroll to build a sticky-narrative case study for [project] with five sidebar states that crossfade without moving, evidence images at half scroll speed, and a stacked layout under 768px.

### 8. Editorial Longread

**What it is.** Magazine long-form. Body text at a 680px measure with no parallax at all. Inline images break out and drift at 0.15x, pull quotes go full-bleed with a slight scale, chapter images run full width at 0.5x, headings reveal word by word, and body paragraphs appear immediately with no entrance animation.

**When it fits.** Brand stories, essays, thought leadership. Pieces over about 1500 words that deserve to be read.

**The trap.** Short pieces, skimmable reference content, and pages that mix reading with heavy interaction. Never put parallax on body text; subpixel movement makes it unreadable. Mobile drops the image parallax, tightens the pull quotes and keeps body text at 18px or above.

**Prompt.** Use cinematic-scroll to lay out `essay.md` as an editorial longread with a 680px measure, word-by-word heading reveals, full-bleed chapter images at half speed, and no animation on body paragraphs.

### 3. Velocity-Reactive

**What it is.** Elements respond to how fast the visitor scrolls. Slow scroll gives expanded, editorial spacing at full opacity. Fast scroll compresses column gaps, tightens letter-spacing and dims body text. Velocity is measured over the last three frames, lerped, and capped so a wheel burst cannot break the layout.

**When it fits.** Immersive storytelling, editorial sites and galleries where the visitor's tempo is part of the experience.

**The trap.** Reference pages, forms, and anything with scroll jumps from anchors or route changes. Touch scrolling lacks velocity resolution, so below 768px this becomes direction detection only. Keep the velocity update under half a millisecond and never read layout inside it.

**Prompt.** Use cinematic-scroll to add velocity-reactive spacing to [gallery] so slow scroll expands gaps and letter-spacing and fast scroll compresses them, with a 3 px/ms cap and direction-only behaviour on touch.

## Showing work

Three patterns exist to present a collection.

### 6. Parallax Gallery

**What it is.** An image grid where each image carries its own speed, large images drifting slowly and small details drifting most. Even columns start 80px lower than odd for rhythm. Images unclip from the bottom as they enter. Hover scales by two percent.

**When it fits.** Portfolios, lookbooks, editorial spreads. Collections where the pleasure is in looking rather than finding.

**The trap.** Image-heavy pages on slow connections, strict grids where alignment matters, and any text that sits near the moving images, because displacement makes selection confusing. Twenty active parallax images at most, eager-load six. Below 768px, two columns at one depth, opacity reveals, twelve images then a load-more.

**Prompt.** Use cinematic-scroll to build a parallax lookbook from the images in `assets/` with per-image speeds between 0.25 and 0.85, clip-path reveals, and a flat two-column grid below 768px.

### 11. Portfolio Reveal

**What it is.** Each project is a chapter of 200 to 300vh. The hero slides in from the right, the title unclips left to right, thumbnails stagger, metadata follows the title, the background colour shifts between project brand colours at the boundary, and a fixed "view project" action holds during the chapter.

**When it fits.** Agency portfolios, personal sites, creative showcases with a handful of strong projects.

**The trap.** More than fifteen projects, which want categories or the archive pattern; side-by-side comparison; and recruitment pages where a fast scan of skills matters more than drama. Below 768px, no pin, content-driven height, inline action at the end of each project.

**Prompt.** Use cinematic-scroll to build a portfolio reveal for [six projects] with per-project background colours, a fixed view-project action during each chapter, and an unpinned stacked layout under 768px.

### 12. Archive Explorer

**What it is.** Vertical scroll maps to horizontal travel through a pinned track. One pixel down is one pixel across. Items snap to centre, a sidebar lists decades or categories, a progress bar runs across the top, and clicking an item opens a detail panel. Virtualise above roughly fifty items.

**When it fits.** Museums, libraries, brand archives, photo collections. Large ordered sets where the order means something.

**The trap.** Small collections under ten items, search results, and sets where order is arbitrary and a grid would serve better. Horizontal travel is awkward on touch, so below 768px it becomes a vertical card stack with a scrollable tab bar and a bottom-sheet detail.

**Prompt.** Use cinematic-scroll to build an archive explorer for [collection] where vertical scroll drives a pinned horizontal track with centre snapping and a category sidebar, and a vertical card stack under 768px.

## Learned additions

The reference ends with a section called "Learned additions". When I checked it for this book, it was empty, and I want to tell you why rather than pretend otherwise.

The toolkit has a learn mode. Point it at a page you admire and it tries to extract a technique, a theme, a taste rule or an archetype into a candidate entry. Candidates are not canon. They sit in a learned folder with a manifest, a learning log, a clusters file and a rejected list. When several entries from different source domains cluster around the same idea, the cluster can be proposed for promotion. A human reviews the proposal. Only then does a pointer get appended under "Learned additions", and only then does the pattern count as the thirteenth.

The rejected list is the part I value most. It records what the system decided not to learn and why: it copied a brand too closely, it did not fit the schema, it duplicated an existing pattern, or the evidence was thin. A pattern library that only grows is a pattern library that slowly fills with fashion. The bar for a new pattern is that it survived a firewall against copying, a schema check, a duplicate check and a human.

So the honest count today is twelve. If you run learn mode on your own references, you will build your own additions, and they will be yours. Check the reference in the current release for anything that has since been promoted.

## Do this now

1. Take the last reference link a client sent you and name its pattern from the twelve. Write down which trap applies to the client's actual content.
2. For your current project, write the subject in one sentence and pick a pattern from that sentence alone. Only then open the reference's depth configuration for it.
3. Pick one pattern and sketch its two compositions, desktop and mobile, as two rough boxes with the layer count in each.
4. Run the one-line prompt for that pattern and compare the agent's output to the trap list before you look at anything else.
5. If you have the toolkit, open the learned folder and read the rejected list. Note what kind of idea gets refused.

## Prompts you can paste

> Use cinematic-scroll to read `brief.md` and recommend one of the twelve scroll patterns for this subject. Name the pattern, say why it fits the subject rather than the reference I sent, and quote the "when not to use" entry so I can check it against the content before you build anything.

> Use cinematic-scroll to build [pattern name] for [subject] as a self-contained HTML file. Follow the depth configuration and mobile strategy from the scroll-patterns reference, keep the stage complete at every scroll depth, and prove the under-768px state and the reduced-motion state in a browser before reporting.

> Use scroll-audit on [reference URL the client sent, which I am authorised to test]. Tell me which of the twelve patterns it uses, score it on the four dimensions, and list the traps it falls into, so I can explain to the client what we would keep and what we would not.
