declare const EntShape: {
    <V>(root?: V | undefined, ctx?: import("gubu").Context): V & {
        id: {
            field: string;
        };
        title: string;
        field: import("gubu").Node<{}>;
        valid: import("gubu").Node<{}>;
        index: import("gubu").Node<{}>;
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
    valid: <V>(root?: V | undefined, ctx?: import("gubu").Context) => root is V & {
        id: {
            field: string;
        };
        title: string;
        field: import("gubu").Node<{}>;
        valid: import("gubu").Node<{}>;
        index: import("gubu").Node<{}>;
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
    match(root?: any, ctx?: import("gubu").Context): boolean;
    error(root?: any, ctx?: import("gubu").Context): {
        gubu: boolean;
        code: string;
        prefix: string;
        props: ({
            path: string;
            type: string;
            value: any;
        }[]);
        desc: () => ({
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
        });
        toJSON(): any & {
            err: any;
            name: string;
            message: string;
        };
        name: string;
        message: string;
        stack?: string;
    }[];
    spec(): any;
    node(): import("gubu").Node<{
        id: {
            field: string;
        };
        title: string;
        field: import("gubu").Node<{}>;
        valid: import("gubu").Node<{}>;
        index: import("gubu").Node<{}>;
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
    stringify(...rest: any[]): string;
    jsonify(): any;
    toString(): string;
    gubu: {
        gubu$: symbol;
        v$: string;
    };
};
export { EntShape };
