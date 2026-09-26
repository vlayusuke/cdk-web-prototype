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

export type PocParameterDefaults = Omit<
    PocParameter,
    | "monitoringNotifyEmail"
    | "monitoringSlackWorkspaceId"
    | "monitoringSlackChannelId"
>;

export interface PocContextParameter {
    account?: string;
    region?: string;
    monitoringNotifyEmail?: string;
    monitoringSlackWorkspaceId?: string;
    monitoringSlackChannelId?: string;
}

export const pocParameter: PocParameterDefaults = {
    envName: "poc",
    vpcCidr: "10.50.0.0/16",
    defaultGatewayCidr: "0.0.0.0/0",
};

export const loadPocParameter = (context: unknown): PocParameter => {
    const contextParameter = (context ?? {}) as PocContextParameter;
    const requiredValue = (key: keyof PocContextParameter): string => {
        const value = contextParameter[key];
        if (typeof value !== "string" || value.trim() === "") {
            throw new Error(`Missing required CDK context value: poc.${key}`);
        }
        return value;
    };

    return {
        ...pocParameter,
        env: {
            account: contextParameter.account,
            region: contextParameter.region ?? "ap-northeast-1",
        },
        monitoringNotifyEmail: requiredValue("monitoringNotifyEmail"),
        monitoringSlackWorkspaceId: requiredValue("monitoringSlackWorkspaceId"),
        monitoringSlackChannelId: requiredValue("monitoringSlackChannelId"),
    };
};
