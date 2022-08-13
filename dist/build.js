"use strict";
/* Copyright © 2022 Voxgig Ltd, MIT License. */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvLambda = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const model_1 = require("@voxgig/model");
const EnvLambda = {
    srv_yml: (model, spec) => {
        let srv_yml_path = path_1.default.join(spec.folder, 'srv.yml');
        let content = Object
            .entries(model.main.srv)
            .filter((entry) => { var _a, _b; return (_b = (_a = entry[1].env) === null || _a === void 0 ? void 0 : _a.lambda) === null || _b === void 0 ? void 0 : _b.active; })
            .map((entry) => {
            var _a, _b, _c;
            const name = entry[0];
            const srv = entry[1];
            const lambda = srv.env.lambda;
            const handler = lambda.handler;
            // NOTE: gen.custom covention: allows for complete overwrite
            // as a get-out-of-jail
            if ((_c = (_b = (_a = srv.gen) === null || _a === void 0 ? void 0 : _a.custom) === null || _b === void 0 ? void 0 : _b.lambda) === null || _c === void 0 ? void 0 : _c.srv_yml) {
                return srv.gen.custom.lambda.srv_yml;
            }
            let srvyml = `${name}:
  handler: ${handler.path.prefix}${name}${handler.path.suffix}
  events:
`;
            const web = srv.api.web;
            if (web.active) {
                let prefix = web.path.prefix;
                let area = web.path.area;
                let method = web.method;
                let corsflag = 'false';
                let corsprops = '';
                if (web.cors.active) {
                    corsflag = 'true';
                    if (web.cors.props && !empty(web.cors.props)) {
                        corsflag = '';
                        corsprops = Object
                            .entries(web.cors.props)
                            .reduce(((a, nv) => (a += `          ${nv[0]}: ${nv[1]}\n`
                            , a)), '');
                    }
                }
                srvyml += `    - http:
        path: "${prefix}${area}${name}"
        method: ${method}
        cors: ${corsflag}
${corsprops}
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
    resources_yml: (model, spec) => {
        let resources_yml_path = path_1.default.join(spec.folder, 'resources.yml');
        let content = (0, model_1.dive)(model.main.ent).map(entry => {
            var _a;
            // console.log('DYNAMO', entry)
            let path = entry[0];
            let ent = entry[1];
            if (ent && ((_a = ent.dynamo) === null || _a === void 0 ? void 0 : _a.active)) {
                let name = path.join('');
                let fullname = ent.dynamo.prefix +
                    name +
                    ent.dynamo.suffix;
                return `${name}:
  Type: AWS::DynamoDB::Table
  Properties:
    TableName: ${fullname}
    BillingMode: "PAY_PER_REQUEST"
    PointInTimeRecoverySpecification:
      PointInTimeRecoveryEnabled: "true"
    AttributeDefinitions:
      - AttributeName: "${ent.id.field}"
        AttributeType: "S"
    KeySchema:
      - AttributeName: "${ent.id.field}"
        KeyType: HASH
`;
            }
            return '';
        }).join('\n\n\n');
        if (spec.custom) {
            content = fs_1.default.readFileSync(spec.custom).toString() + '\n\n\n' + content;
        }
        fs_1.default.writeFileSync(resources_yml_path, content);
    }
};
exports.EnvLambda = EnvLambda;
function empty(o) {
    return null == o ? true : 0 === Object.keys(o).length;
}
//# sourceMappingURL=build.js.map