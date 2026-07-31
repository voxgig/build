"use strict";
/* Copyright © 2022-2026 Voxgig Ltd, MIT License. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvLambda = void 0;
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
const srv_yml_1 = require("./env/lambda/srv_yml");
const srv_handler_1 = require("./env/lambda/srv_handler");
const res_yml_1 = require("./env/lambda/res_yml");
const EnvLambda = {
    srv_yml: srv_yml_1.srv_yml,
    srv_handler: srv_handler_1.srv_handler,
    resources_yml: res_yml_1.resources_yml,
};
exports.EnvLambda = EnvLambda;
//# sourceMappingURL=build.js.map