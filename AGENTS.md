# Agent guide: @voxgig/build

Code generation for Voxgig system projects (EnvLambda deployment
templates, EnvGen environments, EnvWeb model-driven web app). Read
[README.md](README.md) and [docs/](docs/) (Diátaxis) for concepts; this
file is operational guidance.

## Commands

```bash
npm run build   # tsc -> dist/ + dist-test/ (tests)
npm test        # node:test + coverage thresholds (test/*.test.ts)
```

## Layout

- `build.ts` — the public API (`EnvLambda`, `EnvGen`, `EnvWeb`,
  `Fragments`, ejected-template building blocks).
- `env/lambda/` — Lambda generators; `env/env_gen.ts` — environment
  artifacts; `env/web/web_gen.ts` — the web app generator (`WEB_FILES`
  manifest); `doc/doc_gen.ts` — model-driven docs (mermaid ERD /
  message-flow / system-map + per-service READMEs; regenerated,
  content-diffed, AUTO-GENERATED headers); `api/api_gen.ts` — REST API
  artifacts (OpenAPI spec from entity fields + valid_gen.ts request
  shapes; same regeneration rules).
- `shape/` — Gubu validators for model input.
- `tm/` — jostraca text fragments (`*.frag`, `$$slot$$` placeholders):
  `tm/lambda/`, `tm/env/<kind>/`, `tm/web/`.
- `test/fixture/` — pinned generator output (byte-exact).
- `STYLE-GUIDE.md`, `.vale.ini`, `.vale/`, `tools/check_prose.py` — the
  prose gate over the reader-facing pages (see below).

## Hard rules

- **`dist/` is committed.** Always `npm run build` before committing;
  never edit `dist/` by hand. A stale `dist/` silently ships old behavior
  to projects that overlay this package.
- **Generator output is pinned byte-exact** by `test/fixture`. If an
  intentional output change fails tests, refresh the fixtures and say so
  in the commit.
- **The generated code's `@voxgig/system` floor is undeclared, so mind it
  by hand.** This package has no dependency on `@voxgig/system` — the code
  it EMITS imports one, and the project's own `package.json` supplies it.
  Nothing checks the two agree. Every env entry now calls
  `context(seneca, Model, Pkg, { env })`, which needs
  **`@voxgig/system` >= 1.12.0**; a project on an older one fails to
  compile with `'context' is not exported`. Raise this note whenever a
  fragment starts using a newer export.
- **The browser surface is `aim:web` only.** The generated gateway
  allow-list must stay the literal `{ 'aim:web': true }`; browser
  operations are added as model-declared `aim:web` proxies (`web_*`
  actions), never by widening the list. A pinned assertion in
  `test/envlambda.test.ts` and the generated
  `backend/test/unit/env/web/surface.test.ts` both guard it.
- **EnvWeb is create-once.** Everything in `WEB_FILES` skips existing
  files unless `force`. Only `views.js` and `theme.css` are regenerated,
  and both must stay content-diffed (a no-op `web_gen` run must report
  nothing created — a test depends on it).
- **Fragment/app parity.** The `tm/web/` fragments are the source for the
  reference app at `metsitaba/todo-app`; when changing either, keep them
  byte-identical (modulo `$$slot$$` substitution and `loadFragment`'s
  single trailing-newline strip) and verify by regenerating with
  `web_gen(model, { root: tmpdir, force: true })` and diffing.
- `loadFragment` strips exactly one trailing newline, so **every fragment
  in `WEB_FILES` ends with a blank line** — otherwise the file it
  generates has no trailing newline and can never be byte-identical to
  the reference app. All 81 now do; keep it that way when adding one.
  (Fragments used as embedded *slots* rather than whole files — the
  `tm/lambda/res.*.yml` pieces — deliberately do not: there the strip is
  what keeps the surrounding indentation intact.)
  A whole-tree parity sweep is the check worth running after a fragment
  change: regenerate with `web_gen({ force: true })` into a tmpdir and
  compare every file against the reference app. Expect exact matches
  everywhere except the create-once files the project owns and has
  customised (`seed.ts`, `env/web/web.ts`, `web/package.json`,
  `playwright.config.js`, `cmp/view/*.js`, `custom.css`, `customise.js`).
