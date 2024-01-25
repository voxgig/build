"use strict";
/* Copyright © 2022 Voxgig Ltd, MIT License. */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvLambda = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const gubu_1 = require("gubu");
const model_1 = require("@voxgig/model");
const { Open, Skip } = gubu_1.Gubu;
const EntShape = (0, gubu_1.Gubu)({
    id: {
        field: 'id'
    },
    field: Open({}).Child({}),
    resource: Open({
        name: ''
    }),
    dynamo: Open({
        active: false,
        prefix: '',
        suffix: '',
    }),
    stage: Open({
        active: false
    }),
    custom: Skip(String),
}, { prefix: 'Entity' });
// Contents of '$' leaf
const MsgMetaShape = (0, gubu_1.Gubu)({
    file: Skip(String),
    params: Skip({}),
    transport: Skip({
        queue: {
            active: false
        }
    }),
}, { prefix: 'MsgMeta' });
// console.log('BUILD 1')
const EnvLambda = {
    srv_yml: (model, spec) => {
        let appname = model.main.conf.core.name;
        let AppName = (0, model_1.camelify)(appname);
        let srv_yml_path = path_1.default.join(spec.folder, 'srv.yml');
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
                // TODO: this should be a JSON structure exported as YAML
                let srvyml = `${name}:
  handler: ${handler.path.prefix}${name}${handler.path.suffix}
  role: Basic${AppName}LambdaRole
  timeout: ${lambda.timeout}
`;
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
                                    events += TM(`
${recur}
`);
                                }
                                else if ('sqs' === ev.source) {
                                    events += TM(` 
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
                        if (web.cors.props && !empty(web.cors.props)) {
                            corsflag = '';
                            corsprops = Object
                                .entries(web.cors.props)
                                .reduce(((a, nv) => (a += `          ${nv[0]}: ${nv[1]}\n`
                                , a)), '');
                        }
                    }
                    if ('v2' === ((_d = web.lambda) === null || _d === void 0 ? void 0 : _d.gateway)) {
                        for (let method of methods) {
                            events += TM(`
    - httpApi:
        path: "${prefix}${area}${name}${suffix}"
        method: ${method}
`);
                        }
                    }
                    else {
                        for (let method of methods) {
                            events += TM(`
    - http:
        path: "${prefix}${area}${name}${suffix}"
        method: ${method}
        cors: ${corsflag}
${corsprops}
`);
                        }
                    }
                }
                if ('' !== events) {
                    srvyml += TM(`
  events:
${events}
`);
                }
                return srvyml;
            }).join('\n\n\n') +
            suffixContent;
        fs_1.default.writeFileSync(srv_yml_path, content);
    },
    // Only create if does not exist
    srv_handler: (model, spec) => {
        let lang = spec.lang || 'js';
        let TS = 'ts' === lang;
        Object
            .entries(model.main.srv)
            .filter((entry) => { var _a; return (_a = entry[1].env) === null || _a === void 0 ? void 0 : _a.lambda; })
            .forEach((entry) => {
            var _a;
            const name = entry[0];
            const srv = entry[1];
            if ('custom' === srv.env.lambda.kind) {
                return;
            }
            let srv_handler_path = path_1.default.join(spec.folder, name + '.' + lang);
            let start = spec.start || 'setup';
            let envFolder = ((_a = spec.env) === null || _a === void 0 ? void 0 : _a.folder) || '../../../env/lambda';
            let handler = 'handler';
            let modify = '';
            //       if (!srv.api.web.active) {
            //         if (srv.on && 0 < Object.keys(srv.on).length) {
            //           handler = 'eventhandler'
            //           modify = `
            // event = {
            //   ...event,
            //   // TODO: @voxgig/system? util needed to handle this dynamically
            //   seneca$: { msg: '${srv.on[Object.keys(srv.on)[0]].events[0].msg}' },
            // }
            //         `
            //         }
            //       }
            let prepare = '';
            let complete = '';
            (0, model_1.dive)(model.main.msg.aim[name], 128).map((entry) => {
                var _a, _b;
                let path = ['aim', name, ...entry[0]];
                let msgMeta = MsgMetaShape(entry[1]);
                let pin = (0, model_1.pinify)(path);
                if ((_b = (_a = msgMeta.transport) === null || _a === void 0 ? void 0 : _a.queue) === null || _b === void 0 ? void 0 : _b.active) {
                    complete += `
  seneca.listen({type:'sqs',pin:'${pin}'})`;
                }
            });
            (0, model_1.dive)(model.main.srv[name].out, 128).map((entry) => {
                var _a, _b;
                let path = entry[0];
                let msgMetaMaybe = (0, model_1.get)(model.main.msg, path);
                // console.log(name, path, msgMetaMaybe)
                if (msgMetaMaybe === null || msgMetaMaybe === void 0 ? void 0 : msgMetaMaybe.$) {
                    let msgMeta = MsgMetaShape(msgMetaMaybe === null || msgMetaMaybe === void 0 ? void 0 : msgMetaMaybe.$);
                    let pin = (0, model_1.pinify)(path);
                    if ((_b = (_a = msgMeta.transport) === null || _a === void 0 ? void 0 : _a.queue) === null || _b === void 0 ? void 0 : _b.active) {
                        complete += `
  seneca.client({type:'sqs',pin:'${pin}'})`;
                    }
                }
            });
            let makeGatewayHandler = false;
            let onlist = model.main.srv[name].on || {};
            Object.entries(onlist).map((onitem) => {
                onitem[1].events.map((event) => {
                    if ('s3' === event.source) {
                        if (!makeGatewayHandler) {
                            complete += `

  const makeGatewayHandler = seneca.export('s3-store/makeGatewayHandler')`;
                            makeGatewayHandler = true;
                        }
                        complete += `
  seneca
    .act('sys:gateway,kind:lambda,add:hook,hook:handler', {
       handler: makeGatewayHandler('${event.msg}') })`;
                    }
                });
            });
            let content = TS ? `import { getSeneca } from '${envFolder}/${start}'`
                :
                    `const getSeneca = require('${envFolder}/${start}')`;
            content += `

function complete(seneca: any) {${complete}
}

exports.handler = async (
  event${TS ? ':any' : ''},
  context${TS ? ':any' : ''}
) => {
  ${modify}
  let seneca = await getSeneca('${name}', complete)
  ${prepare}
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
        const appname = model.main.conf.core.name;
        const AppName = (0, model_1.camelify)(appname);
        const region = model.main.conf.cloud.aws.region;
        const accountid = model.main.conf.cloud.aws.accountid;
        let filename = spec.filename || 'resources.yml';
        let resources_yml_path = path_1.default.join(spec.folder, filename);
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
                (0, model_1.dive)(model.main.ent).map((entry) => {
                    var _a, _b, _c, _d;
                    let path = entry[0];
                    let ent = EntShape(entry[1]);
                    // console.log('DYNAMO', path, ent)
                    if (ent && false !== ((_a = ent.dynamo) === null || _a === void 0 ? void 0 : _a.active)) {
                        let pathname = path
                            .map((p) => (p[0] + '').toUpperCase() + p.substring(1))
                            .join('');
                        let name = ((_b = ent.resource) === null || _b === void 0 ? void 0 : _b.name) || pathname;
                        let resname = ((_c = ent.resource) === null || _c === void 0 ? void 0 : _c.name) || 'Table' + pathname;
                        let stage_suffix = ((_d = ent.stage) === null || _d === void 0 ? void 0 : _d.active) ? '.${self:provider.stage,"dev"}' : '';
                        let tablename = ent.dynamo.prefix +
                            name +
                            ent.dynamo.suffix +
                            stage_suffix;
                        dynamoResources.push({
                            arn: `arn:aws:dynamodb:${region}:${accountid}:table/${tablename}`
                        });
                        return `${resname}:
  Type: AWS::DynamoDB::Table
  DeletionPolicy: Retain
  Properties:
    TableName: '${tablename}'
    BillingMode: "PAY_PER_REQUEST"
    PointInTimeRecoverySpecification:
      PointInTimeRecoveryEnabled: "true"
    DeletionProtectionEnabled: true
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
        // content +=
        let queueDefs = (0, model_1.dive)(model.main.msg, 128).map((entry) => {
            var _a, _b, _c;
            let path = entry[0];
            let msgMeta = MsgMetaShape(entry[1]);
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
                let resname = 'Queue' + name;
                let queueName = (queue.prefix || '') +
                    path.reduce((s, p, i) => (s += p + (i % 2 ?
                        (i == path.length - 1 ? '' : '-') : '_')), '') +
                    (queue.suffix || '') +
                    (stage_suffix || '');
                // console.log('QN', queueName)
                return `${resname}:
  Type: "AWS::SQS::Queue"
  Properties:
    QueueName: '${queueName}'

`;
            }
            return '';
        }).filter(n => '' !== n).join('');
        // console.log('queueDefs', queueDefs)
        content += '\n\n' + queueDefs;
        let customLambdaPolicyStatementPath = path_1.default.join(spec.folder, 'res.lambda.policy.statements.yml');
        let customLambdaPolicyStatementContent = fs_1.default.existsSync(customLambdaPolicyStatementPath) ?
            fs_1.default.readFileSync(customLambdaPolicyStatementPath) : '';
        content += `
Basic${AppName}LambdaRole:
  Type: AWS::IAM::Role
  Properties:
    RoleName: Basic${AppName}LambdaRole\${self:custom.index.BasicLambdaRole,"01"}
    AssumeRolePolicyDocument:
      Version: '2012-10-17'
      Statement:
        - Effect: Allow
          Principal:
            Service:
              - lambda.amazonaws.com
          Action: sts:AssumeRole
    Policies:
      - PolicyName: LambdaServiceAccess
        PolicyDocument:
          Version: '2012-10-17'
          Statement:
            - Effect: Allow
              Action:
                - dynamodb:DescribeTable
                - dynamodb:GetItem
                - dynamodb:PutItem
                - dynamodb:UpdateItem
                - dynamodb:DeleteItem
                - dynamodb:Query
                - dynamodb:Scan
              Resource: 
${dynamoResources.map(r => '                - ' + r.arn).join('\n')}
${customLambdaPolicyStatementContent}
    ManagedPolicyArns:
      - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
`;
        if (spec.custom) {
            content = fs_1.default.readFileSync(spec.custom).toString() + '\n\n\n' + content;
        }
        content += suffixContent;
        content += `
# END
`;
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