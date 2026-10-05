import type { Environment } from "aws-cdk-lib";

// Parameters for Production Application
export interface DevParameter {
    env?: Environment;
    envName: string;
    monitoringNotifyEmail: string;
    monitoringSlackWorkspaceId: string;
    monitoringSlackChannelId: string;
    vpcCidr: string;
    defaultGatewayCidr: string;
    slackHookUrl: string;
}

export type DevParameterDefaults = Omit<
    DevParameter,
    | "monitoringNotifyEmail"
    | "monitoringSlackWorkspaceId"
    | "monitoringSlackChannelId"
    | "slackHookUrl"
>;

export interface DevContextParameter {
    account?: string;
    region?: string;
    monitoringNotifyEmail?: string;
    monitoringSlackWorkspaceId?: string;
    monitoringSlackChannelId?: string;
    slackHookUrl?: string;
}

export const devParameter: DevParameterDefaults = {
    env: {
        account: "634989770450",
        region: "ap-northeast-1",
    },
    envName: "dev",
    vpcCidr: "10.70.0.0/16",
    defaultGatewayCidr: "0.0.0.0/0",
};

export const loadDevParameter = (context: unknown): DevParameter => {
    const contextParameter = (context ?? {}) as DevContextParameter;
    const requiredValue = (key: keyof DevContextParameter): string => {
        const value = contextParameter[key];
        if (typeof value !== "string" || value.trim() === "") {
            throw new Error(`Missing required CDK context value: dev.${key}`);
        }
        return value;
    };

    return {
        ...devParameter,
        env: {
            account: contextParameter.account,
            region: contextParameter.region ?? "ap-northeast-1",
        },
        monitoringNotifyEmail: requiredValue("monitoringNotifyEmail"),
        monitoringSlackWorkspaceId: requiredValue("monitoringSlackWorkspaceId"),
        monitoringSlackChannelId: requiredValue("monitoringSlackChannelId"),
        slackHookUrl: requiredValue("slackHookUrl"),
    };
};
