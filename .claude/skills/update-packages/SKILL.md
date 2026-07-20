---
name: update-packages
description: "Audit and upgrade this project's pnpm dependencies, with special handling for vinext (young/fast-moving Cloudflare framework — check its GitHub releases for breaking changes before bumping majors). Use when user asks to update, upgrade, bump, or maintain packages/dependencies."
trigger: /update-packages
---

# /update-packages

Keep this project's dependencies current without silently breaking `vinext dev`/`build`/`deploy`.

## Why this exists

`vinext` is pre-1.0 and moves fast (breaking changes even across beta.N bumps: type export renames, new required peer deps, tsconfig/next-env.d.ts shape changes). Blind `pnpm update` on this dep needs a check, not just a bump.

## Steps

1. **Survey.** Run `pnpm outdated`. Split results into:
   - patch/minor, non-framework (radix, react, recharts, tailwind, eslint, etc.) — safe, batch these.
   - majors on leaf deps (e.g. lucide-react 0→1) — check changelog for renamed exports before bumping.
   - `vinext` itself — always treat as its own step regardless of semver delta.

2. **Check vinext specifically before bumping.**
   - `npm view vinext dist-tags` — note what `latest` actually points to (may be a beta).
   - `npm view vinext@<target> peerDependencies peerDependenciesMeta` — diff against current `package.json` devDependencies. New non-optional peers (e.g. `@vitejs/plugin-react`) must be added.
   - Fetch release notes: `https://raw.githubusercontent.com/cloudflare/vinext/main/README.md` or GitHub releases page — look for: config type renames (`VinextConfig`→`NextConfig` happened once already), Vite major version requirement bumps, `next-env.d.ts` / types-package changes.
   - If the jump is a major version or crosses a beta boundary, use `AskUserQuestion` to confirm scope (safe-only vs. full major bump) before editing `package.json` — do not silently take a big-bang major.

3. **Edit `package.json`** with the agreed versions (dependencies + devDependencies).

4. **Install.** This shell has no TTY, so plain `pnpm install` will hang/abort on the modules-purge confirm and on lockfile mismatch. Use:
   ```
   CI=true pnpm install --no-frozen-lockfile
   ```

5. **Approve native build scripts.** pnpm blocks postinstall scripts by default now. If install warns `Ignored build scripts: esbuild, sharp, workerd` (or similar), add/update in `package.json`:
   ```json
   "pnpm": { "onlyBuiltDependencies": ["esbuild", "sharp", "workerd"] }
   ```
   then re-run the install command above so the scripts actually execute.

6. **Regenerate generated files if wrangler bumped:**
   ```
   pnpm cf-typegen
   ```
   (regenerates `worker-configuration.d.ts` — stale copies cause `Fetcher`/`Env` type errors in `worker/index.ts`.)

7. **Typecheck.** `npx tsc --noEmit`. Fix errors surfaced by the bump itself (not pre-existing unrelated ones) — e.g. renamed type exports, stricter inference in a new TS major. Prefer minimal explicit annotations/casts over `any`.

8. **Lint.** `pnpm lint`.

9. **Build.** `pnpm build`. A vinext major bump changes generated `next-env.d.ts` — let the build tool regenerate it rather than hand-editing (only hand-write the interim `/// <reference types="vinext/types" />` if `tsc` needs it *before* the first build).

10. **Smoke test.** Start `pnpm dev` in the background, hit `http://localhost:3000/` via the Chrome tools (curl won't execute client JS, so it can't confirm hydration). A `500` on the very first request right after a fresh install is usually cold-start dep re-optimization (`Re-optimizing dependencies because lockfile has changed` in the log) — refresh once before treating it as a real failure. Check `read_console_messages` for client errors. Kill the dev server (`netstat -ano | grep ":3000.*LISTENING"` → `taskkill //PID <pid> //F`) when done.

11. **Report.** Summarize: what moved (old→new), which majors were taken and why safe, any manual fixes applied and where (file:line), anything left on a beta/pre-release tag worth revisiting later.

## Non-goals

- Don't add abstractions, config toggles, or "future-proofing" while doing this — it's a version bump + minimal compat fixes, nothing else.
- Don't take a vinext major without asking first — it's the one dependency in this stack that can silently change the dev/build/deploy contract.
