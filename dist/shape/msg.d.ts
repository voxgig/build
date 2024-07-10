declare const MsgMetaShape: {
    <V>(root?: V | undefined, ctx?: import("gubu").Context): V & {
        file: import("gubu").Node<StringConstructor>;
        params: import("gubu").Node<{}>;
        transport: import("gubu").Node<{
            queue: {
                active: boolean;
                timeout: NumberConstructor;
                suffix: StringConstructor;
            };
        }>;
    };
    valid: <V>(root?: V | undefined, ctx?: import("gubu").Context) => root is V & {
        file: import("gubu").Node<StringConstructor>;
        params: import("gubu").Node<{}>;
        transport: import("gubu").Node<{
            queue: {
                active: boolean;
                timeout: NumberConstructor;
                suffix: StringConstructor;
            };
        }>;
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
        file: import("gubu").Node<StringConstructor>;
        params: import("gubu").Node<{}>;
        transport: import("gubu").Node<{
            queue: {
                active: boolean;
                timeout: NumberConstructor;
                suffix: StringConstructor;
            };
        }>;
    }>;
    stringify(...rest: any[]): string;
    jsonify(): any;
    toString(): string;
    gubu: {
        gubu$: symbol;
        v$: string;
    };
};
export { MsgMetaShape };
