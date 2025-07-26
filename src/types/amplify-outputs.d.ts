declare module '*/amplify_outputs.json' {
    interface AmplifyOutputs {
        version: string;
        auth?: {
            user_pool_id?: string;
            user_pool_client_id?: string;
            identity_pool_id?: string;
            oauth?: any;
            aws_region?: string;
            mfa_configuration?: string;
            mfa_methods?: string[];
            password_policy?: any;
            standard_required_attributes?: string[];
            username_attributes?: string[];
            user_verification_types?: string[];
            unauthenticated_identities_enabled?: boolean;
        };
        data?: {
            url: string;
            aws_region: string;
            api_key?: string;
            default_authorization_type: string;
            authorization_types?: string[];
            model_introspection?: any;
        };
        storage?: {
            aws_region: string;
            bucket_name: string;
        };
        custom?: any;
    }

    const outputs: AmplifyOutputs;
    export default outputs;
} 