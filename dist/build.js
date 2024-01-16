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
        let filename = 'main.tf';
        let main_tf_path = path_1.default.join(spec.folder, filename);
        // Terraform
        let content = `terraform {

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.31.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4.1"
    }
  }

  required_version = "~> 1.6.6"
} \n\n`;
        // Provider
        content += `provider "aws" {
  region = "eu-west-1"

  default_tags {
    tags = {
      vxg01-terraform = "cloudfront-distribution"
    }
  }
}\n\n`;
        // Variables
        content += `variable "stage" {
  type = "string"
  default = "dev"
}\n\n`;
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
                return `resource "aws_dynamodb_table" "${name}" {
  name         = "${fullname}"
  hash_key     = "${ent.id.field}"
  billing_mode = "PAY_PER_REQUEST"

  point_in_time_recovery {
    enabled = true
  }

  attribute {
    name = "${ent.id.field}"
    type = "S"
  }

  lifecycle {
    prevent_destroy = true
  }
}`;
            }
            return '';
        })
            .join('\n\n\n');
        // Lambda IAM role
        content += `\n\nresource "aws_iam_role" "lambda_exec_role" {
  name = "tf01-vxg01-lambda-exec-role"

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
        // S3 bucket for Lambda code
        content += `resource "aws_s3_bucket" "lambda_bucket" {
  bucket = "vxg01-tf01-lambda-bucket"
}

resource "aws_s3_bucket_ownership_controls" "lambda_bucket" {
  bucket = aws_s3_bucket.lambda_bucket.id

  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_acl" "lambda_bucket" {
  depends_on = [aws_s3_bucket_ownership_controls.lambda_bucket]

  bucket = aws_s3_bucket.lambda_bucket.id
  acl    = "private"
}

resource "aws_s3_object" "lambda_s3_object" {
  bucket = aws_s3_bucket.lambda_bucket.bucket
  key    = "lambda/vxg01-tf01-lambda-bucket.zip"
  source = "\${path.root}/../backend.zip"
  etag   = filemd5("\${path.root}/../backend.zip")
}\n\n`;
        // S3 bucket for user uploads
        content += `resource "aws_s3_bucket" "user_uploads" {
  bucket = "vxg01-backend01-file02-tf01"
}

resource "aws_s3_bucket_cors_configuration" "user_uploads" {
  bucket = aws_s3_bucket.user_uploads.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "POST"]
    allowed_origins = ["https://dh9bnxeiea032.cloudfront.net"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

resource "aws_iam_policy" "user_uploads_policy" {
  name        = "user_uploads_policy"
  policy      = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          "\${aws_s3_bucket.user_uploads.arn}",
          "\${aws_s3_bucket.user_uploads.arn}/*"
        ]
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_attach_s3_" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = aws_iam_policy.user_uploads_policy.arn
}\n\n`;
        Object.entries(model.main.srv)
            .filter((entry) => { var _a, _b; return (_b = (_a = entry[1].env) === null || _a === void 0 ? void 0 : _a.lambda) === null || _b === void 0 ? void 0 : _b.active; })
            .map((entry) => {
            const name = entry[0];
            const srv = entry[1];
        });
        fs_1.default.writeFileSync(main_tf_path, content);
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