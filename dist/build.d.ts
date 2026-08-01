import { generate, empty, TM, loadFragment, renderFragment, listFragments } from './env/lambda/generate';
import { MsgMetaShape } from './shape/msg';
import { CoreConfShape, CloudConfShape } from './shape/conf';
import { res_dynamo_yml } from './yml/res_dynamo_yml';
declare const EnvLambda: {
    srv_yml: (model: any, spec: {
        folder: string;
        tm?: string;
    }) => Promise<void>;
    srv_handler: (model: any, spec: {
        folder: string;
        start?: string;
        env?: {
            folder: string;
        };
        lang?: string;
        tm?: string;
    }) => Promise<void>;
    resources_yml: (model: any, spec: {
        folder: string;
        filename: string;
        custom: string;
        tm?: string;
    }) => Promise<void>;
};
declare const EnvGen: {
    env_gen: (model: any, spec: {
        folder: string;
        tm?: string;
        src?: string;
        root?: string;
    }) => Promise<void>;
    files: Record<string, {
        frag: string;
        out: string;
    }[]>;
    srcfiles: Record<string, {
        frag: string;
        dir: string;
        out: string;
    }[]>;
    kinds: string[];
};
declare const EnvWeb: {
    web_gen: (model: any, spec: {
        root: string;
        tm?: string;
        env?: any;
        force?: boolean;
    }) => Promise<{
        created: string[];
        skipped: string[];
    }>;
    files: {
        frag: string;
        out: string;
    }[];
};
declare const Fragments: {
    load: typeof loadFragment;
    render: typeof renderFragment;
    list: typeof listFragments;
    folder: string;
};
export { EnvLambda, EnvGen, EnvWeb, Fragments, generate, empty, TM, loadFragment, renderFragment, MsgMetaShape, CoreConfShape, CloudConfShape, res_dynamo_yml, };
