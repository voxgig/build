# How to add a target environment

*Diátaxis: how-to guide — declare a deployment environment and generate
its artifacts.*

Environments are declared in the model under `main: env:` (scaffolded in
`model/env.aontu`), one entry per target:

```
local: { active: true }
aws:   { active: true, region: 'us-east-1', stage: 'dev' }
```

Add one with the CLI (or edit `env.aontu` directly):

```bash
voxgig-system add env docker
voxgig-system add env '{name:aws,region:"eu-west-1"}'
npm run model-build
```

For every **active** environment, `env_gen` (**EnvGen**) generates:

- `gen/env/<name>/` — deployment artifacts (regenerated every build), from
  the fragments under this package's `tm/env/<kind>/`.
- `src/env/<name>/` — a runtime entry (create-once; yours to edit).

Known kinds: `local`, `basic`, `docker`, `vm`, `aws`, `azure`,
`cloudflare`, and `web` (which is handled by
[EnvWeb](generate-the-web-app.md) rather than `tm/env/` fragments). An
unknown kind fails with the list of known kinds.

Environment fragments are project-shadowable like all templates — see
[Customise generation templates](customise-templates.md).
