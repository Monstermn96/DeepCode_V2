declare module "*.json" {
    const value: any;
    export default value;
}

declare module "/app/*.json" {
    const value: any;
    export default value;
} 