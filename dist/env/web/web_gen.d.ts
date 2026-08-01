declare const WEB_FILES: {
    frag: string;
    out: string;
}[];
declare const DEFAULT_USERS: {
    name: string;
    email: string;
    password: string;
}[];
declare const web_gen: (model: any, spec: {
    root: string;
    tm?: string;
    env?: any;
    force?: boolean;
}) => Promise<{
    created: string[];
    skipped: string[];
}>;
export { web_gen, WEB_FILES, DEFAULT_USERS, };
