export const meta = {
  name: 'review-panel',
  description:
    'Review the current branch diff across multiple lenses, adversarially verify each finding, and return a deduped, confidence-checked report',
  phases: [
    { title: 'Review', detail: 'parallel lens reviewers over the diff' },
    { title: 'Verify', detail: 'adversarial refute pass per finding' },
  ],
};

const FINDINGS_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          file: { type: 'string' },
          line: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'warning', 'info'] },
          detail: { type: 'string' },
          fix: { type: 'string' },
        },
        required: ['title', 'file', 'severity', 'detail'],
      },
    },
  },
  required: ['findings'],
};

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['confirmed', 'refuted', 'uncertain'] },
    confidence: { type: 'number' },
    reasoning: { type: 'string' },
  },
  required: ['verdict', 'reasoning'],
};

const base = (args && args.base) || 'origin/main';
const scope = `Review the diff of the current branch vs ${base} (run: git fetch && git diff ${base}...HEAD). Read surrounding code where the diff is ambiguous.`;

const LENSES = [
  {
    key: 'correctness',
    agentType: 'code-reviewer',
    prompt: `${scope}\nLens: CORRECTNESS & code quality — logic errors, edge cases, error paths, duplication, dead code.`,
  },
  {
    key: 'security',
    agentType: 'security-reviewer',
    prompt: `${scope}\nLens: SECURITY — injection, broken authz, secrets, missing input validation, unsafe data flows.`,
  },
  {
    key: 'design',
    agentType: 'web-design-reviewer',
    prompt: `${scope}\nLens: UI/DESIGN — only if the diff touches UI files; otherwise return an empty findings list. Component reuse, tokens, a11y, responsive, state coverage, i18n.`,
  },
];

phase('Review');
const reviewed = await pipeline(
  LENSES,
  (l) =>
    agent(l.prompt, {
      label: `review:${l.key}`,
      phase: 'Review',
      agentType: l.agentType,
      schema: FINDINGS_SCHEMA,
    }),
  (res, l) => {
    const findings = (res && res.findings) || [];
    return parallel(
      findings.map(
        (f) => () =>
          agent(
            `Adversarially verify this ${l.key} finding — try to REFUTE it. Default to 'refuted' if uncertain.\n` +
              `Finding: ${f.title}\nFile: ${f.file}:${f.line || '?'}\nDetail: ${f.detail}\n\n${scope}`,
            {
              label: `verify:${f.file}`,
              phase: 'Verify',
              agentType: 'verifier',
              schema: VERDICT_SCHEMA,
            },
          ).then((v) => ({ ...f, lens: l.key, verdict: v })),
      ),
    );
  },
);

const all = reviewed.flat().filter(Boolean);
const confirmed = all.filter((f) => f.verdict && f.verdict.verdict === 'confirmed');
const rank = { critical: 0, warning: 1, info: 2 };
confirmed.sort((a, b) => (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9));

log(
  `Reviewed ${all.length} raw findings; ${confirmed.length} survived adversarial verify, ${all.length - confirmed.length} dropped.`,
);
return { base, confirmed, droppedCount: all.length - confirmed.length };
