declare const srv_handler: (model: any, spec: {
    folder: string;
    start?: string;
    env?: {
        folder: string;
    };
    lang?: string;
    tm?: string;
}) => Promise<void>;
export { srv_handler, };
