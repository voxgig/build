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
    }) => void;
    resources_yml: (model: any, spec: {
        folder: string;
        custom: string;
    }) => void;
};
export { EnvLambda };
