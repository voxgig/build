/* Copyright © 2022-2026 Voxgig Ltd, MIT License. */

// EnvLambda: generation of the Lambda deployment templates, built on the
// jostraca templating library. The templates live in env/lambda/, one file
// per output for convenience:
//
//   env/lambda/srv_yml.ts      gen srv.yml    (Serverless function defs)
//   env/lambda/srv_handler.ts  handler source (one per lambda service)
//   env/lambda/res_yml.ts      gen res.yml    (queues, dynamo, IAM role)
//
// The output is byte-identical to the pre-jostraca (<= 3.1.0) generator;
// test/fixture pins this. All generators are async (jostraca generation is
// async); existing callers that did not await still work, as the writes
// complete before the process exits.

import { srv_yml } from './env/lambda/srv_yml'
import { srv_handler } from './env/lambda/srv_handler'
import { resources_yml } from './env/lambda/res_yml'


const EnvLambda = {
  srv_yml,
  srv_handler,
  resources_yml,
}


export {
  EnvLambda,
}
