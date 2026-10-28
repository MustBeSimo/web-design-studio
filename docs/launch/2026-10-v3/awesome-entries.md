# Directory entry drafts for Web Design Studio

Reviewed for the community brief on 28 October 2026. These cover all ten GitHub
repositories in [listings.md](listings.md); its five non-repository destinations
need separate submission channels. No external issues, PRs or messages were sent.
The owner decides whether to submit. Conditional drafts below are not claims of
eligibility, acceptance, independent verification or community adoption.

Read each README and available CONTRIBUTING.md through the GitHub API:

```sh
gh api repos/<owner>/<repo>/readme --jq .content | base64 -d
gh api repos/<owner>/<repo>/contents/CONTRIBUTING.md --jq .content | base64 -d
```

Also read heilcheng's linked AGENTS.md and JackyST0's README_ZH.md. The fetched
READMEs contained no match for MustBeSimo, cinematic-scroll or Web Design Studio.
Recheck the live list, open PRs and current rules before submitting; source links
below follow HEAD and may change. Fill upstream PR checklists honestly rather
than treating these two-sentence descriptions as a substitute for them.

At review, [repository metadata](https://api.github.com/repos/MustBeSimo/web-design-studio)
reported 50 stars, creation on 30 May 2026 and MIT licensing. Stars are relevant
only to stated admission thresholds, not evidence of output quality. The free
skills need no account, key or paid service; describe those skills, not the Studio upsell.

## ComposioHQ/awesome-claude-skills

**Conditional: submit one hosted skill, not just a collection link.** Its
[CONTRIBUTING.md, Adding Your Skill to README](https://github.com/ComposioHQ/awesome-claude-skills/blob/HEAD/CONTRIBUTING.md#adding-your-skill-to-readme)
specifies this exact entry format:

```markdown
- [Skill Name](./skill-name/) - One-sentence description. Inspired by [Person/Source].
```

The same guide requires a skill folder and SKILL.md, plus real usage examples and
testing. The current README also contains external links, but this draft follows
the documented folder route. Before submitting, the owner would need to include
the self-contained `cinematic-scroll` folder and its references, preserve source
attribution and licence notices, and validate that copy. No upstream copy was made.
Place the entry alphabetically under README's Development & Code Tools category.

**Entry:**

```markdown
- [Web Design Studio (cinematic-scroll)](./cinematic-scroll/) - Build cinematic websites with responsive motion and static fallbacks. Inspired by [Simone Leonelli's Web Design Studio](https://github.com/MustBeSimo/web-design-studio).
```

**PR description:** Add Web Design Studio's cinematic-scroll skill for developers
building scroll-driven product stories and editorial sites. The source project
provides live examples and verification tooling, with responsive and reduced-motion
behavior included in the skill's workflow.

## travisvn/awesome-claude-skills

**Do not submit this AI-assisted draft under the current policy.** The collection
fits Community Skills → Collections & Libraries, but
[CONTRIBUTING.md, AI Automated Submissions](https://github.com/travisvn/awesome-claude-skills/blob/HEAD/CONTRIBUTING.md#ai-automated-submissions)
says a PR must “not be explicitly generated / submitted with AI-assistance.”
The guide also has a 10-star minimum and requires standalone, non-promotional value.
Its Formatting section specifies:

```markdown
- **[Name](link)** - Clear, concise description of what it does
```

The following is a format reference only, not a compliant ready-to-submit PR.
The owner must independently prepare any submission in accordance with that policy;
removing an AI disclosure would not make this draft compliant.

**Reference entry:**

```markdown
- **[Web Design Studio](https://github.com/MustBeSimo/web-design-studio)** - Three free MIT skills for launch-page strategy, cinematic website builds, and scroll audits
```

**Reference PR description:** Add Web Design Studio to Collections & Libraries for
developers planning, building and reviewing motion websites. Its three text-only
skills work without a paid service and include task-specific references and examples.

## BehiSecc/awesome-claude-skills

**Draft for Collections.** No CONTRIBUTING.md was present in the repository root;
[README.md, Contribution](https://github.com/BehiSecc/awesome-claude-skills/blob/HEAD/README.md#-contribution)
invites a “Submit a Pull Request” step. There is no separate declared format;
the [Collections section](https://github.com/BehiSecc/awesome-claude-skills/blob/HEAD/README.md#%EF%B8%8F-collections)
demonstrates the exact plain-bullet structure:

```markdown
- [find-skills](https://github.com/agentbay-ai/agentbay-skills) - Helps users discover, search and install agent skills from the marketplace.
```

**Entry:**

```markdown
- [Web Design Studio](https://github.com/MustBeSimo/web-design-studio) - Three agent skills for launch-page strategy, cinematic website builds, and evidence-based scroll audits.
```

**PR description:** Add Web Design Studio to Collections as a focused set of three
website skills. It covers the page's argument, implementation and scroll review,
with explicit evidence gaps and accessibility fallbacks in the workflows.

## karanb192/awesome-claude-skills

**Draft for Skill Collections.** Use one collection row, rather than three
individual-skill submissions. The [README.md collection table](https://github.com/karanb192/awesome-claude-skills/blob/HEAD/README.md#skill-collections)
provides this exact two-column pattern:

```markdown
| [Superpowers](https://github.com/obra/superpowers) | Planning, testing, debugging, and development workflows. |
```

[CONTRIBUTING.md](https://github.com/karanb192/awesome-claude-skills/blob/HEAD/CONTRIBUTING.md)
requires concise task descriptions, working skill files, recent maintenance,
Claude relevance and a completed PR checklist. Keep the description below 150
characters and the row alphabetically placed; do not add ratings or verified badges.
The source skills pass this repository's packaging checks; that is not an upstream
security review or a claim that an LLM has passed every trigger case.

**Entry:**

```markdown
| [Web Design Studio](https://github.com/MustBeSimo/web-design-studio) | Plan launch-page messaging, build cinematic websites, and audit scroll experiences with evidence and repair priorities. |
```

**PR description:** Add Web Design Studio to Skill Collections for launch-page
strategy, cinematic builds and scroll audits. The source repository's deterministic
tests and skill packaging checks pass, while trigger accuracy still requires a judge.

## fleurytian/awesome-claude-skills

**Skip: specialist author collection, not an external listing directory.** The
[README.md](https://github.com/fleurytian/awesome-claude-skills/blob/HEAD/README.md)
describes itself as “精选高质量Claude Skills集合 | 专注商业分析与内容创作”
(a curated Claude skills collection focused on business analysis and content creation).
It documents the author's consulting, writing, session-finding and government-shutdown
skills in repository folders. No external entry format or contribution process was
found in the README or root files. This is a scope-fit judgment, not a claimed
explicit ban on outside contributions.

**Entry:** Not applicable; do not invent an external-list section.

**PR description:** Not applicable; no directory-entry PR is proposed.

## VoltAgent/awesome-agent-skills

**Conditional: provide real community-use evidence.**
[CONTRIBUTING.md, Entry Format](https://github.com/VoltAgent/awesome-agent-skills/blob/HEAD/CONTRIBUTING.md#entry-format)
specifies:

```markdown
- **[author/skill-name](https://github.com/author/repo/path)** - Short description of what it does
```

It limits descriptions to ten words, requires an author prefix, and rejects brand-new
skills without community adoption. Append this nine-word description to Community
Skills → Development and Testing. The established cinematic-scroll skill is the
proposed entry; the owner still needs evidence of actual community usage. The
project's own example gallery and star count alone do not establish that requirement.

**Entry:**

```markdown
- **[MustBeSimo/cinematic-scroll](https://github.com/MustBeSimo/web-design-studio/tree/main/skills/cinematic-scroll)** - Build cinematic websites with responsive motion and static fallbacks
```

**PR title:** `Add skill: MustBeSimo/cinematic-scroll`

**PR description:** Add Web Design Studio's cinematic-scroll to Development and
Testing for scroll-driven website builds. It includes mobile, reduced-motion and
static fallback guidance while leaving the visual identity to the project.

## heilcheng/awesome-agent-skills

**Draft for three source-folder entries.**
[CONTRIBUTING.md](https://github.com/heilcheng/awesome-agent-skills/blob/HEAD/CONTRIBUTING.md)
defers full submission rules to [AGENTS.md](https://github.com/heilcheng/awesome-agent-skills/blob/HEAD/AGENTS.md),
which specifies the subfolder format exactly:

```markdown
- [owner/skill-name](https://github.com/owner/repo/tree/main/skills/skill-name) - ...
```

This is a collection of actual skill folders, not a directory or marketplace.
The repository's measured 50 stars and May creation date meet the stated 20-star
and older-than-14-days thresholds. Each folder has named YAML frontmatter.
Recheck safety, duplicates and existing PRs before submission; those admission
checks are not replaced by this observation. Edit README.md only, append within
existing category details blocks, keep descriptions below 100 characters and make
one PR with these three lines (within its five-line limit). Disclose AI assistance.

**Entries — append to Development and Testing:**

```markdown
- [MustBeSimo/cinematic-scroll](https://github.com/MustBeSimo/web-design-studio/tree/main/skills/cinematic-scroll) - Build cinematic websites with responsive motion and static fallbacks
- [MustBeSimo/scroll-audit](https://github.com/MustBeSimo/web-design-studio/tree/main/skills/scroll-audit) - Audit scroll pacing, performance and accessibility with a scored repair plan
```

**Entry — append to Marketing:**

```markdown
- [MustBeSimo/launch-page-strategy](https://github.com/MustBeSimo/web-design-studio/tree/main/skills/launch-page-strategy) - Plan launch-page messaging, objections and proof before design
```

**PR description:** Add Web Design Studio's three source-folder entries for
cinematic builds, scroll audits and launch-page strategy. The submitter is the
project author, and these proposed entries were prepared with AI assistance.

## lawve-ai/awesome-legal-skills

**Skip: legal-professional scope.**
[CONTRIBUTING.md](https://github.com/lawve-ai/awesome-legal-skills/blob/HEAD/CONTRIBUTING.md)
evaluates “real, practical value to legal professionals” and directs submissions
through its [skill form](https://lawve.ai/new/skill), followed by manual review and
repository sync. It does not prescribe a Markdown directory-entry PR format.
This general website collection has no demonstrated legal-work workflow; a law
firm being able to build a marketing site is not sufficient evidence of that fit.

**Entry:** Not applicable; no legal-specific skill is supplied.

**PR description:** Not applicable; the documented route is a form, and this
collection is outside the proposed submission scope.

## skillmatic-ai/awesome-agent-skills

**Draft for Phase 2 → Ready-to-Use Skill Libraries → Popular Collections.**
[CONTRIBUTING.md](https://github.com/skillmatic-ai/awesome-agent-skills/blob/HEAD/CONTRIBUTING.md)
requires this exact format:

```markdown
[Title](URL) - Description.
```

The [README.md](https://github.com/skillmatic-ai/awesome-agent-skills/blob/HEAD/README.md#popular-collections)
uses that structure as a bullet in this category. Keep the entry concise and
check for duplicates; this is an actual SKILL.md collection, not a generic design article.

**Entry:**

```markdown
- [Web Design Studio](https://github.com/MustBeSimo/web-design-studio) - Three SKILL.md skills for launch-page strategy, cinematic website builds, and scroll audits.
```

**PR description:** Add Web Design Studio to Popular Collections as a focused
website workflow collection. Its three self-contained skills cover planning,
building and auditing, with references and examples inside each installable folder.

## JackyST0/awesome-agent-skills

**Hold: the default 256-star requirement is not met.**
[CONTRIBUTING.md](https://github.com/JackyST0/awesome-agent-skills/blob/HEAD/CONTRIBUTING.md)
requires both language READMEs and says to “use the existing entry format for the
target category.” Collections with their own distribution are eligible in principle,
but the project currently has 50 stars and no maintainer exception is established.
Keep these drafts until eligibility changes or an explicit exception is granted.

The Skills Collections section in [README.md](https://github.com/JackyST0/awesome-agent-skills/blob/HEAD/README.md#skills-collections)
uses plain bullets, for example:

```markdown
- [awesome-cursorrules](https://github.com/PatrickJS/awesome-cursorrules) - The most comprehensive Cursor Rules collection.
```

The matching [README_ZH.md section](https://github.com/JackyST0/awesome-agent-skills/blob/HEAD/README_ZH.md)
instead uses this exact table header:

```markdown
| 名称 | 描述 | Stars | 链接 |
```

Preserve those different existing structures; do not force the generic four-column
skill/platform table onto the collection category. Update both READMEs together,
run the upstream `npm run check`, and leave generated docs/skills.json alone.
The Chinese row's 50-star count is a dated observation and must be refreshed when
submission becomes eligible. Do not claim universal platform verification.

**English entry — README.md, Skills Collections:**

```markdown
- [Web Design Studio](https://github.com/MustBeSimo/web-design-studio) - Three agent skills for launch-page strategy, cinematic website builds, and scroll audits.
```

**Chinese entry — README_ZH.md, Skills 合集:**

```markdown
| Web Design Studio | 三项智能体技能：规划发布页内容、构建滚动叙事网站、审计滚动体验 | 50 | [GitHub](https://github.com/MustBeSimo/web-design-studio) |
```

**PR description:** Add Web Design Studio to Skills Collections in both language
READMEs, preserving each section's existing format. The collection provides three
MIT skills for launch-page strategy, cinematic builds and scroll audits, with
installation and examples in the source repository.
