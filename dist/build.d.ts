export declare const EntShape: {
    <V>(root?: V | undefined, ctx?: import("gubu").Context | undefined): V & {
        id: {
            field: string;
        };
        field: import("gubu").Node<{}>;
        resource: import("gubu").Node<{
            name: string;
        }>;
        dynamo: import("gubu").Node<{
            active: boolean;
            prefix: string;
            suffix: string;
        }>;
        stage: import("gubu").Node<{
            active: boolean;
        }>;
        custom: import("gubu").Node<StringConstructor>;
    };
    valid: <V_1>(root?: V_1 | undefined, ctx?: import("gubu").Context | undefined) => root is V_1 & {
        id: {
            field: string;
        };
        field: import("gubu").Node<{}>;
        resource: import("gubu").Node<{
            name: string;
        }>;
        dynamo: import("gubu").Node<{
            active: boolean;
            prefix: string;
            suffix: string;
        }>;
        stage: import("gubu").Node<{
            active: boolean;
        }>;
        custom: import("gubu").Node<StringConstructor>;
    };
    match(root?: any, ctx?: import("gubu").Context | undefined): boolean;
    error(root?: any, ctx?: import("gubu").Context | undefined): {
        gubu: boolean;
        code: string;
        prefix: string;
        props: {
            path: string;
            type: string;
            value: any;
        }[];
        desc: () => {
            name: string;
            code: string;
            err: {
                k: string;
                n: import("gubu").Node<any>;
                v: any;
                p: string;
                w: string;
                c: string;
                a: Record<string, any>;
                m: number;
                t: string;
                u: any;
            }[];
            ctx: any;
        };
        toJSON(): any & {
            err: any;
            name: string;
            message: string;
        };
        name: string;
        message: string;
        stack?: string | undefined;
    }[];
    spec(): any;
    node(): import("gubu").Node<{
        id: {
            field: string;
        };
        field: import("gubu").Node<{}>;
        resource: import("gubu").Node<{
            name: string;
        }>;
        dynamo: import("gubu").Node<{
            active: boolean;
            prefix: string;
            suffix: string;
        }>;
        stage: import("gubu").Node<{
            active: boolean;
        }>;
        custom: import("gubu").Node<StringConstructor>;
    }>;
    stringify(shape?: any): string;
    toString(): string;
    gubu: {
        gubu$: symbol;
        v$: string;
    };
};
declare const EnvLambda: {
    srv_yml: (model: any, spec: {
        folder: string;
    }) => void;
    srv_handler: (model: any, spec: {
        folder: string;
        start?: string;
        env?: {
            folder: string;
        };
        lang?: string;
    }) => void;
    resources_yml: (model: any, spec: {
        folder: string;
        filename: string;
        custom: string;
    }) => void;
    main_tf: (model: any, spec: {
        folder: any;
        filename: string;
    }) => void;
    modules_tf: (model: any, spec: {
        folder: any;
        filename: string;
    }) => void;
};
export { EnvLambda };
