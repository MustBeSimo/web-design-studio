#!/usr/bin/env node
/**
 * cinematic-scroll-skill installer
 * ---------------------------------
 * Copies the Web Design Studio skill folders (skills/*) into an agent's skills
 * directory. No dependencies, no network.
 *
 *   npx cinematic-scroll-skill                       → all skills into ~/.claude/skills
 *   npx cinematic-scroll-skill --skill cinematic-scroll
 *   npx cinematic-scroll-skill --dir .cursor/skills  → project-level install for another agent
 *   npx cinematic-scroll-skill --list
 *
 * The registry route (`npx skills add MustBeSimo/web-design-studio`) installs the
 * same folders and can target any supported agent; this installer is the
 * no-questions fallback.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** @returns {Array<{name: string, dir: string, description: string}>} skills shipped in this package */
export function discoverSkills(pkgRoot = PKG_ROOT) {
  const skillsDir = join(pkgRoot, 'skills');
  if (!existsSync(skillsDir)) return [];
  return readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(skillsDir, entry.name, 'SKILL.md')))
    .map((entry) => {
      const dir = join(skillsDir, entry.name);
      const text = readFileSync(join(dir, 'SKILL.md'), 'utf8');
      const description = text.match(/^description:\s*(.+)$/m)?.[1]?.trim() ?? '';
      return { name: entry.name, dir, description };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Copy the selected skills into skillsDir/<name>, replacing any previous copy.
 * @param {{pkgRoot?: string, skillsDir: string, only?: string[]}} options
 * @returns {Array<{name: string, target: string, replaced: boolean}>} `replaced` is true when a folder of that name already existed and was overwritten
 */
export function installSkills({ pkgRoot = PKG_ROOT, skillsDir, only }) {
  const available = discoverSkills(pkgRoot);
  const names = available.map((skill) => skill.name);
  const wanted = only?.length ? only : names;
  for (const name of wanted) {
    if (!names.includes(name)) throw new Error(`Unknown skill "${name}". Available: ${names.join(', ')}`);
  }
  mkdirSync(skillsDir, { recursive: true });
  return wanted.map((name) => {
    const source = available.find((skill) => skill.name === name).dir;
    const target = join(skillsDir, name);
    const replaced = existsSync(target);
    rmSync(target, { recursive: true, force: true });
    cpSync(source, target, { recursive: true });
    return { name, target, replaced };
  });
}

/** @returns {{dir?: string, only?: string[], list: boolean, help: boolean}} */
export function parseArgs(argv) {
  const parsed = { dir: undefined, only: undefined, list: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dir') parsed.dir = argv[++i];
    else if (arg === '--skill') {
      const names = (argv[++i] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
      parsed.only = [...(parsed.only ?? []), ...names];
    } else if (arg === '--list' || arg === '-l') parsed.list = true;
    else if (arg === '--help' || arg === '-h') parsed.help = true;
  }
  return parsed;
}

function expandHome(path) {
  return path.startsWith('~') ? join(homedir(), path.slice(1)) : resolve(path);
}

function main(argv) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(`Web Design Studio — install the skill folders into your agent's skills directory

Usage:
  npx cinematic-scroll-skill [--skill <name>[,<name>]] [--dir <skills-dir>] [--list]

Default target: ~/.claude/skills (one folder per skill)
Skills: ${discoverSkills().map((skill) => skill.name).join(', ')}
`);
    return 0;
  }
  if (args.list) {
    for (const skill of discoverSkills()) console.log(`${skill.name} — ${skill.description}`);
    return 0;
  }
  const skillsDir = args.dir ? expandHome(args.dir) : join(homedir(), '.claude', 'skills');
  let installed;
  try {
    installed = installSkills({ skillsDir, only: args.only });
  } catch (error) {
    console.error(error.message);
    return 1;
  }
  for (const { name, target, replaced } of installed) {
    console.log(replaced ? `↻ replaced existing ${name} → ${target}` : `✓ ${name} → ${target}`);
  }
  console.log('\nNext: open a new agent session and ask, for example,\n  "Use cinematic-scroll to build a one-page story for my product."');
  return 0;
}

/** True when this file is the entry point, including through npm's bin symlink. */
function isMain() {
  try {
    return process.argv[1] !== undefined && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isMain()) process.exit(main(process.argv.slice(2)));
