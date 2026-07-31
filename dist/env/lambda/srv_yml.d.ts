declare const srv_yml: (model: any, spec: {
    folder: string;
    tm?: string;
}) => Promise<void>;
export { srv_yml, };
