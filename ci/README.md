# CI

`ci.yml` is **active**, at `.github/workflows/ci.yml`. It ran dormant in
this folder while it was being built; it now runs on every push and pull
request. This folder keeps the notes, and `release.yml` — which stays
dormant on purpose, see below.

Verified before activation: build clean, `dist/` clean, 16/16 tests.

## What runs

`npm install` → `npm run build` → clean-`dist/` check → `npm test`, on
every push and pull request.

`npm install`, not `npm ci`: this repo **gitignores** `package-lock.json`
(`.gitignore:109`), and `npm ci` refuses to run without a committed
lockfile (`EUSAGE`). `cache: npm` is omitted for the same reason — it
hashes a lockfile that is not there.

The coverage gate is in `npm test`: lines 95%, functions 85%, branches
78%. That one script both enforces the gate and emits the `lcov` artifact
— deliberately not split into a separate `test-cov` copy of the same
threshold literals, which would drift the moment either side moved and
let a developer's local gate differ from CI's.

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

   `.github/workflows/` now exists (`ci.yml` lives there), so this move
   no longer needs a `mkdir` of its own.

### Release

```bash
# bump package.json, commit
git tag v4.11.0
git push origin v4.11.0
```

Installs, builds, checks `dist/` is clean (**including untracked files** —
`git diff` alone would miss a newly emitted file that `npm pack` then
ships), tests, checks the tag matches `package.json`, then publishes with
provenance under a dist-tag derived from the version: a prerelease like
`v4.12.0-rc1` goes to `next`, never `latest`. Dry-run
it first from the Actions tab (*release → Run workflow*) — that path
packs and verifies without publishing and needs no token.

**4.11.0 is ready to go.** It builds clean, 16 tests pass, and
`npm publish --dry-run` packs 163 files / 107.6 kB. npm's latest is
4.4.0, which lacks the `EntShape` `Open()` fix — so a fresh
`create-system` scaffold against the registry still fails its model
build until this is published.
