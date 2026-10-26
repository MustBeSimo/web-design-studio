# Web Design Studio 3.0.0 launch kit

Use this sequence after the release changes pass validation. These files are drafts
for the owner to publish, not records of completed posts. Keep the measured evidence
and its limits in the copy. No publication or account login is performed by this kit.

## Day 0: merge and release

Merge the validated release and create the GitHub release `v3.0.0` using
[release notes](release-notes.md). Confirm that the archived film is reachable and
that the live showcase still serves its examples before distributing the links.

The previous install attempted a 393 MB tree and was still cloning after 150
seconds. The new path selects a roughly 30 KB skill folder. Record an actual 3.0.0
install run before quoting a duration. Five seconds is the launch target, not a
universal timing result; retain "in seconds" only when the released path supports it.
Do not interpret installation speed as evidence of better generated websites.

After the release is ready, the owner runs these commands from the release checkout:

```sh
npm login && npm publish
```

```sh
clawhub login && clawhub skill publish skills/cinematic-scroll --slug cinematic-scroll --name "Web Design Studio" --version 3.0.0
```

Keep credentials out of files and posts. Check the published version and installation
result after each command. The ClawHub command above publishes `cinematic-scroll`
only; do not imply that it also publishes the two other skills. The collection's
GitHub install is the route to all three.

## Day 1: X and LinkedIn

Publish [the six-post X thread](x-thread.md) in order. Keep the install command and
paste-able prompts intact. Use [the LinkedIn post](linkedin.md) with the existing
film and live showcase links. Answer questions about scope using the evidence page,
not an unsupported comparison with another skill or a strong custom prompt.

## Day 2: Show HN

Use [the Show HN title and body](show-hn.md). Lead with a usable project and the
installation change. Keep the limitations visible: the small comparison found no
correctness advantage, and the larger matched comparison has not been run.

## Day 3: directory listings

Work through [the listing table](listings.md). Check each directory's current
submission instructions before proposing an addition or correction. Submit the
relevant skill description, canonical repository URL and release version. Search
metadata identifies candidates; it does not establish that they accept submissions.

[Reddit drafts](reddit.md) are available for r/ClaudeAI and r/cursor. Read each
community's current rules and use the appropriate promotion or feedback thread
before posting. These drafts are optional, not an instruction to post everywhere.

## Launch checklist

- [ ] Release changes are merged and the required checks have passed.
- [ ] GitHub release `v3.0.0` uses the reviewed release notes.
- [ ] The install command lists `cinematic-scroll`, `scroll-audit` and `launch-page-strategy`.
- [ ] A fresh install is timed, with conditions recorded and timing copy checked.
- [ ] Installed skill folders contain text and resolve their own relative links.
- [ ] npm serves 3.0.0 and its installer has no runtime dependencies.
- [ ] ClawHub serves `cinematic-scroll` 3.0.0 after the owner's publish command.
- [ ] The live site, example destinations and archived film links work.
- [ ] Breaking installation and removed npm-bin changes are visible in the release.
- [ ] Evidence copy preserves the no-correctness-advantage finding.
- [ ] X thread and LinkedIn post are published by the owner on day 1.
- [ ] Show HN is submitted by the owner on day 2.
- [ ] Relevant directory updates are submitted on day 3.
- [ ] Any Reddit post follows the community's current rules.
- [ ] Actual publication URLs and outstanding replies are recorded after posting.

## Reference links

- [Live site](https://mustbesimo.github.io/web-design-studio/)
- [Repository](https://github.com/MustBeSimo/web-design-studio)
- [Film](https://github.com/MustBeSimo/web-design-studio/releases/download/media-2026-10/promo-linkedin__web-design-studio-linkedin.mp4)
- [Evidence and limitations](../../skill-advantage/README.md)
