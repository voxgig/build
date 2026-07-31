"use strict";
/* Copyright © 2022-2026 Voxgig Ltd, MIT License. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.srv_handler = void 0;
// Lambda handler template: one handler source file per lambda service,
// bootstrapping Seneca via the env folder and delegating to gateway-lambda.
const util_1 = require("@voxgig/util");
const msg_1 = require("../../shape/msg");
const generate_1 = require("./generate");
// Only create if does not exist
const srv_handler = async (model, spec) => {
    let lang = spec.lang || 'js';
    const frag = (0, generate_1.loadFragment)('srv_handler.' + lang + '.frag', spec);
    const files = [];
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
        (0, util_1.dive)(model.main.msg.aim[name], 128).map((entry) => {
            var _a, _b;
            let path = ['aim', name, ...entry[0]];
            let msgMeta = (0, msg_1.MsgMetaShape)(entry[1]);
            let pin = (0, util_1.pinify)(path);
            if ((_b = (_a = msgMeta.transport) === null || _a === void 0 ? void 0 : _a.queue) === null || _b === void 0 ? void 0 : _b.active) {
                complete += `
  seneca.listen({type:'sqs',pin:'${pin}'})`;
            }
        });
        (0, util_1.dive)(model.main.srv[name].out, 128).map((entry) => {
            var _a, _b;
            let path = entry[0];
            let msgMetaMaybe = (0, util_1.get)(model.main.msg, path);
            // console.log(name, path, msgMetaMaybe)
            if (msgMetaMaybe === null || msgMetaMaybe === void 0 ? void 0 : msgMetaMaybe.$) {
                let msgMeta = (0, msg_1.MsgMetaShape)(msgMetaMaybe === null || msgMetaMaybe === void 0 ? void 0 : msgMetaMaybe.$);
                let pin = (0, util_1.pinify)(path);
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
        const content = (0, generate_1.renderFragment)(frag, {
            envFolder,
            start,
            name,
            complete,
            modify,
            prepare,
            handler,
        });
        files.push({ name: name + '.' + lang, content });
    });
    if (0 < files.length) {
        await (0, generate_1.generate)(spec.folder, files);
    }
};
exports.srv_handler = srv_handler;
//# sourceMappingURL=srv_handler.js.map