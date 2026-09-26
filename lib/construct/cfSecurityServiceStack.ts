import * as cdk from "aws-cdk-lib";
import { aws_iam as iam, aws_s3 as s3, aws_wafv2 as wafv2 } from "aws-cdk-lib";
import type * as kms from "aws-cdk-lib/aws-kms";
import { Construct } from "constructs";

export interface commonProps {
    projectName: string;
    envName: string;
}

export interface pocProps {
    vpcCidr: string;
    defaultGatewayCidr: string;
}

export interface kmsProps {
    s3Key: kms.IKey;
}

// ------------------------------------------------------------
// [05] - Security Service Stack
// ------------------------------------------------------------
export class cfSecurityServiceStack extends Construct {
    public readonly wafv2WebACL: wafv2.CfnWebACL;

    constructor(
        scope: Construct,
        id: string,
        props: kmsProps,
        commonProps: commonProps,
    ) {
        super(scope, id);

        // ------------------------------------------------------------
        // Amazon S3 for AWS WAFv2 Logs Configuration
        // ------------------------------------------------------------
        // WAF requires the S3 logging destination bucket name to start with 'aws-waf-logs-'.
        const s3WAFv2LogsBucket = new s3.Bucket(this, "s3WAFv2LogsBucket", {
            bucketName: `aws-waf-logs-${commonProps.projectName}-${commonProps.envName}-s3-wafv2logs`,
            versioned: true,
            accessControl: s3.BucketAccessControl.PRIVATE,
            encryptionKey: props.s3Key,
            encryption: s3.BucketEncryption.KMS,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            enforceSSL: true,
            blockedEncryptionTypes: [s3.BlockedEncryptionType.SSE_C],
        });

        cdk.Tags.of(s3WAFv2LogsBucket).add(
            "Name",
            `aws-waf-logs-${commonProps.projectName}-${commonProps.envName}-s3-wafv2logs`,
        );
        cdk.Tags.of(s3WAFv2LogsBucket).add("ProvisionedBy", "AWS");

        // Allow WAF log delivery to use the customer-managed KMS key encrypting the bucket.
        props.s3Key.addToResourcePolicy(
            new iam.PolicyStatement({
                sid: "AllowWafLogDeliveryToUseKey",
                effect: iam.Effect.ALLOW,
                actions: ["kms:GenerateDataKey*"],
                resources: ["*"],
                principals: [
                    new iam.ServicePrincipal("delivery.logs.amazonaws.com"),
                ],
            }),
        );

        // ------------------------------------------------------------
        // AWS WAFv2 Web ACLs Configuration
        // ------------------------------------------------------------
        this.wafv2WebACL = new wafv2.CfnWebACL(this, "wafv2WebACL", {
            name: "wafv2WebACL",
            scope: "CLOUDFRONT",
            defaultAction: { allow: {} },
            visibilityConfig: {
                cloudWatchMetricsEnabled: true,
                metricName: "wafv2WebACL",
                sampledRequestsEnabled: true,
            },
            rules: [
                {
                    name: "AWSManagedRulesCommonRuleSet",
                    priority: 1,
                    statement: {
                        managedRuleGroupStatement: {
                            vendorName: "AWS",
                            name: "AWSManagedRulesCommonRuleSet",
                        },
                    },
                    visibilityConfig: {
                        cloudWatchMetricsEnabled: true,
                        metricName: "AWSManagedRulesCommonRuleSet",
                        sampledRequestsEnabled: true,
                    },
                },
                {
                    name: "AWSManagedRulesKnownBadInputsRuleSet",
                    priority: 2,
                    statement: {
                        managedRuleGroupStatement: {
                            vendorName: "AWS",
                            name: "AWSManagedRulesKnownBadInputsRuleSet",
                        },
                    },
                    visibilityConfig: {
                        cloudWatchMetricsEnabled: true,
                        metricName: "AWSManagedRulesKnownBadInputsRuleSet",
                        sampledRequestsEnabled: true,
                    },
                },
                {
                    name: "AWSManagedRulesSQLiRuleSet",
                    priority: 3,
                    statement: {
                        managedRuleGroupStatement: {
                            vendorName: "AWS",
                            name: "AWSManagedRulesSQLiRuleSet",
                        },
                    },
                    visibilityConfig: {
                        cloudWatchMetricsEnabled: true,
                        metricName: "AWSManagedRulesSQLiRuleSet",
                        sampledRequestsEnabled: true,
                    },
                },
                {
                    name: "AWSManagedRulesAnonymousIpList",
                    priority: 4,
                    statement: {
                        managedRuleGroupStatement: {
                            vendorName: "AWS",
                            name: "AWSManagedRulesAnonymousIpList",
                        },
                    },
                    visibilityConfig: {
                        cloudWatchMetricsEnabled: true,
                        metricName: "AWSManagedRulesAnonymousIpList",
                        sampledRequestsEnabled: true,
                    },
                },
                {
                    name: `AWSManagedRulesLinuxRuleSet`,
                    priority: 5,
                    statement: {
                        managedRuleGroupStatement: {
                            vendorName: "AWS",
                            name: "AWSManagedRulesLinuxRuleSet",
                        },
                    },
                    visibilityConfig: {
                        cloudWatchMetricsEnabled: true,
                        metricName: "AWSManagedRulesLinuxRuleSet",
                        sampledRequestsEnabled: true,
                    },
                },
                {
                    name: "AWSManagedRulesBotControlRuleSet",
                    priority: 6,
                    statement: {
                        managedRuleGroupStatement: {
                            vendorName: "AWS",
                            name: "AWSManagedRulesBotControlRuleSet",
                        },
                    },
                    visibilityConfig: {
                        cloudWatchMetricsEnabled: true,
                        metricName: "AWSManagedRulesBotControlRuleSet",
                        sampledRequestsEnabled: true,
                    },
                },
                {
                    name: "AWSManagedRulesAntiDDoSRuleSet",
                    priority: 7,
                    statement: {
                        managedRuleGroupStatement: {
                            vendorName: "AWS",
                            name: "AWSManagedRulesAntiDDoSRuleSet",
                        },
                    },
                    visibilityConfig: {
                        cloudWatchMetricsEnabled: true,
                        metricName: "AWSManagedRulesAntiDDoSRuleSet",
                        sampledRequestsEnabled: true,
                    },
                },
            ],
        });

        cdk.Tags.of(this).add(
            "Name",
            `aws-waf-logs-${commonProps.projectName}-${commonProps.envName}-wafv2-webacl`,
        );
        cdk.Tags.of(this).add("ProvisionedBy", "AWS");

        // ------------------------------------------------------------
        // AWS WAFv2 Logging Configuration
        // ------------------------------------------------------------
        new cdk.aws_wafv2.CfnLoggingConfiguration(
            this,
            "wafv2LoggingConfiguration",
            {
                resourceArn: this.wafv2WebACL.attrArn,
                logDestinationConfigs: [s3WAFv2LogsBucket.bucketArn],
            },
        );
    }
}
