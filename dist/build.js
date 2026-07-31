"use strict";
/* Copyright © 2022-2026 Voxgig Ltd, MIT License. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.res_dynamo_yml = exports.CloudConfShape = exports.CoreConfShape = exports.MsgMetaShape = exports.renderFragment = exports.loadFragment = exports.TM = exports.empty = exports.generate = exports.Fragments = exports.EnvLambda = void 0;
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
const generate_1 = require("./env/lambda/generate");
Object.defineProperty(exports, "generate", { enumerable: true, get: function () { return generate_1.generate; } });
Object.defineProperty(exports, "empty", { enumerable: true, get: function () { return generate_1.empty; } });
Object.defineProperty(exports, "TM", { enumerable: true, get: function () { return generate_1.TM; } });
Object.defineProperty(exports, "loadFragment", { enumerable: true, get: function () { return generate_1.loadFragment; } });
Object.defineProperty(exports, "renderFragment", { enumerable: true, get: function () { return generate_1.renderFragment; } });
const msg_1 = require("./shape/msg");
Object.defineProperty(exports, "MsgMetaShape", { enumerable: true, get: function () { return msg_1.MsgMetaShape; } });
const conf_1 = require("./shape/conf");
Object.defineProperty(exports, "CoreConfShape", { enumerable: true, get: function () { return conf_1.CoreConfShape; } });
Object.defineProperty(exports, "CloudConfShape", { enumerable: true, get: function () { return conf_1.CloudConfShape; } });
const res_dynamo_yml_1 = require("./yml/res_dynamo_yml");
Object.defineProperty(exports, "res_dynamo_yml", { enumerable: true, get: function () { return res_dynamo_yml_1.res_dynamo_yml; } });
const EnvLambda = {
    srv_yml: srv_yml_1.srv_yml,
    srv_handler: srv_handler_1.srv_handler,
    resources_yml: res_yml_1.resources_yml,
};
exports.EnvLambda = EnvLambda;
// Fragment tooling (used by voxgig-system template list/eject/diff, and
// available to project code).
const Fragments = {
    load: generate_1.loadFragment,
    render: generate_1.renderFragment,
    list: generate_1.listFragments,
    folder: generate_1.PKG_TM,
};
exports.Fragments = Fragments;
//# sourceMappingURL=build.js.map