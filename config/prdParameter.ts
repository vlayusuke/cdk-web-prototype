import type { Environment } from "aws-cdk-lib";

// Parameters for Production Application
export interface PrdParameter {
    env?: Environment;
    envName: string;
    monitoringNotifyEmail: string;
    monitoringSlackWorkspaceId: string;
    monitoringSlackChannelId: string;
    vpcCidr: string;
    defaultGatewayCidr: string;
    slackHookUrl: string;
}

export type PrdParameterDefaults = Omit<
    PrdParameter,
    | "monitoringNotifyEmail"
    | "monitoringSlackWorkspaceId"
    | "monitoringSlackChannelId"
    | "slackHookUrl"
>;

export interface PrdContextParameter {
    account?: string;
    region?: string;
    monitoringNotifyEmail?: string;
    monitoringSlackWorkspaceId?: string;
    monitoringSlackChannelId?: string;
    slackHookUrl?: string;
}

export const prdParameter: PrdParameterDefaults = {
    env: {
        account: "634989770450",
        region: "ap-northeast-1",
    },
    envName: "prd",
    vpcCidr: "10.50.0.0/16",
    defaultGatewayCidr: "0.0.0.0/0",
};

export const loadPrdParameter = (context: unknown): PrdParameter => {
    const contextParameter = (context ?? {}) as PrdContextParameter;
    const requiredValue = (key: keyof PrdContextParameter): string => {
        const value = contextParameter[key];
        if (typeof value !== "string" || value.trim() === "") {
            throw new Error(`Missing required CDK context value: prd.${key}`);
        }
        return value;
    };

    return {
        ...prdParameter,
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
