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

## Releasing (ci/release.yml)

`ci/release.yml` publishes this package to npm when a version tag is
pushed. Also dormant, and deliberately so: a workflow that can publish
should be reviewed and given a token by a human, not switched on as a
side effect.

It exists because the local path — `npm run repo-publish` → `aql vault
exec --for=npm vxg:pub01 -- npm stage publish` — needs the `aql` vault
CLI **and** a logged-in npm session on whichever machine runs it.
Publishing from CI needs neither on any individual machine: the token
lives in the repository's secrets and a tag is the trigger. It also gets
npm **provenance** attestation, which a local publish does not.

### Activate

1. Create an npm **automation** token with publish rights on the
   `@voxgig` scope (automation tokens bypass 2FA, which CI needs).
2. Add it as a repository secret named `NPM_TOKEN`.
3. `git mv ci/release.yml .github/workflows/release.yml`

### Release

```bash
# bump package.json, commit
git tag v4.11.0
git push origin v4.11.0
```

Installs, builds, checks the committed `dist/` is current, tests, checks
the tag matches `package.json`, then publishes with provenance. Dry-run
it first from the Actions tab (*release → Run workflow*) — that path
packs and verifies without publishing and needs no token.

**4.11.0 is ready to go.** It builds clean, 16 tests pass, and
`npm publish --dry-run` packs 163 files / 107.6 kB. npm's latest is
4.4.0, which lacks the `EntShape` `Open()` fix — so a fresh
`create-system` scaffold against the registry still fails its model
build until this is published.
