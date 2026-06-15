// Minimal line-level unified diff for the confirm modal. No dependency —
// files are tiny (a loops.yaml or a frontmatter block), so a straightforward
// LCS over lines is plenty. Output is unified-style with +/-/space prefixes.

function lcsLengths(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i]![j] = a[i] === b[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }
  return dp;
}

export interface DiffLine {
  type: 'add' | 'del' | 'ctx';
  text: string;
}

export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split('\n');
  const b = after.split('\n');
  const dp = lcsLengths(a, b);
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ type: 'ctx', text: a[i]! });
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      out.push({ type: 'del', text: a[i]! });
      i++;
    } else {
      out.push({ type: 'add', text: b[j]! });
      j++;
    }
  }
  while (i < a.length) out.push({ type: 'del', text: a[i++]! });
  while (j < b.length) out.push({ type: 'add', text: b[j++]! });
  return out;
}

/** Unified-style text: only changed lines plus a little context, marked +/-. */
export function unifiedDiff(before: string, after: string): string {
  return diffLines(before, after)
    .map((l) => (l.type === 'add' ? `+${l.text}` : l.type === 'del' ? `-${l.text}` : ` ${l.text}`))
    .join('\n');
}
