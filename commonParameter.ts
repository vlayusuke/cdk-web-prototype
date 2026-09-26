// Parameters for common
export interface commonParameter {
    projectName: string;
    dashboardName: string;
    nakedDomainName: string;
    auroraMaxConnections: number;
    lambdaConcurrentExecutions: number;
    availabilityZones: [string, string];
}

// Parameters for common
export const commonParameter: commonParameter = {
    projectName: "cdk-web",
    dashboardName: "cdk-web-prototype",
    nakedDomainName: "example.com",
    auroraMaxConnections: 512,
    lambdaConcurrentExecutions: 1000,
    availabilityZones: ["ap-northeast-1a", "ap-northeast-1c"],
};
