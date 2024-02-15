"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudConfShape = void 0;
const gubu_1 = require("gubu");
// const { Open, Skip } = Gubu
const CloudConfShape = (0, gubu_1.Gubu)({
    aws: {
        region: 'us-east-1',
        accountid: 'AWS-ACCOUNT-ID',
    }
}, { prefix: 'CloudConf' });
exports.CloudConfShape = CloudConfShape;
//# sourceMappingURL=conf.js.map