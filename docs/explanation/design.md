# Explanation: design

*Diátaxis: explanation — why `@voxgig/build` works the way it does.*

## The model is the single source of truth

A Voxgig system is described once, in the
[voxgig-model](https://github.com/voxgig/model) `.aontu` sources: entities
and their fields, services, messages, environments, and (since 4.6.0) the
design theme. Everything else — deployment templates, handlers, the web
app, CSS design tokens — is *derived* from the compiled `model.json`. That
is why generation runs as part of `model-build`: when the model changes,
the derived artifacts follow.

## Generate-once vs. regenerate

Two different kinds of output need two different ownership rules:

- **Deployment artifacts** (`gen/env/...`) encode no human decisions —
  they are regenerated every build and should never be hand-edited.
- **Application code** (the EnvWeb SPA, runtime env entries, seed data,
  custom views) is a *starting point* that developers take over. These are
  create-once: generation skips existing files, so hand edits are safe.
  The cost is that framework updates don't flow into existing files
  automatically — the escape hatches are `force` regeneration and
  `voxgig-system template diff`.

Two EnvWeb files sit in between — `views.js` and `theme.css` are pure
functions of the model, carry no hand edits by design, and are therefore
regenerated (content-diffed to avoid needless writes).

## Runtime model-driven UI, not per-entity codegen

EnvWeb deliberately does **not** generate a component per entity. The SPA
fetches `model.json` at runtime and derives everything from it: the entity
menu, list columns, forms, relationship pickers and drill-down (from `ref`
fields), project scoping. This is what lets one generated codebase handle
an entity graph of hundreds of entities — and adapt to model changes with
just a reload, without regeneration churn or merge conflicts in generated
UI code.

Where the generic UI is not enough, the model can opt an entity out
(`ux: { view: 'custom' }`) and a hand-coded component takes over — the
same runtime contract, different implementation.

## Customisation is layered, not forked

The customisation story mirrors the backend's Seneca priors (override an
action without editing it) in the frontend:

1. **CSS tokens** — the theme defines variables; `custom.css` overrides
   them.
2. **Hooks** — named html/filter/action points let a project inject or
   transform without touching generated components.
3. **Custom views** — replace a whole entity view.
4. **Fragment shadowing / eject** — change what gets generated in the
   first place.

Each layer is chosen so that upgrading the framework invalidates as little
project work as possible.

## Templates as fragments

Generators are thin TypeScript functions over plain-text fragments
(`tm/**/*.frag`, `$$slot$$` substitution via jostraca). Fragments keep the
generated output reviewable (what you read in `tm/` is what lands in the
project), diffable across versions, and shadowable per project without a
compile step.
