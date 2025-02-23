declare module '*/amplify_outputs.json' {
    interface AmplifyOutputs {
        version: string;
        auth?: {
            userPoolId: string;
            userPoolClientId: string;
            region?: string;
            identityPoolId?: string;
        };
        api?: {
            GraphQL?: {
                endpoint: string;
                region: string;
            };
            REST?: {
                [key: string]: {
                    endpoint: string;
                    region: string;
                };
            };
        };
        storage?: {
            S3?: {
                bucket: string;
                region: string;
            };
        };
    }

    const outputs: AmplifyOutputs;
    export default outputs;
} 