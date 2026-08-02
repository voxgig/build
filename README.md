# @voxgig/build

Code generation for Voxgig system projects. Reads the compiled
[voxgig-model](https://github.com/voxgig/model) (`model.json`) and generates
deployment artifacts and application code with the
[jostraca](https://github.com/jostraca/jostraca) templating library:

- **EnvLambda** — AWS Lambda deployment templates (Serverless function
  defs, per-service handlers, resources).
- **EnvGen** — per-environment deployment artifacts (`local`, `basic`,
  `docker`, `vm`, `aws`, `azure`, `cloudflare`, `web`) driven by the
  model's `main: env:` declarations.
- **EnvWeb** — a full model-driven enterprise web app: SPA frontend
  (public site, login, app shell, generic entity CRUD with relationship
  navigation, settings), backend web runner, auth + generic entity
  services, design themes, customisation hooks, and custom entity views.

Generation is normally driven by `npm run model-build` inside a project
created with `npm create @voxgig/system` — you rarely call this package
directly.

## Documentation

Organised by the [Diátaxis](https://diataxis.fr) framework:

- **Tutorial**: [From model to generated app](docs/tutorial.md)
- **How-to guides**:
  - [Customise generation templates](docs/how-to/customise-templates.md)
  - [Generate the web app (EnvWeb)](docs/how-to/generate-the-web-app.md)
  - [Add a target environment](docs/how-to/add-an-environment.md)
- **Reference**:
  - [Public API](docs/reference/api.md)
  - [EnvWeb: files, slots, model inputs](docs/reference/envweb.md)
- **Explanation**: [Design](docs/explanation/design.md)

Working on this repo with an AI agent? See [AGENTS.md](AGENTS.md).

## Develop

```bash
npm install
npm run build   # tsc -> dist/ (dist is committed; always rebuild before commit)
npm test        # jest
```

## License

MIT. Copyright (c) Voxgig Ltd.
