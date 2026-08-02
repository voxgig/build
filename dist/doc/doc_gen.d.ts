type DocSpec = {
    root: string;
    srvfolder?: string;
};
declare const doc_gen: (model: any, spec: DocSpec) => Promise<{
    created: string[];
}>;
export { doc_gen, };
