# Verification of the reports in this directory

The 5 reports in this directory (`CODE_HEALTH_*`, `DOC_GAPS_REPORT.md`) came from an
automated review fleet and were not checked against the source before landing here.
Three parallel read-only passes verified every claim against the actual code.

**Result: 4 of ~20 findings were real.** The rest describe code that doesn't exist,
or protections that already exist (guards, error boundaries, `useShallow`,
`.catch(undefined)`, hoisted vectors, `type="button"`, etc). Two real issues were
found during verification that the reports missed entirely.

Fixes for the real findings landed via branch `portfolio-gen/2026-08-28-review-fixes`.
See that PR for the fix-by-fix rationale. Verdict table:

| Claim | Verdict |
|---|---|
| SSRF via `octBaseUrl` (config.ts) | **TRUE** — fixed: origin allowlist added |
| XSS in `chart.tsx` CSS injection | FALSE — sanitizer already sound |
| XSS in `MermaidDiagram` | FALSE (mitigated) — `securityLevel: "strict"` already runs DOMPurify |
| Lazy blocks lack ErrorBoundary | FALSE — `LayoutRenderer` already wraps every block |
| Per-frame `THREE.Vector3` allocation | FALSE — cited lines are one-time setup, not the rAF loop |
| Zod `.optional()` needs `.catch()` | FALSE — `router.tsx` query schema already has it |
| Missing `type="button"` | FALSE — 15/15 buttons already have it; zero `<form>` exists |
| Missing `useShallow` | FALSE — already applied where needed |
| div/span `onClick` without keyboard support | FALSE — cited elements are real `<button>`s |
| Icon-only buttons missing `aria-label` | FALSE — already labeled |
| `localStorage` non-object crash | FALSE — already guarded, but only on version bump — **fixed**: `merge` now sanitizes every rehydrate |
| String fallback breaks downstream JSON consumers | FALSE — every consumer already type-guards |
| `useQuery` silent failure | FALSE — already surfaced via placeholder/offline pill; no boundary exists to catch `throwOnError` anyway |
| `sendTextRef` stale closure | FALSE — standard latest-ref pattern, reads are always post-commit |
| `ping()` missing timeout | PARTIAL — SDK defaults to 60s; zero callers exist — **fixed**: explicit 5s timeout added anyway |
| `loadLayout.ts` fetch duplication | TRUE — **fixed**: extracted `resolveBase()` helper |
| `useFocusTrap` missing try/catch | TRUE — **fixed**: wrapped |
| `ResizeObserver` leak / missed nodes | FALSE (leak) — already disconnects; missed-node gap only affects excluded bands |
| Doc gaps | PARTIAL — only `ui/card.tsx` (vendored shadcn) genuinely lacks docs; left as-is |

Found during verification, not in the original reports, also fixed:
- `BlockErrorBoundary` returned `null` on error — silently vanishing a failed lazy
  chunk instead of showing a retry affordance.
- `ui/button.tsx` set no default `type`, so a bare `<Button>` rendered
  `type="submit"`.
