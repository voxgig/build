"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.res_dynamo_yml = res_dynamo_yml;
const js_yaml_1 = __importDefault(require("js-yaml"));
const util_1 = require("@voxgig/util");
const ent_1 = require("../shape/ent");
async function res_dynamo_yml(model, spec) {
    var _a, _b, _c, _d;
    let entries = (0, util_1.dive)(model.main.ent);
    let ymlparts = [];
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        let path = entry[0];
        let ent = (0, ent_1.EntShape)(entry[1]);
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
            ent.dynamo = {
                tablename,
            };
            spec.dynamoResources.push({
                arn: `arn:aws:dynamodb:${spec.region}:${spec.accountid}:table/${tablename}`
            });
            const res_def = {
                [resname]: {
                    Type: 'AWS::DynamoDB::Table',
                    DeletionPolicy: 'Retain',
                    Properties: {
                        TableName: tablename,
                        BillingMode: "PAY_PER_REQUEST",
                        PointInTimeRecoverySpecification: {
                            PointInTimeRecoveryEnabled: "true",
                        },
                        DeletionProtectionEnabled: true,
                        AttributeDefinitions: [
                            {
                                AttributeName: ent.id.field,
                                AttributeType: "S"
                            }
                        ],
                        KeySchema: [
                            {
                                AttributeName: ent.id.field,
                                KeyType: 'HASH'
                            }
                        ]
                    }
                }
            };
            if (ent.index) {
                const indexEntries = Object.entries(ent.index);
                if (0 < indexEntries.length) {
                    res_def[resname].Properties.GlobalSecondaryIndexes =
                        indexEntries.map((entry) => ({
                            IndexName: entry[0],
                            KeySchema: [{
                                    AttributeName: entry[1].field,
                                    KeyType: 'HASH',
                                }],
                            Projection: {
                                ProjectionType: "ALL"
                            }
                        }));
                }
            }
            const ymlsrc = js_yaml_1.default.dump(res_def);
            ymlparts.push(ymlsrc);
        }
    }
    return ymlparts.join('\n\n\n');
}
//# sourceMappingURL=res_dynamo_yml.js.map