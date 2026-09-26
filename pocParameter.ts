import type { Environment } from "aws-cdk-lib";

// Parameters for PoC Application
export interface PocParameter {
    env?: Environment;
    envName: string;
    monitoringNotifyEmail: string;
    monitoringSlackWorkspaceId: string;
    monitoringSlackChannelId: string;
    vpcCidr: string;
    defaultGatewayCidr: string;
}

// Parameters for PoC Information
export const pocParameter: PocParameter = {
    env: {
        account: "634989770450",
        region: "ap-northeast-1",
    },
    envName: "poc",
    monitoringNotifyEmail: "vlayusuke@gmail.com",
    vpcCidr: "10.50.0.0/16",
    defaultGatewayCidr: "0.0.0.0/0",
    monitoringSlackWorkspaceId: "T0B1D7KB0BD",
    monitoringSlackChannelId: "C0C3PJY7MM4",
};
