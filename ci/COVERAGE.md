# Coverage report

Measured 2026-08-02 on branch `claude/todo-app-review-docs-j12w1c`
(`npm run test-cov`). The gate lives in `package.json`, not here.

## Headline

| | lines | branches | functions |
|---|---|---|---|
| **measured** | **97.19%** | **80.29%** | **98.94%** |
| gate (fails below) | 95% | 78% | 85% |
| margin | +2.19 | **+2.29** | +13.94 |

16 tests, all passing.

Branches has the thinnest margin, and it is the dimension that matters
most for a code generator: nearly every branch here is "does the model
declare X?", so an uncovered branch is a model shape nothing exercises.

## Weakest files

| File | lines | branches | functions |
|---|---|---|---|
| `build.ts` | 87.74 | 100.00 | 100.00 |
| `generate.ts` | 88.39 | 81.82 | 100.00 |
| `conf.ts` | 92.31 | 100.00 | 100.00 |
| `res_dynamo_yml.ts` | 93.81 | **58.33** | 100.00 |
| `msg.ts` | 95.65 | 100.00 | 100.00 |
| `env_gen.ts` | 96.09 | 85.71 | 100.00 |
| `res_yml.ts` | 97.86 | **62.07** | 100.00 |
| `doc_gen.ts` | 98.85 | 81.82 | 100.00 |

The two worth noting are the AWS resource generators, `res_dynamo_yml.ts`
(58.33% branches) and `res_yml.ts` (62.07%). Their uncovered branches are
model-shape variations — table configurations and resource options no
fixture declares. Generator bugs of exactly that kind are what the
`/api/undefinedapiundefined` path bug was: output that is *wrong* rather
than *absent*, which no amount of "did it run" coverage detects.

`generate.ts` at 88.39% lines is the fragment loader, including
`loadFragment` — the trailing-newline handling this branch changed.

## What coverage does not measure here

This is a code generator, so "the line ran" is a weak signal. What
actually protects it:

- **`test/fixture/`** pins generator output byte-exact. That catches
  wrong output, which coverage cannot.
- **Fragment/app parity** with `metsitaba/todo-app` — currently verified
  by hand, not by CI. See `ci/README.md`.

A branch can be 100% covered and still emit garbage. Prefer adding a
fixture row over chasing a percentage.

## Note

Node reports only files it loaded. Unlike the reference app, no
significant unloaded file was found here — the suite exercises every
generator module. The figures describe the package.
