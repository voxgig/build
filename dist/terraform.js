"use strict";
/* Copyright © 2022 Voxgig Ltd, MIT License. */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.modules_tf = exports.main_tf = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const model_1 = require("@voxgig/model");
const resources_1 = require("./templates/terraform/resources");
const build_1 = require("./build");
const main_tf = (model, spec) => {
    // console.log('main_tf', spec)
    let filename = spec.filename || 'main.tf';
    let main_tf_path = path_1.default.join(spec.folder, filename);
    // TODO: add suffix when creating GW resources
    // Terraform
    let content = (0, resources_1.provider)({});
    content += `# DynamoDB tables\n\n`;
    // DynamoDB tables
    content += (0, model_1.dive)(model.main.ent)
        .map((entry) => {
        var _a, _b, _c, _d;
        let path = entry[0];
        let ent = (0, build_1.EntShape)(entry[1]);
        if (ent && ((_a = ent.dynamo) === null || _a === void 0 ? void 0 : _a.active)) {
            let pathname = path.join('');
            let name = ((_b = ent.resource) === null || _b === void 0 ? void 0 : _b.name) || pathname;
            let stage_suffix = ((_c = ent.stage) === null || _c === void 0 ? void 0 : _c.active) ? '.${var.stage}' : '';
            let fullname = ent.dynamo.prefix + name + ent.dynamo.suffix + stage_suffix;
            let gsi = '';
            if ((_d = ent.dynamo) === null || _d === void 0 ? void 0 : _d.index) {
                // console.log('ent.dynamo.index:', ent.dynamo.index)
                gsi += Object.entries(ent.dynamo.index).map((entry) => {
                    let value = entry[1];
                    return (0, resources_1.dynamoGSI)({
                        index: value
                    });
                });
            }
            return (0, resources_1.dynamoTable)({
                name: name,
                fullname: fullname,
                idField: ent.id.field,
                gsi: gsi
            });
        }
        return '';
    })
        .join('\n\n');
    content += `\n\n# Lambda IAM role`;
    // Lambda IAM role
    content += (0, resources_1.iamRole)({});
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
            let area = web.path.area;
            // split prefix into parts and remove empty parts
            let parts = prefix.split('/').filter((part) => part !== '');
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
                gwResStr += (0, resources_1.gwResource)({
                    area: area,
                    parent: parent
                });
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
            let area = web.path.area;
            let resource = area.replace('/', '');
            dependsOn += `
          module.gw_${name}_lambda.gw_integration_id,`;
            triggers += `
          module.gw_${name}_lambda.gw_integration_id,
          module.gw_${name}_lambda.gw_method_id,
          module.gw_${name}_lambda.gw_resource_id,`;
            return (0, resources_1.gwLambda)({
                name: name,
                resource: resource
            });
        }
        return '';
    })
        .join('\n\n');
    dependsOn = `[${dependsOn}]`;
    dependsOn = dependsOn.replace(',]', '\n\t]');
    triggers = `[${triggers}]`;
    triggers = triggers.replace(',]', '\n\t\t]');
    // API Gateway deployment
    content += (0, resources_1.gwDeployment)({
        dependsOn: dependsOn,
        triggers: triggers
    });
    // API Gateway stage
    content += (0, resources_1.gwStage)({});
    fs_1.default.writeFileSync(main_tf_path, content);
};
exports.main_tf = main_tf;
const modules_tf = (model, spec) => {
    // console.log('modules_tf', spec.folder, spec.filename)
    let filename = spec.filename || 'modules.tf';
    let modules_src_path = path_1.default.join(__dirname, 'templates', 'terraform', 'modules');
    let modules_dest_path = path_1.default.join(spec.folder, 'modules');
    copyDirectory(modules_src_path, modules_dest_path);
};
exports.modules_tf = modules_tf;
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
//# sourceMappingURL=terraform.js.map