declare const resources_yml: (model: any, spec: {
    folder: string;
    filename: string;
    custom: string;
    tm?: string;
}) => Promise<void>;
export { resources_yml, };
