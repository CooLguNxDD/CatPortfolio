# Backend & Infrastructure Code Health Assessment

This document contains an exhaustive code health and refactoring assessment of the BACK-END, INFRASTRUCTURE, and PIPELINE codebase for the `CatPortfolio` repository (branch `Add-dynamic-builder-pipeline`).

---

## 1. Scripts (`scripts/`)

### `scripts/gen-layout.ts`
- **Priority:** Medium
- **Line Range:** ~58-61
- **Finding:** Fragile theme extraction using regex (`/^theme:\s*(\S+)\s*$/m`). This regex will fail or capture incorrectly if the user includes inline comments, uses string quotes (e.g., `theme: "cozy"`), or formats the YAML with unexpected whitespace.
- **Refactoring Solution:** Avoid regex for parsing structured formats. Use the `yaml` package (already imported) to parse the `existing` content, safely read the `theme` key, and fall back to the default if it doesn't exist or isn't a string.

- **Priority:** Medium
- **Line Range:** ~74, 84, 85
- **Finding:** Hardcoded reliance on `process.cwd()`. The script assumes it will always be executed from the project root. If executed from within the `scripts/` directory, path resolution for `design/layout.yaml` and `src/content/layout.json` will fail.
- **Refactoring Solution:** Use `resolve(import.meta.dirname, "..", "design/layout.yaml")` to construct paths relative to the script file rather than relying on the dynamic working directory.

### `scripts/compile-layout.ts`
- **Priority:** Medium
- **Line Range:** ~73-75
- **Finding:** Similar to `gen-layout.ts`, hardcoded reliance on `process.cwd()` for path resolution.
- **Refactoring Solution:** Refactor to use `import.meta.dirname` to robustly locate `design/`, `src/`, and `src/themes/` regardless of where the command is invoked.

- **Priority:** Low
- **Line Range:** ~106-113
- **Finding:** Fragile JSON equivalence check (`out !== committedJson`). Relying on strict string equality can lead to false positives in CI if `layout.json` is modified manually or by a formatter with slightly different whitespace, EOF newline handling, or key ordering.
- **Refactoring Solution:** Parse both `out` and `committedJson` to objects and use a deep equality check (e.g., Node's `assert.deepStrictEqual`), or ensure standard formatting during comparison by stringifying both parsed objects with strict `null, 2` spacing and identical newline endings.

### `scripts/sources-schema.ts`
- **Priority:** Low
- **Line Range:** ~13-17
- **Finding:** The GitHub ref regex (`/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/`) is overly permissive and might pass invalid formats.
- **Refactoring Solution:** Tighten the regex to match standard GitHub owner/repo constraints, or validate the parts explicitly, ensuring they don't start or end with invalid characters like periods or hyphens.

---

## 2. GitHub Actions Workflows (`.github/workflows/`)

### `portfolio-gen.yml`
- **Priority:** Medium
- **Line Range:** ~51-52
- **Finding:** Prompt Injection / Injection Risk. Interpolating `${{ github.event.inputs.brief || github.event.client_payload.brief }}` directly into the YAML string can lead to unexpected behavior if the input contains YAML-breaking characters or multi-line directives designed to manipulate the `claude-code-action` prompt structure.
- **Refactoring Solution:** Map the input variables to environment variables first (`env: BRIEF: ${{ ... }}`), and reference them in the prompt string, or carefully sanitize/quote the input before embedding it into the prompt.

### `deploy.yml`
- **Priority:** Low
- **Line Range:** ~28-29
- **Finding:** Implicit SPA fallback generation (`cp dist/index.html dist/404.html`) works well, but would fail if `index.html` is not produced (e.g. if the build step fails silently or output dir changes).
- **Refactoring Solution:** Add an existence check `test -f dist/index.html || exit 1` before copying, making the deployment fail fast rather than uploading a broken artifact.

---

## 3. Infrastructure & Docker

### `Dockerfile`
- **Priority:** Low
- **Line Range:** ~6-7
- **Finding:** `npm ci` installs all dependencies, including `devDependencies`. This is necessary for Vite to build the project, but there is no mechanism to clean up or use a slimmed-down context if any server-side Node execution is added later.
- **Refactoring Solution:** The current multi-stage build effectively discards the `builder` stage, keeping only static assets. It is resource-efficient as-is. However, using a `NODE_ENV=production` build argument could slightly optimize Vite's build process if Vite plugins check this environment variable.

### `nginx.conf`
- **Priority:** Low
- **Line Range:** ~31
- **Finding:** Missing modern MIME types in `gzip_types`.
- **Refactoring Solution:** Add `application/wasm`, `font/woff2`, and `image/x-icon` to `gzip_types` to improve compression coverage for common SPA assets.

---

## 4. Documentation & Contract Enforcement

### `CLAUDE.md`
- **Priority:** High
- **Line Range:** ~4, 38
- **Finding:** Accuracy vs Implementation drift. The document claims the project uses **React 19**, **Vite 8**, and **TypeScript 6**. At the time of this assessment, Vite 8 and TypeScript 6 do not exist (Vite is v6.x, TypeScript is v5.x). This could mislead generation agents relying on `CLAUDE.md` for context.
- **Refactoring Solution:** Correct the stated technology versions in `CLAUDE.md` to match the actual `package.json` lockfiles and real-world releases (e.g., Vite 6, TypeScript 5).

### `design/mirror-manifest.json` & `scripts/__tests__/mirror-drift.test.ts`
- **Priority:** Medium
- **Line Range:** (All)
- **Finding:** Excellent defensive enforcement of the cross-repo schema mirror. However, `mirror-drift.test.ts` uses synchronous file reads (`readFileSync`, `readdirSync`) which block the event loop. While fine for a test script, it's generally better practice in Node 22 to use async equivalents.
- **Refactoring Solution:** Convert test cases in `mirror-drift.test.ts` to be `async` and use `node:fs/promises` for file operations to improve test suite performance and strictly adhere to asynchronous I/O patterns.