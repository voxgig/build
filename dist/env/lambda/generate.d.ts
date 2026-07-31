declare function generate(folder: string, files: {
    name: string;
    content: string;
}[]): Promise<void>;
declare function empty(o: any): boolean;
declare function TM(str: string): string;
export { generate, empty, TM, };
