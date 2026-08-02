type ApiSpec = {
    root: string;
};
declare const api_gen: (model: any, spec: ApiSpec) => Promise<{
    created: string[];
}>;
export { api_gen, };
