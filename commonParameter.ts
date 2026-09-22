// Parameters for common
export interface commonParameter {
    projectName: string;
    dashboardName: string;
    nakedDomainName: string;
    auroraMaxConnections: number;
}

// Parameters for common
export const commonParameter: commonParameter = {
    projectName: "cdk-web",
    dashboardName: "cdk-web-prototype",
    nakedDomainName: "example.com",
    auroraMaxConnections: 512,
};
