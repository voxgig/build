# Agent guide: @voxgig/build

Code generation for Voxgig system projects (EnvLambda deployment
templates, EnvGen environments, EnvWeb model-driven web app). Read
[README.md](README.md) and [docs/](docs/) (Diátaxis) for concepts; this
file is operational guidance.

## Commands

```bash
npm run build   # tsc -> dist/
npm test        # jest (test/*.test.ts)
```

## Layout

- `build.ts` — the public API (`EnvLambda`, `EnvGen`, `EnvWeb`,
  `Fragments`, ejected-template building blocks).
- `env/lambda/` — Lambda generators; `env/env_gen.ts` — environment
  artifacts; `env/web/web_gen.ts` — the web app generator (`WEB_FILES`
  manifest); `doc/doc_gen.ts` — model-driven docs (mermaid ERD /
  message-flow / system-map + per-service READMEs; regenerated,
  content-diffed, AUTO-GENERATED headers).
- `shape/` — Gubu validators for model input.
- `tm/` — jostraca text fragments (`*.frag`, `$$slot$$` placeholders):
  `tm/lambda/`, `tm/env/<kind>/`, `tm/web/`.
- `test/fixture/` — pinned generator output (byte-exact).

## Hard rules

- **`dist/` is committed.** Always `npm run build` before committing;
  never edit `dist/` by hand. A stale `dist/` silently ships old behavior
  to projects that overlay this package.
- **Generator output is pinned byte-exact** by `test/fixture`. If an
  intentional output change fails tests, refresh the fixtures and say so
  in the commit.
- **EnvWeb is create-once.** Everything in `WEB_FILES` skips existing
  files unless `force`. Only `views.js` and `theme.css` are regenerated,
  and both must stay content-diffed (a no-op `web_gen` run must report
  nothing created — a test depends on it).
- **Fragment/app parity.** The `tm/web/` fragments are the source for the
  reference app at `metsitaba/todo-app`; when changing either, keep them
  byte-identical (modulo `$$slot$$` substitution and `loadFragment`'s
  single trailing-newline strip) and verify by regenerating with
  `web_gen(model, { root: tmpdir, force: true })` and diffing.
- `loadFragment` strips exactly one trailing newline — fragments end with
  a blank line so output ends with a newline.

## Model gotchas (recur constantly)

- A relationship field is `kind: String` plus a `ref: 'zone/name'`
  attribute — `kind: 'Ref'` is NOT a gubu type and breaks validation.
  Ref fields usually need `valid: Skip` or they become required.
- `EntShape` is `Open()` — entities may carry extra attributes (`ux`,
  `ref`); do not close it.
- Aontu import semantics: `main: theme: @"theme.aontu"` places the FILE's
  top-level content AT `main.theme` — the imported file must NOT re-wrap
  itself in `main: theme:`.
- Aontu/jsonic comments are `#` only; quote values containing `-`, `/`,
  or `#`.
