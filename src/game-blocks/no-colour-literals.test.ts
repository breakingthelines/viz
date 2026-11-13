import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Blocks never decide a colour: every colour comes from the skin (contract
 * section 4.1). This fails on a hex, `rgb(` or `rgba(` literal in any block or
 * part, stories included, so a replacement skin restyles every block.
 */

const ROOT = join(import.meta.dirname, '.');
const GUARDED = ['player', 'team', 'league', 'match', 'parts'];
const LITERAL = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/;

function files(dir: string): string[] {
  let out: string[] = [];
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of names) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out = out.concat(files(path));
    else if (/\.(ts|tsx|css)$/.test(name)) out.push(path);
  }
  return out;
}

describe('game blocks take colours from the skin only', () => {
  it('has guarded folders to scan', () => {
    expect(files(join(ROOT, 'player')).length).toBeGreaterThan(0);
  });

  it('has no colour literal outside skin/', () => {
    const offenders: string[] = [];
    for (const dir of GUARDED) {
      for (const file of files(join(ROOT, dir))) {
        readFileSync(file, 'utf8')
          .split('\n')
          .forEach((line, i) => {
            if (LITERAL.test(line))
              offenders.push(`${relative(ROOT, file)}:${i + 1}: ${line.trim()}`);
          });
      }
    }
    expect(offenders).toEqual([]);
  });

  it('catches a literal when one is there', () => {
    expect(LITERAL.test("color: '#eb0000'")).toBe(true);
    expect(LITERAL.test('fill: rgba(255, 255, 255, 0.5)')).toBe(true);
    expect(LITERAL.test('target: \'path[data-k="key"]\'')).toBe(false);
  });
});
