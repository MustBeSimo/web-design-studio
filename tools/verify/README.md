# verify-build

Run from the output project's directory. Paths resolve from the caller, including
absolute paths and spaces. Skill contract checks run against the installed skill.

```bash
node /path/to/skill/tools/verify/verify-build.mjs ./index.html
node /path/to/skill/tools/verify/verify-build.mjs ./index.html --scope output --doctor-mode advisory
node /path/to/skill/tools/verify/verify-build.mjs ./index.html --runtime --profiles desktop,mobile
node /path/to/skill/tools/verify/verify-build.mjs http://localhost:3000 --mode-b . --phase polish
node /path/to/skill/tools/verify/preflight-3d.mjs . --model public/hero.glb
```

| Check | When | Evidence |
|---|---|---|
| Tokens, themes, links | `--scope all|package` | Bundled contract integrity |
| Doctor | HTML file or directory with index.html | Static source heuristic; default minimum 80, polish 85 |
| Page-proof matrix | `--runtime` or `--phase polish` | Desktop, mobile, reduced motion on both, and no-JS screenshots/errors |
| Project typecheck/build | `--mode-b <directory>` | Runs that project's npm scripts; supports workspace dependency resolution |
| 3D dependency preflight | Local HTML or Mode B project | Three.js imports, glTF validity/resources, and required Draco, Meshopt or KTX2 decoder wiring |

URL targets are browser targets, not static source files. For application projects,
provide their running URL and project directory; the verifier does not start a server.
A missing typecheck/build script is reported as a failed command, not silently ignored.

Exit **0** is PASS for all requested checks. Exit **1** is FAIL. Exit **2** is
INCOMPLETE (a requested browser check could not run or `--fast` omitted checks),
or invalid arguments. `--strict` maps incomplete evidence to exit 1 for older CI
integrations. `--fast` alone runs static checks; `--fast --phase polish` can never
certify a build.

`--scope all` preserves the original behavior and checks both the installed package
and the requested output. Use `--scope output` during normal build iteration to avoid
rerunning package-integrity checks; use `--scope package` in installation validation
and repository CI. Package scope does not accept output targets or output-only flags.

The doctor threshold is required by default. `--doctor-mode advisory` softens only a
completed doctor run whose score is below threshold (exit 1), recording it in `steps`
and the top-level `advisories` list. Invalid invocation (exit 2) remains incomplete,
and spawn, runtime, compilation and 3D dependency failures remain fatal.

`--min 0..100` sets the doctor threshold. `--browser <path>` chooses Chrome.
`--json` prints the report; `--report <path>` also saves it. Browser evidence lands
in the caller's `.verify/proof/`. A report records each failure and skipped check.
Both runtime and Mode B failures are required failures when requested.

`--profiles` accepts a comma-separated subset of `desktop`, `mobile`,
`reduced-motion`, `mobile-reduced-motion`, and `no-js`. Use focused profiles while
iterating on one interaction, then omit the option for the complete final matrix.

The 3D preflight parses local `.glb`/`.gltf` documents and their required extensions.
It fails early when Three core, a local module, an external glTF buffer/texture, or a
required Draco/Meshopt/KTX2 decoder is missing. Remote model URLs are reported as
uninspected. Local and `file:` import-map targets are resolved through their transitive
imports, and literal decoder/transcoder directories must contain their required JS/WASM
runtime files. Browser proof remains the evidence that the real canvas rendered.

Install `playwright-core` in the skill's package (`npm install`) and provide
Chrome/Chromium to run browser checks. Dependency or browser failure is missing
evidence, not success. See [page-proof](../page-proof/README.md) for extra sample
depths and the limits of automated checks. Open the screenshots before claiming
visual quality; the verifier is not a substitute for composition review.

TasteHQ brand scoring is a separate optional gate with its own 0–1 fidelity
threshold: [contract and commands](../../references/tastehq.md).
