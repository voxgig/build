declare function res_dynamo_yml(model: any, spec: {
    region: string;
    accountid: string;
    dynamoResources: any[];
}): Promise<string>;
export { res_dynamo_yml };
