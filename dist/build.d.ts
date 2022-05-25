declare const EnvLambda: {
    srv_yml: (model: any, spec: {
        folder: string;
    }) => void;
    srv_handler: (model: any, spec: {
        folder: string;
    }) => void;
};
export { EnvLambda };
