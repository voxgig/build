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
const resources_1 = require("./templates/terraform/resources");
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
        suffix: ''
    }),
    stage: Open({
        active: false
    }),
    custom: Skip(String)
});
const EnvLambda = {
    srv_yml: (model, spec) => {
        let srv_yml_path = path_1.default.join(spec.folder, 'srv.yml');
        let srv_yml_prefix_path = path_1.default.join(spec.folder, 'srv.prefix.yml');
        let srv_yml_suffix_path = path_1.default.join(spec.folder, 'srv.suffix.yml');
        let prefixContent = fs_1.default.existsSync(srv_yml_prefix_path)
            ? fs_1.default.readFileSync(srv_yml_prefix_path)
            : '';
        let suffixContent = fs_1.default.existsSync(srv_yml_suffix_path)
            ? fs_1.default.readFileSync(srv_yml_suffix_path)
            : '';
        let content = prefixContent +
            Object.entries(model.main.srv)
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
                                    let entries = 'string' === typeof ev.recur ? [ev.recur] : ev.recur || [];
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
                            corsprops = Object.entries(web.cors.props).reduce((a, nv) => ((a += `          ${nv[0]}: ${nv[1]}\n`), a), '');
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
            })
                .join('\n\n\n') +
            suffixContent;
        fs_1.default.writeFileSync(srv_yml_path, content);
    },
    // Only create if does not exist
    srv_handler: (model, spec) => {
        let lang = spec.lang || 'js';
        let TS = 'ts' === lang;
        Object.entries(model.main.srv)
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
            let content = TS
                ? `import { getSeneca } from '${envFolder}/${start}'`
                : `const getSeneca = require('${envFolder}/${start}')`;
            content += `

exports.handler = async (
  event${TS ? ':any' : ''},
  context${TS ? ':any' : ''}
) => {
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
        let filename = spec.filename || 'resources.yml';
        let resources_yml_path = path_1.default.join(spec.folder, filename);
        let resources_yml_prefix_path = path_1.default.join(spec.folder, 'res.prefix.yml');
        let resources_yml_suffix_path = path_1.default.join(spec.folder, 'res.suffix.yml');
        let prefixContent = fs_1.default.existsSync(resources_yml_prefix_path)
            ? fs_1.default.readFileSync(resources_yml_prefix_path)
            : '';
        let suffixContent = fs_1.default.existsSync(resources_yml_suffix_path)
            ? fs_1.default.readFileSync(resources_yml_suffix_path)
            : '';
        let content = prefixContent +
            (0, model_1.dive)(model.main.ent)
                .map((entry) => {
                var _a, _b, _c;
                // console.log('DYNAMO', entry)
                let path = entry[0];
                let ent = EntShape(entry[1]);
                if (ent && ((_a = ent.dynamo) === null || _a === void 0 ? void 0 : _a.active)) {
                    let pathname = path.join('');
                    let name = ((_b = ent.resource) === null || _b === void 0 ? void 0 : _b.name) || pathname;
                    let stage_suffix = ((_c = ent.stage) === null || _c === void 0 ? void 0 : _c.active)
                        ? '.${self:provider.stage,"dev"}'
                        : '';
                    let fullname = ent.dynamo.prefix + name + ent.dynamo.suffix + stage_suffix;
                    return `${name}:
  Type: AWS::DynamoDB::Table
  DeletionPolicy: Retain
  Properties:
    TableName: '${fullname}'
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
            })
                .join('\n\n\n');
        if (spec.custom) {
            content = fs_1.default.readFileSync(spec.custom).toString() + '\n\n\n' + content;
        }
        content += suffixContent;
        fs_1.default.writeFileSync(resources_yml_path, content);
    },
    main_tf: (model, spec) => {
        // console.log('main_tf', spec)
        let filename = spec.filename || 'main.tf';
        let main_tf_path = path_1.default.join(spec.folder, filename);
        // TODO: add suffix when creating GW resources
        // TODO: seed modules folder initially
        // Terraform
        let content = (0, resources_1.provider)({});
        content += `# DynamoDB tables\n\n`;
        // DynamoDB tables
        content += (0, model_1.dive)(model.main.ent)
            .map((entry) => {
            var _a, _b, _c;
            let path = entry[0];
            let ent = EntShape(entry[1]);
            if (ent && ((_a = ent.dynamo) === null || _a === void 0 ? void 0 : _a.active)) {
                let pathname = path.join('');
                let name = ((_b = ent.resource) === null || _b === void 0 ? void 0 : _b.name) || pathname;
                let stage_suffix = ((_c = ent.stage) === null || _c === void 0 ? void 0 : _c.active) ? '.${var.stage}' : '';
                let fullname = ent.dynamo.prefix + name + ent.dynamo.suffix + stage_suffix;
                return (0, resources_1.dynamodb_table)({
                    ctx: {
                        name: name,
                        fullname: fullname,
                        idField: ent.id.field
                    }
                });
            }
            return '';
        })
            .join('\n\n');
        content += `\n\n# Lambda IAM role`;
        // Lambda IAM role
        content += `\n\nresource "aws_iam_role" "lambda_exec_role" {
  name = "\${var.stage}-vxg01-lambda-exec-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Sid    = ""
      Principal = {
        Service = "lambda.amazonaws.com"
      }
      }
    ]
  })
}

resource "aws_iam_policy" "dynamodb_policy" {
  name        = "DynamoDBFullAccessPolicy"
  description = "IAM policy for full access to DynamoDB"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = "dynamodb:*",
        Effect = "Allow",
        Resource = "*"
      },
    ],
  })
}

resource "aws_iam_role_policy_attachment" "lambda_attach_dynamo" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = aws_iam_policy.dynamodb_policy.arn
}

resource "aws_iam_policy" "cloudwatch_policy" {
  name        = "cloudwatch_policy"
  description = "IAM policy for logging from a lambda"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:TagResource"
        ],
        Resource = "arn:aws:logs:*:*:*",
        Effect   = "Allow",
      },
    ],
  })
}

resource "aws_iam_role_policy_attachment" "lambda_attach_cloudwatch" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = aws_iam_policy.cloudwatch_policy.arn
}\n\n`;
        content += `# S3 bucket for Lambda code\n\n`;
        // S3 bucket for Lambda code
        content += (0, resources_1.lambdaBucket)();
        content += `# Lambda functions\n\n`;
        // Create Lambda functions
        content += Object.entries(model.main.srv)
            .map((entry) => {
            const name = entry[0];
            const srv = entry[1];
            const lambda = srv.env.lambda;
            const handler = lambda.handler;
            const prefix = handler.path.prefix;
            const suffix = handler.path.suffix;
            // Define lambda module
            let lambdaConfig = (0, resources_1.lambdaFunc)({
                name: name,
                prefix: prefix,
                suffix: suffix,
                timeout: lambda.timeout
            });
            // Define cloud events if srv.on
            let onEvents = srv.on;
            if (onEvents) {
                Object.entries(onEvents).forEach((entry) => {
                    // let name = entry[0]
                    let spec = entry[1];
                    if ('aws' === spec.provider) {
                        lambdaConfig += (0, resources_1.lambdaPermissions)({
                            name: name
                        });
                        let events = '';
                        let prefix = '';
                        let suffix = '';
                        lambdaConfig += `\n\nresource "aws_s3_bucket_notification" "bucket_notification" {
  bucket = aws_s3_bucket.user_uploads.id

  lambda_function {
    lambda_function_arn = module.upload_lambda.arn`;
                        spec.events
                            .filter((ev) => ev.source === 's3')
                            .forEach((ev) => {
                            events += `"${ev.event}",`;
                            if (ev.rules) {
                                prefix = ev.rules.prefix || prefix;
                                suffix = ev.rules.suffix || suffix;
                            }
                        });
                        if (prefix !== '') {
                            lambdaConfig += `\n\t\tfilter_prefix = "${prefix}"`;
                        }
                        if (suffix !== '') {
                            lambdaConfig += `\n\t\tfilter_suffix = "${suffix}"`;
                        }
                        events = `[${events}]`;
                        events = events.replace(',]', ']');
                        lambdaConfig += `\n\t\tevents = ${events}\n\t}\n}`;
                    }
                });
            }
            return lambdaConfig;
        })
            .join('\n\n');
        content += `\n\n# API Gateway endpoints`;
        content += `# API Gateway resources\n\n`;
        // API Gateway resources
        content += `resource "aws_api_gateway_rest_api" "gw_rest_api" {
  name = "\${var.stage}-vxg01-backend01"
}\n\n`;
        let gwResources = [];
        content += Object.entries(model.main.srv)
            .filter((entry) => { var _a, _b; return (_b = (_a = entry[1].env) === null || _a === void 0 ? void 0 : _a.lambda) === null || _b === void 0 ? void 0 : _b.active; })
            .map((entry) => {
            const name = entry[0];
            const srv = entry[1];
            const web = srv.api.web;
            let gwResStr = '';
            if (web.active) {
                let prefix = web.path.prefix;
                let suffix = web.path.suffix;
                let area = web.path.area;
                let method = web.method;
                let corsflag = 'false';
                let corsprops = '';
                let resource = area.replace('/', '');
                let methods = method.split(',');
                // split prefix into parts and remove empty parts
                let parts = prefix.split('/').filter((part) => part !== '');
                // console.log('parts:', parts)
                let root = parts[0];
                let parent = parts[0];
                // create nested resources
                parts.forEach((part) => {
                    // console.log('part:', part, 'root:', root, 'parent:', parent)
                    if (part == root && !gwResources.includes(part)) {
                        gwResStr += `resource "aws_api_gateway_resource" "${part}" {
  rest_api_id = aws_api_gateway_rest_api.gw_rest_api.id
  parent_id   = aws_api_gateway_rest_api.gw_rest_api.root_resource_id
  path_part   = "${part}"
}\n\n`;
                        // add part to gwResources
                        gwResources.push(part);
                        // check part not in gwResources
                    }
                    else if (!gwResources.includes(part)) {
                        gwResStr += `resource "aws_api_gateway_resource" "${part}" {
  rest_api_id = aws_api_gateway_rest_api.gw_rest_api.id
  parent_id   = aws_api_gateway_resource.${parent}.id
  path_part   = "${part}"
}\n\n`;
                        // add part to gwResources
                        gwResources.push(part);
                    }
                    parent = part;
                });
                // remove / from area
                area = area.replace('/', '');
                if (area !== '' && !gwResources.includes(area)) {
                    gwResStr += `resource "aws_api_gateway_resource" "${area}" {
  rest_api_id = aws_api_gateway_rest_api.gw_rest_api.id
  parent_id   = aws_api_gateway_resource.${parent}.id
  path_part   = "${area}"
}`;
                }
                gwResources.push(area);
                return gwResStr;
            }
            return '';
        })
            .join('\n\n');
        let dependsOn = '';
        let triggers = '';
        // API Gateway endpoints
        content += Object.entries(model.main.srv)
            .filter((entry) => { var _a, _b; return (_b = (_a = entry[1].env) === null || _a === void 0 ? void 0 : _a.lambda) === null || _b === void 0 ? void 0 : _b.active; })
            .map((entry) => {
            const name = entry[0];
            const srv = entry[1];
            const web = srv.api.web;
            if (web.active) {
                let prefix = web.path.prefix;
                let suffix = web.path.suffix;
                let area = web.path.area;
                let method = web.method;
                let corsflag = 'false';
                let corsprops = '';
                let resource = area.replace('/', '');
                let methods = method.split(',');
                // console.log('method:', methods)
                dependsOn += `
          module.gw_${name}_lambda.gw_integration_id,`;
                triggers += `
          module.gw_${name}_lambda.gw_integration_id,
          module.gw_${name}_lambda.gw_method_id,
          module.gw_${name}_lambda.gw_resource_id,`;
                return `module "gw_${name}_lambda" {
  source = "./modules/gw_module"
  function_name = module.${name}_lambda.function_name
  rest_api_id = aws_api_gateway_rest_api.gw_rest_api.id
  parent_id = aws_api_gateway_resource.${resource}.id
  path_part = "${name}"
  invoke_arn = module.${name}_lambda.invoke_arn
}
`;
            }
            return '';
        })
            .join('\n\n');
        dependsOn = `[${dependsOn}]`;
        dependsOn = dependsOn.replace(',]', '\n\t]');
        triggers = `[${triggers}]`;
        triggers = triggers.replace(',]', '\n\t\t]');
        // API Gateway deployment
        content += `resource "aws_api_gateway_deployment" "gw_deployment" {

  depends_on = ${dependsOn}

  rest_api_id = aws_api_gateway_rest_api.gw_rest_api.id

  triggers = {
    redeployment = sha1(jsonencode(${triggers}))
  }

  lifecycle {
    create_before_destroy = true
  }
}\n\n`;
        // API Gateway stage
        content += `resource "aws_api_gateway_stage" "gw_stage" {
  deployment_id = aws_api_gateway_deployment.gw_deployment.id
  rest_api_id   = aws_api_gateway_rest_api.gw_rest_api.id
  stage_name    = "\${var.stage}"
}\n\n`;
        fs_1.default.writeFileSync(main_tf_path, content);
    },
    modules_tf: (model, spec) => {
        console.log('modules_tf', spec.folder, spec.filename);
        let filename = spec.filename || 'modules.tf';
        let modules_src_path = path_1.default.join(__dirname, 'templates', 'terraform', 'modules');
        let modules_dest_path = path_1.default.join(spec.folder, 'modules');
        copyDirectory(modules_src_path, modules_dest_path);
    }
};
exports.EnvLambda = EnvLambda;
function copyDirectory(src, dest) {
    if (!fs_1.default.existsSync(dest)) {
        fs_1.default.mkdirSync(dest, { recursive: true });
    }
    let entries = fs_1.default.readdirSync(src, { withFileTypes: true });
    for (let entry of entries) {
        let srcPath = path_1.default.join(src, entry.name);
        let destPath = path_1.default.join(dest, entry.name);
        entry.isDirectory()
            ? copyDirectory(srcPath, destPath)
            : fs_1.default.copyFileSync(srcPath, destPath);
    }
}
function empty(o) {
    return null == o ? true : 0 === Object.keys(o).length;
}
// Strip inital newline
function TM(str) {
    return str.replace(/^\n/, '');
}
//# sourceMappingURL=build.js.map