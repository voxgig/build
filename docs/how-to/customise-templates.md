# How to customise generation templates

*Diátaxis: how-to guide — steps to change what `@voxgig/build` generates
for your project, without forking the package.*

Templates are jostraca-style text **fragments** (`*.frag` files with
`$$slot$$` placeholders) shipped under this package's `tm/` folder. They
resolve in layers — first hit wins:

1. `backend/src/gen/<name>.ts` — compiled generator override (deep custom)
2. `backend/tm/<area>/<frag>` — project fragment (text-level custom)
3. `@voxgig/build` package defaults

## Override a fragment (text-level)

Use the `voxgig-system` CLI from your project:

```bash
voxgig-system template list                  # every template + providing layer
voxgig-system template eject srv.yml.frag    # copy fragment -> backend/tm/lambda/
```

Edit the ejected copy, then re-run `npm run model-build`. No compile step —
fragments are plain text.

Ejecting records provenance in `tm/<area>/.ejected.json`, so after
upgrading `@voxgig/build` you can check for upstream changes:

```bash
voxgig-system template diff
```

## Override a generator (code-level)

```bash
voxgig-system template eject srv_yml --code   # copy generator -> backend/src/gen/
```

The copy imports its building blocks (`generate`, `TM`, shapes, ...) from
`@voxgig/build`'s public API, so your project owns the generator from then
on. After editing: `npm run build && npm run model-build`.

## EnvWeb fragments

EnvWeb templates live under `tm/web/` and shadow the same way: place a
project copy under `backend/tm/web/<same relative path>` and it wins.
Note that all EnvWeb *output* is **create-once** — see
[EnvWeb reference](../reference/envweb.md) — so editing the generated file
directly is also a supported form of customisation; a changed fragment
only affects files that do not exist yet (or a forced regen).
