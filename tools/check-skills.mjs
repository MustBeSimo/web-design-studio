#!/usr/bin/env node
/**
 * check-skills.mjs — validate every installable skill folder under skills/.
 *
 * Each folder is what `npx skills add`, ClawHub and the npm installer copy to a
 * user's machine, so it must be small, text-only and self-contained:
 *   - SKILL.md with frontmatter name == folder, a description, metadata.version == package.json
 *   - no `license:` frontmatter key (registries assign the license)
 *   - only .md .json .yaml .yml .toml .txt files (plus .clawhubignore), no symlinks
 *   - under 300,000 bytes
 *   - every relative markdown link resolves inside the folder
 *
 *   node tools/check-skills.mjs                      # validate skills/*
 *   node tools/check-skills.mjs --forbid-root-skill  # also fail when a root SKILL.md exists
 */
import { existsSync, readdirSync, readFileSync, statSync, realpathSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const TEXT_EXTENSIONS = new Set(['.md', '.json', '.yaml', '.yml', '.toml', '.txt']);
export const MAX_BYTES = 300_000;
export const ROOT_SKILL_ERROR = 'root SKILL.md must not exist (installer would treat the whole repo as one skill)';

function walk(dir, errors, base = dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      errors.push(`symbolic link is not allowed: ${relative(base, file)}`);
      return [];
    }
    return entry.isDirectory() ? walk(file, errors, base) : [file];
  });
}

function frontmatterOf(text) {
  return text.match(/^---\n([\s\S]*?)\n---/u)?.[1] ?? '';
}

/** Read only the direct version child of the top-level metadata block. */
function metadataVersion(frontmatter) {
  const lines = frontmatter.split('\n');
  const start = lines.findIndex((line) => /^metadata:[ \t]*(?:#.*)?$/.test(line));
  if (start === -1) return undefined;
  for (const line of lines.slice(start + 1)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    if (/^\S/.test(line)) break;
    const match = line.match(/^ {2}version:[ \t]*([^\n]+)$/);
    if (match) return match[1].trim();
  }
  return undefined;
}

/**
 * @param {string} dir absolute path of one skill folder
 * @param {{version: string}} options
 * @returns {string[]} errors; empty when valid
 */
export function validateSkillDir(dir, { version }) {
  const errors = [];
  const folder = basename(dir);
  const skillPath = join(dir, 'SKILL.md');
  if (!existsSync(skillPath)) return ['SKILL.md is missing'];

  const frontmatter = frontmatterOf(readFileSync(skillPath, 'utf8'));
  const name = frontmatter.match(/^name:\s*([^\n]+)$/mu)?.[1]?.trim();
  if (name !== folder) errors.push(`frontmatter name ${JSON.stringify(name)} must match folder ${folder}`);
  if (!/^description:\s*\S+/mu.test(frontmatter)) errors.push('frontmatter description is required');
  const found = metadataVersion(frontmatter);
  if (found !== version) errors.push(`frontmatter metadata.version ${JSON.stringify(found)} must match package.json ${version}`);
  if (/^license:/mu.test(frontmatter)) errors.push('remove the license: frontmatter key (ClawHub assigns MIT-0; the repository LICENSE governs)');

  const files = walk(dir, errors);
  let bytes = 0;
  for (const file of files) {
    bytes += statSync(file).size;
    if (!TEXT_EXTENSIONS.has(extname(file).toLowerCase()) && basename(file) !== '.clawhubignore') {
      errors.push(`non-text file: ${relative(dir, file)}`);
    }
  }
  if (bytes > MAX_BYTES) errors.push(`folder is ${bytes} bytes; limit is ${MAX_BYTES} bytes`);

  const folderRoot = resolve(dir);
  for (const file of files.filter((f) => f.endsWith('.md'))) {
    for (const match of readFileSync(file, 'utf8').matchAll(/\[[^\]]*\]\(([^)\s]+)\)/gu)) {
      const target = match[1].split('#')[0];
      if (!target || /^(?:https?:|mailto:)/u.test(target)) continue;
      const resolved = resolve(dirname(file), target);
      if (!(resolved === folderRoot || resolved.startsWith(`${folderRoot}/`))) {
        errors.push(`link leaves the skill folder: ${target} (in ${relative(dir, file)})`);
      } else if (!existsSync(resolved)) {
        errors.push(`missing local reference: ${target} (in ${relative(dir, file)})`);
      }
    }
  }
  return errors;
}

/**
 * @param {string} root repository root
 * @param {{version: string, forbidRootSkill?: boolean}} options
 * @returns {{skills: string[], errors: string[]}}
 */
export function validateCollection(root, { version, forbidRootSkill = false }) {
  const errors = [];
  const skills = [];
  if (forbidRootSkill && existsSync(join(root, 'SKILL.md'))) errors.push(ROOT_SKILL_ERROR);
  const skillsDir = join(root, 'skills');
  const entries = existsSync(skillsDir) ? readdirSync(skillsDir, { withFileTypes: true }) : [];
  for (const entry of entries.filter((e) => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    skills.push(entry.name);
    for (const error of validateSkillDir(join(skillsDir, entry.name), { version })) errors.push(`${entry.name}: ${error}`);
  }
  return { skills, errors };
}

function main(argv) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const { skills, errors } = validateCollection(root, { version, forbidRootSkill: argv.includes('--forbid-root-skill') });
  for (const name of skills) {
    if (errors.some((error) => error.startsWith(`${name}: `))) continue;
    const files = walk(join(root, 'skills', name), []);
    const bytes = files.reduce((sum, file) => sum + statSync(file).size, 0);
    console.log(`PASS ${name}: ${files.length} text files, ${(bytes / 1024).toFixed(1)} KiB, version ${version}`);
  }
  if (errors.length) {
    console.error(`FAIL skills\n- ${errors.join('\n- ')}`);
    return 1;
  }
  return 0;
}

/** True when invoked directly or through a bin symlink. */
function isMain() {
  try {
    return process.argv[1] !== undefined && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isMain()) {
  process.exit(main(process.argv.slice(2)));
}
