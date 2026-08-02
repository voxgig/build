# Reference: public API

*Diátaxis: reference — the package's exported surface. Import from
`@voxgig/build` (main: `dist/build.js`; source of truth: `build.ts`).*

## Generator groups

### `EnvLambda`

AWS Lambda deployment templates. All generators are async.

| Member | Generates |
|---|---|
| `srv_yml(model, spec)` | `gen/env/aws/srv.yml` — Serverless function defs, one per lambda-active service |
| `srv_handler(model, spec)` | `src/handler/lambda/<srv>.ts` — one handler per service |
| `resources_yml(model, spec)` | `gen/env/aws/res.yml` — queues, DynamoDB tables, IAM role |

Output is byte-identical to the pre-jostraca (`<= 3.1.0`) generator,
pinned by `test/fixture`.

### `EnvGen`

Per-environment artifacts from `main: env:` declarations.

| Member | Description |
|---|---|
| `env_gen(model, spec)` | Generate `gen/env/<name>/` (regenerated) + `src/env/<name>/` (create-once) for each active env |
| `files` | `ENV_FILES` — kind → fragment/output manifest |
| `srcfiles` | `ENV_SRC` — create-once runtime entries per kind |
| `kinds` | Known kinds: `local`, `basic`, `docker`, `vm`, `aws`, `azure`, `cloudflare`, `web` |

### `EnvWeb`

The model-driven web app. See the [EnvWeb reference](envweb.md).

| Member | Description |
|---|---|
| `web_gen(model, spec)` | Generate the SPA + backend web pieces. `spec: { root, tm?, env?, force? }`. Returns `{ created, skipped }` (sorted paths) |
| `files` | `WEB_FILES` — fragment → output manifest |

### `Docs`

Model-driven documentation, regenerated every model-build (all outputs
are pure functions of the model; marked AUTO-GENERATED).

| Member | Description |
|---|---|
| `doc_gen(model, spec)` | Generate `docs/reference/entities.md` (mermaid ER diagram from `ref` fields), `docs/reference/messages.md` (per-service message tables + flow diagram), `docs/reference/system-map.md` (architecture + dependency map), and a `README.md` per implemented service under `backend/src/srv/<srv>/`. `spec: { root, srvfolder? }`; returns `{ created }` (content-diffed) |

### `Api`

The strict-JSON REST API (model `main.api`), regenerated every
model-build.

| Member | Description |
|---|---|
| `api_gen(model, spec)` | Generate `backend/gen/api/openapi.json` (OpenAPI 3.1; schemas from entity field definitions, uniform `list_<zone>_<name>`-style operation ids for SDK generation) and `backend/src/srv/api/valid_gen.ts` (closed gubu request-validation shapes per exposed entity: create = required fields enforced, update = partial). `spec: { root }`; no-op unless the model declares `main.api`. Exposure: app entities by default, never the sys zone, per-entity overrides under `main.api.ent` |

### `Fragments`

Fragment tooling (used by `voxgig-system template list/eject/diff`).

| Member | Description |
|---|---|
| `load(frag, spec, area)` | Load a fragment, resolving project shadowing (`spec.tm` first, then the package). Strips one trailing newline |
| `render(text, slots)` | Substitute `$$slot$$` placeholders |
| `list()` | Enumerate available fragments |
| `folder` | `PKG_TM` — the package's `tm/` folder path |

## Building blocks

Exported for ejected project generators (`voxgig-system template eject
<name> --code` rewires the copy to these):

`generate`, `empty`, `TM`, `loadFragment`, `renderFragment`,
`MsgMetaShape`, `CoreConfShape`, `CloudConfShape`, `res_dynamo_yml`.

## Shapes (`shape/`)

[Gubu](https://github.com/gubujs/gubu) validators applied to model input:

| Shape | Validates |
|---|---|
| `CoreConfShape` | `main.conf.core` (name, short, token) |
| `CloudConfShape` | cloud/deployment config |
| `MsgMetaShape` | message metadata |
| `EntShape` (`shape/ent.ts`, internal) | entity definitions. Wrapped in `Open()`, so entities may carry extension attributes (e.g. `ux: { view: 'custom' }`) beyond the validated core |
