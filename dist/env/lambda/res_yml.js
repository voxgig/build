"use strict";
/* Copyright © 2022-2026 Voxgig Ltd, MIT License. */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resources_yml = void 0;
// gen/serverless resources template: SQS queues, DynamoDB tables (via
// yml/res_dynamo_yml), and the basic Lambda IAM role.
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = require("@voxgig/util");
const msg_1 = require("../../shape/msg");
const conf_1 = require("../../shape/conf");
const res_dynamo_yml_1 = require("../../yml/res_dynamo_yml");
const generate_1 = require("./generate");
const resources_yml = async (model, spec) => {
    const queueFrag = (0, generate_1.loadFragment)('res.queue.yml.frag', spec);
    const roleFrag = (0, generate_1.loadFragment)('res.role.yml.frag', spec);
    const core = (0, conf_1.CoreConfShape)(model.main.conf.core);
    const appname = core.name;
    const AppName = (0, util_1.camelify)(appname);
    const cloud = (0, conf_1.CloudConfShape)(model.main.conf.cloud);
    const region = cloud.aws.region;
    const accountid = cloud.aws.accountid;
    let filename = spec.filename || 'resources.yml';
    let resources_yml_prefix_path = path_1.default.join(spec.folder, 'res.prefix.yml');
    let resources_yml_suffix_path = path_1.default.join(spec.folder, 'res.suffix.yml');
    let prefixContent = fs_1.default.existsSync(resources_yml_prefix_path) ?
        fs_1.default.readFileSync(resources_yml_prefix_path) : '';
    let suffixContent = fs_1.default.existsSync(resources_yml_suffix_path) ?
        fs_1.default.readFileSync(resources_yml_suffix_path) : '';
    const dynamoResources = [];
    let content = `# START
`;
    content +=
        prefixContent +
            await (0, res_dynamo_yml_1.res_dynamo_yml)(model, { dynamoResources, region, accountid });
    // content +=
    let queueDefs = (0, util_1.dive)(model.main.msg, 128).map((entry) => {
        var _a, _b, _c;
        let path = entry[0];
        let msgMeta = (0, msg_1.MsgMetaShape)(entry[1]);
        let pathname = path
            .map((p) => (p[0] + '').toUpperCase() + p.substring(1))
            .join('');
        // console.log('MQ', pathname, msgMeta)
        if ((_b = (_a = msgMeta.transport) === null || _a === void 0 ? void 0 : _a.queue) === null || _b === void 0 ? void 0 : _b.active) {
            // console.log('MM', path, msgMeta)
            let queue = msgMeta.transport.queue;
            let name = queue.name || pathname;
            // TODO: aontu should do this, but needs recursive child conjuncts
            let stage_suffix = (false === ((_c = queue.stage) === null || _c === void 0 ? void 0 : _c.active)) ? '' : '-${self:provider.stage,"dev"}';
            let queue_suffix = (null == queue.suffix || '' == queue.suffix) ? '' :
                '-' + queue.suffix;
            let resname = 'Queue' + name;
            let queueName = (queue.prefix || '') +
                path.reduce((s, p, i) => (s += p + (i % 2 ?
                    (i == path.length - 1 ? '' : '-') : '_')), '') +
                (queue_suffix || '') +
                (stage_suffix || '');
            let queueTimeout = queue.timeout || 30;
            return (0, generate_1.renderFragment)(queueFrag, {
                resname,
                queueName,
                queueTimeout,
            });
        }
        return '';
    }).filter(n => '' !== n).join('');
    // console.log('queueDefs', queueDefs)
    content += '\n\n' + queueDefs;
    let customLambdaPolicyStatementPath = path_1.default.join(spec.folder, 'res.lambda.policy.statements.yml');
    let customLambdaPolicyStatementContent = fs_1.default.existsSync(customLambdaPolicyStatementPath) ?
        fs_1.default.readFileSync(customLambdaPolicyStatementPath) : '';
    content += (0, generate_1.renderFragment)(roleFrag, {
        AppName,
        dynamoArns: dynamoResources.map(r => '                - ' + r.arn).join('\n'),
        customPolicy: customLambdaPolicyStatementContent,
    });
    if (spec.custom) {
        content = fs_1.default.readFileSync(spec.custom).toString() + '\n\n\n' + content;
    }
    content += suffixContent;
    content += `
# END
`;
    await (0, generate_1.generate)(spec.folder, [{ name: filename, content }]);
};
exports.resources_yml = resources_yml;
//# sourceMappingURL=res_yml.js.map