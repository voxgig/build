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
