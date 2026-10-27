# Pages media branch design

Date: 27 October 2026. Status: groundwork only; no Pages source change and no
media removal from main in this PR.

## Branch and artifact model

Keep site media on an orphan branch named `media`, at the same repository-relative
paths used by main. Its history has no main ancestor. The bootstrap tool copies
committed blobs from `origin/main` into a temporary worktree and pushes only
`origin/media`. Updates are ordinary fast-forwards; no force push is used.
Uncommitted edits and untracked files in the caller's worktree are never inputs.

`.github/workflows/pages.yml` builds on every main push and manual dispatch. It
checks out main and media separately, copies main into a temporary site tree, then
copies the media overlay on top. Media wins on a path collision. The build excludes
`.git`, `node_modules`, `.superpowers` and `.claude` from both inputs, checks local
site links against the assembled root, and uploads one Pages artifact.

The build always runs. Deployment uses `actions/deploy-pages@v4` only when the
repository variable `PAGES_DEPLOY_ENABLED` equals `true`. Leave it unset or false
until the owner performs cutover. This PR does not edit that variable or Pages
settings. Site URLs and the `/web-design-studio/` base path never change.

## Classification and measured plan

Candidates include every tracked file under `examples/*/assets/`,
`assets/previews/` and `assets/video/`, plus direct `assets/brand/*.mp4` files.
Also include tracked JPG, JPEG, PNG, WebP, GIF, MP4, WebM and GLB files larger than
200,000 bytes outside `skills/`, `tools/`, `bench/`, `docs/` and `templates/`.
Reject candidate symlinks. Metadata inside an explicit asset directory travels
with its media. The broad size rule also includes the LinkedIn poster; it remains
at its existing site URL through the overlay after cutover.

Measured with `node tools/media-branch.mjs --plan`:

```text
Source: origin/main (f469d193f5f2df49cea9b3ab9e07262ad0a9ffa8)
Tracked main: 880 files, 109.39 MB (109388896 bytes)
Site media by directory:
  assets/brand: 3 files, 8.45 MB
  assets/previews: 22 files, 12.93 MB
  assets/promo-linkedin: 1 files, 0.22 MB
  assets/video: 14 files, 7.99 MB
  examples/_surface-assets: 10 files, 6.66 MB
  examples/atmospheric-sublime: 1 files, 0.88 MB
  examples/aureus-flythrough: 1 files, 0.20 MB
  examples/botanical-editorial: 1 files, 0.86 MB
  examples/brutalist-kinetic: 1 files, 1.06 MB
  examples/clinical-noir: 1 files, 0.54 MB
  examples/data-cinematic: 1 files, 0.77 MB
  examples/flagship: 3 files, 2.89 MB
  examples/gallery-flythrough: 7 files, 1.20 MB
  examples/jungle-flythrough: 3 files, 1.13 MB
  examples/kern-calibration: 5 files, 13.60 MB
  examples/liquid-chrome: 1 files, 0.66 MB
  examples/luxe: 4 files, 1.07 MB
  examples/naturalistic-drift: 1 files, 0.98 MB
  examples/noir: 4 files, 1.25 MB
  examples/pop: 4 files, 0.69 MB
  examples/renaissance: 8 files, 4.74 MB
  examples/storybook-geometry: 1 files, 0.51 MB
  examples/studio: 8 files, 10.94 MB
  examples/symmetric-monument: 1 files, 0.99 MB
  examples/temporal-monument: 1 files, 0.83 MB
  examples/warm-scrapbook: 1 files, 0.76 MB
Total media: 108 files, 82.81 MB (82813471 bytes)
Projected main: 26.58 MB (26575425 bytes)
Decimal MB; committed file bytes, not clone transfer size or git history.
```

The measured candidate set is larger than the initial approximate estimate. These
are logical file bytes, not compressed clone transfer sizes or measured install
times. No faster-install claim is established until the later cutover is measured.

## Groundwork verification

Published orphan `media` at `76873c83920ce0c8a68bbd53bb5358f33b0742d7`;
all 108 paths and blob IDs match the plan. Remote main stayed at the source above.
A local run of the workflow's assembly commands, with candidate files removed
from a temporary main copy, restored every media file and passed all 88 checked
links. Overlay precedence and all four directory exclusions passed as well.
Hosted Actions and deployment remain untested; the deployment variable is unset.

## Bootstrap and maintenance

Run `node tools/media-branch.mjs --plan` to review the immutable source commit and
candidate paths. Run `node tools/media-branch.mjs --write-branch` to refresh main,
create or update the orphan overlay, commit it and push only `media`. Verify its
paths and blob IDs against the plan. A rejected push leaves main untouched and
cleans up the temporary worktree. Repeating an unchanged snapshot adds no commit.

This is a pre-cutover mirroring tool. After media leaves main, do not rerun it:
main would no longer contain the full overlay. Maintain media through a dedicated
media checkout instead, preserving path names and coordinating its revision with
main. A media-only push does not trigger this workflow; dispatch the Pages build
after an approved media update. Keep the overlay free of unrelated source files.

## Cutover and local-clone trade-off

The owner first reviews a successful assembled artifact while media still exists
on main. Then select GitHub Actions as the Pages source, enable the deployment
variable and verify the published site. Only after that evidence should a separate
reviewed change remove the classified media from main. This PR performs neither
step. Recheck the plan against the then-current main and media revisions.

After removal, a local clone of main alone shows example pages without their moved
images, videos or models. Some authored fallbacks remain useful, but a full-fidelity
local preview requires overlaying media first. This is a real authoring trade-off.
The installable text-only skill folders are independent of those site assets.

## Rollback

While media is still on main, switch the Pages source back to the main branch at
`/` and disable `PAGES_DEPLOY_ENABLED`. The branch source still contains the whole
site. After media has been removed, restore the required files from the media
snapshot to main before switching back; a source-setting change alone cannot
restore missing media. Preserve the media branch during either rollback.
