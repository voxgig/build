# Tutorial: from model to generated app

*Diátaxis: tutorial — a hands-on lesson. You will create a project, declare
a model, and watch `@voxgig/build` generate a deployable backend and a
working web app from it.*

`@voxgig/build` is almost always used indirectly, through a project
created with `@voxgig/create-system`. This tutorial takes that path.

## 1. Create a project

```bash
npm create @voxgig/system my-app
cd my-app/backend
npm install
```

The project is empty but complete: model sources in `model/`, generation
actions in `build/`, a local runner, and green starter tests.

## 2. Declare an entity

```bash
npx voxgig-system add entity 'shop/product'
npx voxgig-system add field shop/product title 'price:Number'
```

This appends jsonic blocks to `model/ent.aontu`. Now compile the model and
run generation:

```bash
npm run model-build
```

`voxgig-model` unifies the `.aontu` sources into `model/model.json`, then
runs the generation actions (declared in
`model/.model-config/model-config.aontu`, scripts in `build/`), which call
into `@voxgig/build`:

- `srv_yml` / `srv_handler` / `res_yml` (**EnvLambda**) emit
  `gen/env/aws/srv.yml`, one Lambda handler per service under
  `src/handler/lambda/`, and `gen/env/aws/res.yml`.
- `env_gen` (**EnvGen**) emits per-environment artifacts under
  `gen/env/<name>/` for every active `main: env:` entry.

## 3. Generate the web app

```bash
npx voxgig-system add env web
npm run model-build
```

The `web` environment activates **EnvWeb**, which generates (create-once):

- `web/` — a complete SPA: public marketing page, login form, an
  enterprise app shell (top bar with project selector and user menu,
  collapsible entity menu), generic CRUD for *every* entity in your model
  with relationship navigation, settings and change-password screens.
- `backend/src/env/web/web.ts` — an Express + gateway runner serving the
  SPA and the Seneca message API.
- `backend/src/srv/auth/`, `backend/src/srv/ent/` — the auth service and
  the generic, membership-scoped entity service.
- `web/src/theme.css` — CSS design tokens generated from the model's
  `main: theme:` (light and dark modes out of the box).

Run it:

```bash
npm run build
npm run web
```

Open the printed URL, sign in with a seeded user, and you have a working
enterprise app for the model you just declared. Add another entity, re-run
`npm run model-build`, reload — the UI adapts at runtime; no per-entity
code is generated.

## Where to next

- Change how files are generated: [Customise generation templates](how-to/customise-templates.md)
- Understand what EnvWeb produced: [EnvWeb reference](reference/envweb.md)
- Understand why it works this way: [Design](explanation/design.md)
