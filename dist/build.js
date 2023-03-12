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
            // TODO: this should be a JSON structure exported as YAML
            let srvyml = `${name}:
  handler: ${handler.path.prefix}${name}${handler.path.suffix}
  timeout: ${lambda.timeout}
`;
            const web = srv.api.web;
            let events = '';
            let onEvents = srv.on;
            if (onEvents) {
                Object.entries(onEvents).forEach((entry) => {
                    let name = entry[0];
                    let spec = entry[1];
                    if ('aws' === spec.provider) {
                        spec.events.forEach((ev) => {
                            if ('s3' === ev.source) {
                                events += TM(`
    - s3:
        bucket: ${ev.bucket}
        event: ${ev.event}
        existing: true
`);
                                if (ev.rules) {
                                    events += TM(`
        rules:
`);
                                    if (ev.rules.prefix) {
                                        events += TM(`
          - prefix: ${ev.rules.prefix}
`);
                                    }
                                    if (ev.rules.suffix) {
                                        events += TM(`
          - suffix: ${ev.rules.suffix}
`);
                                    }
                                }
                            }
                            else if ('schedule' === ev.source) {
                                let entries = 'string' === typeof ev.recur ? [ev.recur] : (ev.recur || []);
                                let recur = entries.map((entry) => `
    - schedule:
        rate: ${entry}
`);
                                events += TM(`
${recur}
`);
                            }
                        });
                    }
                });
            }
            // TODO: move to `on`
            if (web.active) {
                let prefix = web.path.prefix;
                let suffix = web.path.suffix;
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
                events += TM(`
    - http:
        path: "${prefix}${area}${name}${suffix}"
        method: ${method}
        cors: ${corsflag}
${corsprops}
`);
            }
            if ('' !== events) {
                srvyml += TM(`
  events:
${events}
`);
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
            var _a;
            const name = entry[0];
            const srv = entry[1];
            let srv_handler_path = path_1.default.join(spec.folder, name + '.js');
            let start = spec.start || 'setup';
            let envFolder = ((_a = spec.env) === null || _a === void 0 ? void 0 : _a.folder) || '../../env/lambda';
            let handler = 'handler';
            let modify = '';
            if (!srv.api.web.active) {
                if (srv.on && 0 < Object.keys(srv.on).length) {
                    handler = 'eventhandler';
                    modify = `
  event = {
    ...event,
    // TODO: @voxgig/system? util needed to handle this dynamically
    seneca$: { msg: '${srv.on[Object.keys(srv.on)[0]].events[0].msg}' },
  }
          `;
                }
            }
            let content = `
const getSeneca = require('${envFolder}/${start}')

exports.handler = async (event, context) => {
  ${modify}
  let seneca = await getSeneca('${name}')
  let handler = seneca.export('gateway-lambda/${handler}')
  let res = await handler(event, context)
  return res
}
`;
            // TODO: make this an option
            //if (!Fs.existsSync(srv_handler_path)) {
            fs_1.default.writeFileSync(srv_handler_path, content);
        });
    },
    resources_yml: (model, spec) => {
        let resources_yml_path = path_1.default.join(spec.folder, 'resources.yml');
        let content = (0, model_1.dive)(model.main.ent).map((entry) => {
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
// Strip inital newline
function TM(str) {
    return str.replace(/^\n/, '');
}
//# sourceMappingURL=build.js.map