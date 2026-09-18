/* Copyright © 2022-2026 Voxgig Ltd, MIT License. */


import { srv_yml } from './env/lambda/srv_yml'
import { srv_handler } from './env/lambda/srv_handler'
import { resources_yml } from './env/lambda/res_yml'

import { env_gen, ENV_FILES, ENV_SRC, KINDS as ENV_KINDS } from './env/env_gen'
import { web_gen, WEB_FILES } from './env/web/web_gen'
import { doc_gen } from './doc/doc_gen'
import { api_gen } from './api/api_gen'

import {
  generate, empty, TM,
  loadFragment, renderFragment, listFragments, PKG_TM,
} from './env/lambda/generate'

import { MsgMetaShape } from './shape/msg'
import { CoreConfShape, CloudConfShape } from './shape/conf'
import { res_dynamo_yml } from './yml/res_dynamo_yml'


const EnvLambda = {
  srv_yml,
  srv_handler,
  resources_yml,
}


const EnvGen = {
  env_gen,
  files: ENV_FILES,
  srcfiles: ENV_SRC,
  kinds: [...ENV_KINDS, 'web'],
}


const EnvWeb = {
  web_gen,
  files: WEB_FILES,
}


const Docs = {
  doc_gen,
}


// Api: the strict-JSON REST API (model main.api) - OpenAPI spec from the
// entity field definitions + generated request-validation shapes. See
// api/api_gen.ts.
const Api = {
  api_gen,
}


const Fragments = {
  load: loadFragment,
  render: renderFragment,
  list: listFragments,
  folder: PKG_TM,
}


export {
  EnvLambda,
  EnvGen,
  EnvWeb,
  Docs,
  Api,
  Fragments,

  // Building blocks for ejected project templates (src/gen/<name>.ts
  // copies import these from '@voxgig/build' instead of package
  // internals - see voxgig-system template eject --code).
  generate,
  empty,
  TM,
  loadFragment,
  renderFragment,
  MsgMetaShape,
  CoreConfShape,
  CloudConfShape,
  res_dynamo_yml,
}
