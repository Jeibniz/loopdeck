import { describe, it, expect } from 'vitest';
import { parseMd, setFrontmatter } from '../src/server/core/frontmatter.js';

const AGENT = `---
name: planner
description: Turn a goal into an ordered plan.
---

You turn a goal/spec into a concrete plan.

- bullet one
- bullet two
`;

describe('parseMd', () => {
  it('reads name + description and body', () => {
    const p = parseMd(AGENT);
    expect(p.hasFrontmatter).toBe(true);
    expect(p.name).toBe('planner');
    expect(p.description).toBe('Turn a goal into an ordered plan.');
    expect(p.body).toContain('You turn a goal/spec');
  });

  it('handles a file with no frontmatter', () => {
    const p = parseMd('# just markdown\n');
    expect(p.hasFrontmatter).toBe(false);
    expect(p.body).toBe('# just markdown\n');
  });
});

describe('setFrontmatter', () => {
  it('updates description and keeps the body byte-identical', () => {
    const before = parseMd(AGENT);
    const out = setFrontmatter(AGENT, before.name, 'A new description.');
    const after = parseMd(out);
    expect(after.name).toBe('planner');
    expect(after.description).toBe('A new description.');
    expect(after.body).toBe(before.body); // body untouched
  });

  it('updates name too', () => {
    const out = setFrontmatter(AGENT, 'replanner', 'desc');
    expect(parseMd(out).name).toBe('replanner');
  });

  it('throws when there is no frontmatter', () => {
    expect(() => setFrontmatter('# no fm\n', 'x', 'y')).toThrow();
  });
});
