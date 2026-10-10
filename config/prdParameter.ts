import type { Environment } from "aws-cdk-lib";

// Parameters for Production environment Application
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

    // Load sensitive parameters from cdk.context.json
    const requiredValue = (key: keyof PrdContextParameter): string => {
        const contextValue = contextParameter[key];

        if (typeof contextValue !== "string" || contextValue.trim() === "") {
            throw new Error(`Missing required CDK context value: prd.${key}`);
        }
        return contextValue;
    };

    return {
        ...prdParameter,
        monitoringNotifyEmail: requiredValue("monitoringNotifyEmail"),
        monitoringSlackWorkspaceId: requiredValue("monitoringSlackWorkspaceId"),
        monitoringSlackChannelId: requiredValue("monitoringSlackChannelId"),
        slackHookUrl: requiredValue("slackHookUrl"),
    };
};
