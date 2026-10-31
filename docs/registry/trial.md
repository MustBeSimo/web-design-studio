# Web Design Studio: component pilot

This is a small usability trial for 3–5 developers. The question is whether the
three components install cleanly and fit an existing React project. Participation
is optional; no analytics, account, API key or telemetry is involved.

## Try one component

Allow about 15 minutes. Use a disposable React + TypeScript project already
configured for shadcn, or a branch of a project you can safely modify.

1. Pick **entrance reveal**, **tilt card** or **scrub video**.
2. Install it with the matching command below.
3. Add it to a page, replace the example text with your own and adapt one host
   color or spacing value.
4. Try keyboard navigation, a narrow window and reduced motion. For video, supply
   a poster and a silent clip; the permanent poster must remain useful if it fails.
5. Send the short feedback form below, including unsuccessful attempts.

```sh
npx shadcn@4.23.0 add https://mustbesimo.github.io/web-design-studio/r/entrance-reveal.json
npx shadcn@4.23.0 add https://mustbesimo.github.io/web-design-studio/r/tilt-card.json
npx shadcn@4.23.0 add https://mustbesimo.github.io/web-design-studio/r/scrub-video.json
```

Install only the component you chose. For the full demonstration, install all
three and copy [demo.tsx](demo.tsx) to `app/pilot/page.tsx` in a Next App Router
project. Open `/pilot`. Its sample footage and poster come from the existing KERN
example on the Web Design Studio site; replace those URLs with your own assets
when integrating it. Vite projects can use the same component body, adjusting
imports to match `components.json` and mounting it in their normal entry point.

- [Install guide and limitations](README.md)
- [Entrance reveal props](entrance-reveal.md)
- [Tilt card props and runtime](tilt-card.md)
- [Scrub video props and media requirements](scrub-video.md)

The entrance reveal does not pin. Components inherit host semantic CSS tokens;
they do not install a global theme. Client-only Vite needs host SSR/prerendering
for meaningful content with JavaScript disabled.

## Send back

Copy this and fill in whatever you observed. Do not include private source,
credentials, customer information or internal URLs in a public reply.

```text
Project/framework and browser/device:
Component chosen:
Did the install command succeed? If not, paste the non-sensitive error:
Time from starting the install to a visible working component:
Time to a result you would keep:
What did you have to change, look up or guess?
Did keyboard, narrow layout and reduced motion behave as expected?
What made you stop, if you stopped?
One improvement that would help most:
May Simone quote your feedback? Yes / No (default: No)
```

These are individual usability observations, not adoption or conversion figures.
Keep an empty result empty; record a failure as a failure. Ask before quoting or
publishing a participant's name or feedback.

## Safari and iPhone check

These are manual device checks until a result is recorded. A WebKit automation
result is not a physical iPhone result.

- For keyboard navigation on macOS Safari, use Option-Tab for links if plain Tab
  skips them ([Apple keyboard guide](https://support.apple.com/guide/safari/cpsh003/mac)).
- On desktop Safari, scroll the sample clip forward and backward, resize narrow
  then wide, reload mid-page and note the restored position, and confirm the poster remains if the video is blocked or missing.
- On iPhone Safari, confirm a readable poster and caption in natural page flow,
  with no long pinned track or pointer tilt. Try portrait and landscape.
- Enable the device's Reduce Motion setting and reload. Confirm all text and
  links remain usable. Note device model, OS/browser version and the actual media.

## Invitation text

> I’m testing three small React motion components for Web Design Studio. Would you
> try one in a disposable project for about 15 minutes and tell me where the
> install or customization gets confusing? Failed attempts are useful feedback.
> There’s no account, API key or tracking. Here are the demo source, install
> instructions and a short feedback form. I’ll ask before quoting anything.
