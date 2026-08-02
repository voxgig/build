# CI workflow (dormant)

GitHub only runs workflows found under `.github/workflows/`. This lives in
`ci/`, so it is **inert** until deliberately activated.

## Activate

```bash
mkdir -p .github/workflows
git mv ci/ci.yml .github/workflows/ci.yml
git commit -m 'ci: activate workflow'
```

## What runs

`npm ci` → `npm run build` → committed-`dist/` check → `npm test`, on every
push and pull request.

The coverage gate is the one already in `npm test`: lines 95%, functions
85%, branches 78%. Coverage uploads as an `lcov` artifact.

The `dist is committed and current` step matters more here than in a normal
package: `dist/` is committed and projects overlay this package, so a stale
`dist/` silently ships old behaviour to every downstream project. The step
fails if `npm run build` produces any diff under `dist/`.

## Will it pass today?

Yes. Every dependency is published; nothing needs credentials or secrets.

## Not covered by this workflow

**Fragment/app parity.** `tm/web/` is the source for the reference app at
`metsitaba/todo-app`, and AGENTS.md requires the two stay byte-identical.
Nothing here checks that, because it needs the other repo checked out.
It is currently verified by hand:

```js
web_gen(model, { root: tmpdir, force: true })   // then diff against the app
```

Automating it means a job that checks out both repos and diffs the
generated tree, expecting matches everywhere except the create-once files
a project owns (`seed.ts`, `env/web/web.ts`, `web/package.json`,
`playwright.config.js`, `cmp/view/*.js`, `custom.css`, `customise.js`).
Worth adding — it is the invariant most likely to rot silently.
