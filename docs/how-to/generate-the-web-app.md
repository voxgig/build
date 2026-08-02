# How to generate the web app (EnvWeb)

*Diátaxis: how-to guide — activate EnvWeb and use its main capabilities:
themes, customisation hooks, and custom entity views.*

## Activate

In a Voxgig system project:

```bash
voxgig-system add env web     # declares web:{active:true} + auth/ent services
npm run model-build           # compiles the model and generates the app
```

Everything EnvWeb generates is **create-once**: your project owns the
files after generation; re-running never overwrites your edits (see the
[EnvWeb reference](../reference/envweb.md) for the two exceptions,
`views.js` and `theme.css`, which are regenerated from the model).

## Change the design theme

The theme lives in the model — `main: theme:` (scaffolded as
`model/theme.aontu`): a default `mode` plus named `modes` (e.g. `light`,
`dark`), each a set of design tokens (colors, font, radius, shadow).

1. Edit the tokens in `model/theme.aontu`.
2. `npm run model-build` — `web/src/theme.css` is regenerated: each mode's
   tokens become CSS variables (`--vg-<token>`) under
   `:root[data-theme-mode="<mode>"]`, the default mode also on `:root`.

The generated `theme.js` controller persists the user's mode choice and
the shell shows a mode toggle in the user menu whenever more than one mode
exists. To override a token for one project without touching the model,
set the variable in `web/src/custom.css`.

## Customise generated components (hooks)

Generated components expose named hook points; register handlers in the
create-once `web/src/customise.js`:

```js
import * as Hooks from './hooks.js'

// Inject HTML at a region.
Hooks.addHtml('shell:topbar:right', () => '<span class="vg-badge">Beta</span>')

// Transform data (items, columns, fields, save payloads).
Hooks.addFilter('admin:list:items', (items) => items.slice().reverse())

// Run behaviour after lifecycle moments.
Hooks.addAction('admin:list:after', ({ root, canon, items }) => { /* wire events */ })
```

CSS customisation goes in `web/src/custom.css` (imported by
`customise.js`); backend behaviour is customised with Seneca priors, the
message-level equivalent. The full list of hook points is in the
[EnvWeb reference](../reference/envweb.md#hook-points).

## Replace a generated view with a hand-coded one

Declare it in the model:

```
shop: product: ux: { view: 'custom' }
```

On the next `model-build`, EnvWeb generates a starter component at
`web/src/cmp/view/shop_product.js` (create-once — your edits survive) and
regenerates the `web/src/views.js` index. The shell then mounts
`<vg-view-shop-product>` instead of the generic `<vg-entity-admin>` for
that entity. The component contract: properties `canon`, `projectId`,
`detailId`, `onNavigate(canon, id)` and a `reload()` method.
