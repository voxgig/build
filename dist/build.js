"use strict";
/* Copyright © 2022 Voxgig Ltd, MIT License. */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvLambda = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const EnvLambda = {
    srv_yml: (model, spec) => {
        let srv_yml_path = path_1.default.join(spec.folder, 'srv.yml');
        let content = Object
            .entries(model.main.srv)
            .filter((entry) => { var _a, _b; return (_b = (_a = entry[1].env) === null || _a === void 0 ? void 0 : _a.lambda) === null || _b === void 0 ? void 0 : _b.active; })
            .map((entry) => {
            const name = entry[0];
            const srv = entry[1];
            const lambda = srv.env.lambda;
            const handler = lambda.handler;
            let srvyml = `${name}:
  handler: ${handler.path.prefix}${name}${handler.path.suffix}
  events:
`;
            const web = srv.api.web;
            console.log(web);
            if (web.active) {
                let prefix = web.path.prefix;
                let area = web.path.area;
                let method = web.method;
                let cors = web.cors.active ? 'true' : 'false';
                srvyml += `    - http:
        path: "${prefix}${area}${name}"
        method: ${method}
        cors: ${cors}
`;
            }
            return srvyml;
        }).join('\n\n\n');
        fs_1.default.writeFileSync(srv_yml_path, content);
    },
    // Only create if does not exist
    srv_handler: (model, spec) => {
        Object
            .entries(model.main.srv)
            .filter((entry) => { var _a; return (_a = entry[1].env) === null || _a === void 0 ? void 0 : _a.lambda; })
            .forEach((entry) => {
            const name = entry[0];
            // const srv = entry[1]
            let srv_handler_path = path_1.default.join(spec.folder, name + '.js');
            let content = `
const getSeneca = require('../../env/lambda/setup')

exports.handler = async (event, context) => {
  let seneca = await getSeneca()
  let handler = seneca.export('gateway-lambda/handler')
  let res = await handler(event, context)
  return res
}
`;
            if (!fs_1.default.existsSync(srv_handler_path)) {
                fs_1.default.writeFileSync(srv_handler_path, content);
            }
        });
    },
};
exports.EnvLambda = EnvLambda;
//# sourceMappingURL=build.js.map