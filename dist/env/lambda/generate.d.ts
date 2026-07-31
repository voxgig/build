declare const PKG_TM_ROOT: string;
declare const PKG_TM: string;
declare function loadFragment(name: string, spec?: {
    tm?: string;
}, area?: string): string;
declare function renderFragment(src: string, slots: Record<string, any>): string;
declare function listFragments(): string[];
declare function generate(folder: string, files: {
    name: string;
    content: string;
}[]): Promise<void>;
declare function empty(o: any): boolean;
declare function TM(str: string): string;
export { generate, empty, TM, loadFragment, renderFragment, listFragments, PKG_TM, PKG_TM_ROOT, };
