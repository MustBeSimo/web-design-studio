# Release Web Design Studio

The npm package is `cinematic-scroll-skill`. Release tags use `v` followed by the
package version. The installable skill identifiers stay unchanged.

## One-time trusted publisher setup

On npmjs.com, open package `cinematic-scroll-skill`, then Settings, Publishing
access, and add a GitHub Actions trusted publisher with these exact values:

- Owner: `MustBeSimo`
- Repository: `web-design-studio`
- Workflow filename: `publish-npm.yml`
- Environment: leave blank, this workflow does not select one.

Merge the workflow before the first release that uses it. No npm token, stored
OTP or `npm login` is needed in Actions. The workflow runs on a GitHub-hosted
runner with Node 22 and upgrades to npm 11 for OIDC support. See the
[npm trusted publishing requirements](https://docs.npmjs.com/trusted-publishers/).
This owner configuration is a prerequisite; adding the workflow alone does not
register trust with npm.

## Prepare and publish

1. Update the version sources checked for consistency: `package.json`,
   `manifest.json`, `metadata.version` in every `skills/*/SKILL.md`, and
   `.claude-plugin/plugin.json`. Refresh `package-lock.json` and the release
   label, tag link and `data-release-version` in `index.html` as well.
2. Run `npm install --no-audit --no-fund`, then `npm test`. Review the package
   contents with `npm pack --dry-run`; prepack checks need the dev tools.
3. Review and merge the changes, then push the approved release to main.
4. Create the matching version tag and publish its GitHub release from that
   commit. This is the trigger for `.github/workflows/publish-npm.yml`.
5. The workflow checks out the tag, verifies its package version, installs dev
   tools, validates the skills and runs the complete tests before publishing
   with `npm publish --provenance --access public`.
6. Check the Actions result and the version and provenance on npm. A failed
   publish is not a release confirmation; investigate before retrying.

Only `v*` tags qualify. A `media-*` release never publishes npm. To retry manually,
use the workflow's `tag` input with the existing release tag, or dispatch on that
tag. Dispatching on main without an input skips publishing. An already published
npm version cannot be overwritten; use a new version for changed package content.

## Publish to ClawHub

ClawHub publication remains separate from npm. Follow the maintainer instructions
in [COMPATIBILITY.md](../COMPATIBILITY.md), validate with `npm run clawhub:scan`,
then authenticate with `clawhub login` and publish the desired release version:

```sh
clawhub skill publish skills/cinematic-scroll --slug cinematic-scroll \
  --name "Web Design Studio" --version <X.Y.Z>
```

That command updates `cinematic-scroll` only. Check the registry result before
announcing the version there; publishing npm does not update ClawHub.