- **Entity access control is `@seneca/owner`, not hand-written checks.**
  The generated `srv/ent/*` actions resolve the ownership axes
  (`owner_id`, `project_id`) onto `custom.sysowner` and let the entity
  layer decide; they do not filter rows. Two consequences:
  - The generated `access.ts` imports `base` from `env/shared/basic`,
    which `@voxgig/create-system` generates — so `web_gen` output needs a
    scaffold whose `basic.ts` configures the `owner` options. An older
    scaffold fails loudly at startup on `base.options.owner.fields`;
    regenerate `basic.ts`. The import is deliberate: a duplicated field
    list here would drift silently, and drift means an ownership field
    that never gets stripped from client input.
  - A tenant is only ever taken from a **stored** row on update, never
    from the payload. Taking it from the payload lets a caller name a
    project they do belong to, pass the membership check, and have owner
    refine the query by that same project — overwriting another
    project's row.

## Prose follows STYLE-GUIDE.md

[`STYLE-GUIDE.md`](STYLE-GUIDE.md) is normative for the reader-facing pages:
the root `README.md` and every page under `docs/`. Two gates enforce it and
both run in CI (`.github/workflows/docs.yml`):

| Gate | Checks |
|---|---|
| `vale --minAlertLevel=error $(python3 tools/check_prose.py --files)` | Google's rules plus the banned list, at the levels in `.vale.ini` |
| `python3 tools/check_prose.py` | the banned list across line wraps, em-dash spacing and ration, first person, no emoji, no citations of a working document, resolving relative links, a complete page set |

`npm run scan-prose` runs the second locally; run Vale by hand where it is
installed. Neither is chained into `npm test`, because the test matrix
includes Windows. The banned list is
`.vale/styles/config/vocabularies/Build/reject.txt`, read by both gates.
The page set is the configuration block at the top of
`tools/check_prose.py`; a new documentation page must be reachable from it
or neither gate reads it. `ci/README.md` and `ci/COVERAGE.md` are working
documents, not pages.

Three things trip agents most often: a page must not name or link
`AGENTS.md`, `CLAUDE.md` or `COVERAGE.md` (state the fact instead, and
describe a generated `AGENTS.md` as an agent guide); the em dash is spaced
(` — `) and rationed to one aside per line; and a word Vale's dictionary
does not know goes into `accept.txt` one entry at a time, never as a suffix
pattern.

## Message declarations: two shapes

`main.msg` has two shapes and everything here reads both:

```
# legacy CHAIN - the nesting IS the pattern, '$' escapes the leaf
aim: web: { save: item: { '$': { file: './web_save_item' } } }

# DECLARED (@voxgig/model 11) - a LIST of definitions, the pattern as data
main: msg: [
  { pat: [ {aim: todo}, {save: item} ] }
  { pat: [ {aim: web}, {on: todo}, {save: item} ], file: "./web_save_item" }
]
```

**A LIST, not a map keyed by message name.** A gateway proxy and the message
it forwards to necessarily share their last pattern pair, so any key derived
from that pair would collide and the two could not both be declared — which is
exactly the pair above. A list has no key.

- **Read messages through `util.ts`, never `dive()`.** `msgentries` is a
  drop-in for `dive()` over a message tree — same entries, same `'$'`
  handling, same even-length pair paths that `pinify` and the queue-name
  builders assume — plus a branch for a definition list. Fed a definition,
  `dive()` walks the METADATA and emits one entry per scalar field.
- `aimmsgs(msg, name)` selects a service's messages **by pattern**, not by
  indexing `main.msg.aim[name]`: a definition is an element of `main.msg`, not
  a node under `main.msg.aim`. `msgindex(msg)` keys metadata by pattern path,
  for looking a message up from a service's `out` list.
- The action file is unchanged: the last pattern pair, or `file` when
  declared. `MsgMetaShape` sees a definition with `pat` already stripped (it is
  the pattern, not metadata) and declares the flat fields as `Skip`.

Still chain-only: `web.allow`-driven proxy generation and per-message
`api.active` (see voxgig/build#17). Nothing reads `$.allow` or a per-message
`api` today — the gateway allow-list is the hard literal in `web.ts.frag`, and
widening it is a hard rule above.


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
