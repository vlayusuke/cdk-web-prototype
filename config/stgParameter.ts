import type { Environment } from "aws-cdk-lib";

// Parameters for Staging Application
export interface StgParameter {
    env?: Environment;
    envName: string;
    monitoringNotifyEmail: string;
    monitoringSlackWorkspaceId: string;
    monitoringSlackChannelId: string;
    vpcCidr: string;
    defaultGatewayCidr: string;
    slackHookUrl: string;
}

export type StgParameterDefaults = Omit<
    StgParameter,
    | "monitoringNotifyEmail"
    | "monitoringSlackWorkspaceId"
    | "monitoringSlackChannelId"
    | "slackHookUrl"
>;

export interface StgContextParameter {
    account?: string;
    region?: string;
    monitoringNotifyEmail?: string;
    monitoringSlackWorkspaceId?: string;
    monitoringSlackChannelId?: string;
    slackHookUrl?: string;
}

export const stgParameter: StgParameterDefaults = {
    env: {
        account: "634989770450",
        region: "ap-northeast-1",
    },
    envName: "stg",
    vpcCidr: "10.60.0.0/16",
    defaultGatewayCidr: "0.0.0.0/0",
};

export const loadStgParameter = (context: unknown): StgParameter => {
    const contextParameter = (context ?? {}) as StgContextParameter;
    const requiredValue = (key: keyof StgContextParameter): string => {
        const value = contextParameter[key];
        if (typeof value !== "string" || value.trim() === "") {
            throw new Error(`Missing required CDK context value: stg.${key}`);
        }
        return value;
    };

    return {
        ...stgParameter,
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
