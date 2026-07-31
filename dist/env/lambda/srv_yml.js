"use strict";
/* Copyright © 2022-2026 Voxgig Ltd, MIT License. */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.srv_yml = void 0;
// gen/serverless/srv.yml template: one Serverless function definition per
// lambda-active service, derived from the model.
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = require("@voxgig/util");
const conf_1 = require("../../shape/conf");
const generate_1 = require("./generate");
const srv_yml = async (model, spec) => {
    const core = (0, conf_1.CoreConfShape)(model.main.conf.core);
    let appname = core.name;
    let AppName = (0, util_1.camelify)(appname);
    const frag = (0, generate_1.loadFragment)('srv.yml.frag', spec);
    let srv_yml_prefix_path = path_1.default.join(spec.folder, 'srv.prefix.yml');
    let srv_yml_suffix_path = path_1.default.join(spec.folder, 'srv.suffix.yml');
    let prefixContent = fs_1.default.existsSync(srv_yml_prefix_path) ?
        fs_1.default.readFileSync(srv_yml_prefix_path) : '';
    let suffixContent = fs_1.default.existsSync(srv_yml_suffix_path) ?
        fs_1.default.readFileSync(srv_yml_suffix_path) : '';
    let content = prefixContent +
        Object
            .entries(model.main.srv)
            .filter((entry) => { var _a, _b; return (_b = (_a = entry[1].env) === null || _a === void 0 ? void 0 : _a.lambda) === null || _b === void 0 ? void 0 : _b.active; })
            .map((entry) => {
            var _a, _b, _c, _d;
            const name = entry[0];
            const srv = entry[1];
            const lambda = srv.env.lambda;
            const handler = lambda.handler;
            // NOTE: gen.custom convention: allows for complete overwrite
            // as a get-out-of-jail
            if ((_c = (_b = (_a = srv.gen) === null || _a === void 0 ? void 0 : _a.custom) === null || _b === void 0 ? void 0 : _b.lambda) === null || _c === void 0 ? void 0 : _c.srv_yml) {
                return srv.gen.custom.lambda.srv_yml;
            }
            const web = srv.api.web;
            let events = '';
            let onEvents = srv.on;
            if (onEvents) {
                Object.entries(onEvents).forEach((entry) => {
                    // let name = entry[0]
                    let spec = entry[1];
                    if ('aws' === spec.provider) {
                        spec.events.forEach((ev) => {
                            if ('s3' === ev.source) {
                                events += (0, generate_1.TM)(`
    - s3:
        bucket: ${ev.bucket}
        event: ${ev.event}
        existing: true
`);
                                if (ev.rules) {
                                    events += (0, generate_1.TM)(`
        rules:
`);
                                    if (ev.rules.prefix) {
                                        events += (0, generate_1.TM)(`
          - prefix: ${ev.rules.prefix}
`);
                                    }
                                    if (ev.rules.suffix) {
                                        events += (0, generate_1.TM)(`
          - suffix: ${ev.rules.suffix}
`);
                                    }
                                }
                            }
                            else if ('schedule' === ev.source) {
                                let entries = 'string' === typeof ev.recur ? [ev.recur] : (ev.recur || []);
                                let recur = entries.map((entry) => {
                                    let schedule = `
    - schedule:
        rate: ${entry}`;
                                    if (ev.msg) {
                                        schedule += `
        input:
          msg: ${JSON.stringify(ev.msg)} `;
                                    }
                                    return schedule;
                                });
                                events += (0, generate_1.TM)(`
${recur}
`);
                            }
                            else if ('sqs' === ev.source) {
                                events += (0, generate_1.TM)(`
    - sqs:
        arn:
          Fn::GetAtt:
            - ${ev.qrn}
            - Arn
        batchSize: 1
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
                let methods = method.split(',');
                // console.log('METHODS', methods)
                if (web.cors.active) {
                    corsflag = 'true';
                    if (web.cors.props && !(0, generate_1.empty)(web.cors.props)) {
                        corsflag = '';
                        corsprops = Object
                            .entries(web.cors.props)
                            .reduce(((a, nv) => (a += `          ${nv[0]}: ${nv[1]}\n`
                            , a)), '');
                    }
                }
                if ('v2' === ((_d = web.lambda) === null || _d === void 0 ? void 0 : _d.gateway)) {
                    for (let method of methods) {
                        events += (0, generate_1.TM)(`
    - httpApi:
        path: "${prefix}${area}${name}${suffix}"
        method: ${method}
`);
                    }
                }
                else {
                    for (let method of methods) {
                        events += (0, generate_1.TM)(`
    - http:
        path: "${prefix}${area}${name}${suffix}"
        method: ${method}
        cors: ${corsflag}
${corsprops}
`);
                    }
                }
            }
            let eventsBlock = '';
            if ('' !== events) {
                eventsBlock = (0, generate_1.TM)(`
  events:
${events}
`);
            }
            return (0, generate_1.renderFragment)(frag, {
                name,
                handler: handler.path.prefix + name + handler.path.suffix,
                AppName,
                timeout: lambda.timeout,
                memory: lambda.memory || 1024,
                events: eventsBlock,
            });
        }).join('\n\n\n') +
        suffixContent;
    await (0, generate_1.generate)(spec.folder, [{ name: 'srv.yml', content }]);
};
exports.srv_yml = srv_yml;
//# sourceMappingURL=srv_yml.js.map