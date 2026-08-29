declare function indent(text: string, size: number): string;
declare function ismsgdef(val: any): boolean;
declare function msgentries(node: any, depth?: number): [string[], any][];
declare function aimmsgs(msg: any, aim: string): [string[], any][];
declare function msgindex(msg: any): Record<string, any>;
export { indent, ismsgdef, msgentries, aimmsgs, msgindex, };
