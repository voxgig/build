declare const CloudConfShape: {
    <V>(root?: V | undefined, ctx?: import("gubu").Context): V & {
        aws: {
            region: string;
            accountid: string;
            bedrock: {
                model: string;
            };
        };
    };
    valid: <V>(root?: V | undefined, ctx?: import("gubu").Context) => root is V & {
        aws: {
            region: string;
            accountid: string;
            bedrock: {
                model: string;
            };
        };
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
        aws: {
            region: string;
            accountid: string;
            bedrock: {
                model: string;
            };
        };
    }>;
    stringify(...rest: any[]): string;
    jsonify(): any;
    toString(): string;
    gubu: {
        gubu$: symbol;
        v$: string;
    };
};
declare const CoreConfShape: {
    <V>(root?: V | undefined, ctx?: import("gubu").Context): V & {
        name: StringConstructor;
    };
    valid: <V>(root?: V | undefined, ctx?: import("gubu").Context) => root is V & {
        name: StringConstructor;
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
        name: StringConstructor;
    }>;
    stringify(...rest: any[]): string;
    jsonify(): any;
    toString(): string;
    gubu: {
        gubu$: symbol;
        v$: string;
    };
};
export { CoreConfShape, CloudConfShape, };
