declare const ENV_FILES: Record<string, {
    frag: string;
    out: string;
}[]>;
declare const ENV_SRC: Record<string, {
    frag: string;
    dir: string;
    out: string;
}[]>;
declare const KINDS: string[];
declare const env_gen: (model: any, spec: {
    folder: string;
    tm?: string;
    src?: string;
}) => Promise<void>;
export { env_gen, ENV_FILES, ENV_SRC, KINDS, };
