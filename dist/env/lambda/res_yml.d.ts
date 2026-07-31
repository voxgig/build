declare const resources_yml: (model: any, spec: {
    folder: string;
    filename: string;
    custom: string;
}) => Promise<void>;
export { resources_yml, };
