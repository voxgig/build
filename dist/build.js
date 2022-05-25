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
        console.log('srv_yml', spec);
        let srv_yml_path = path_1.default.join(spec.folder, 'srv.yml');
        let content = Object
            .entries(model.main.srv)
            .filter((entry) => { var _a; return (_a = entry[1].env) === null || _a === void 0 ? void 0 : _a.lambda; })
            .map((entry) => {
            const name = entry[0];
            // const srv = entry[1]
            return `${name}:
  handler: src/handlers/${name}.handler
  events:
    - http:
        path: "/api/public/${name}"
        method: POST
        cors: true
`;
        }).join('\n\n');
        fs_1.default.writeFileSync(srv_yml_path, content);
    }
};
exports.EnvLambda = EnvLambda;
//# sourceMappingURL=build.js.map