import * as cdk from "aws-cdk-lib";
import { aws_iam as iam, aws_s3 as s3, aws_wafv2 as wafv2 } from "aws-cdk-lib";
import type * as kms from "aws-cdk-lib/aws-kms";
import { Construct } from "constructs";

export interface CommonProps {
    projectName: string;
    dashboardName: string;
}

export interface EnvProps {
    envName: string;
    vpcCidr: string;
    defaultGatewayCidr: string;
}

export interface KmsProps {
    s3Key: kms.IKey;
}

// ------------------------------------------------------------
// [05] - Security Service Stack
// ------------------------------------------------------------
export class CfSecurityServiceStack extends Construct {
    public readonly wafv2WebACL: wafv2.CfnWebACL;

    constructor(
        scope: Construct,
        id: string,
        commonProps: CommonProps,
        envProps: EnvProps,
        kmsProps: KmsProps,
    ) {
        super(scope, id);

        // ------------------------------------------------------------
        // Amazon S3 for AWS WAFv2 Logs Configuration
        // ------------------------------------------------------------
        // WAF requires the S3 logging destination bucket name to start with 'aws-waf-logs-'.
        // Wrapper scope keeps the construct paths (and logical IDs) of the former L2 bucket.
        const s3WAFv2LogsBucketScope = new Construct(this, "s3WAFv2LogsBucket");
        const s3WAFv2LogsBucketName = `aws-waf-logs-${commonProps.projectName}-${envProps.envName}-s3-wafv2logs`;

        const s3WAFv2LogsBucket = new s3.CfnBucket(
            s3WAFv2LogsBucketScope,
            "Resource",
            {
                bucketName: s3WAFv2LogsBucketName,
                accessControl: "Private",
                versioningConfiguration: { status: "Enabled" },
                bucketEncryption: {
                    serverSideEncryptionConfiguration: [
                        {
                            serverSideEncryptionByDefault: {
                                sseAlgorithm: "aws:kms",
                                kmsMasterKeyId: kmsProps.s3Key.keyArn,
                            },
                            blockedEncryptionTypes: {
                                encryptionType: ["SSE-C"],
                            },
                        },
                    ],
                },
                publicAccessBlockConfiguration: {
                    blockPublicAcls: true,
                    blockPublicPolicy: true,
                    ignorePublicAcls: true,
                    restrictPublicBuckets: true,
                },
            },
        );

        s3WAFv2LogsBucket.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);

        // enforceSSL equivalent: deny any request that does not use TLS.
        new s3.CfnBucketPolicy(s3WAFv2LogsBucketScope, "Policy", {
            bucket: s3WAFv2LogsBucket.ref,
            policyDocument: {
                Version: "2012-10-17",
                Statement: [
                    {
                        Effect: "Deny",
                        Principal: { AWS: "*" },
                        Action: "s3:*",
                        Resource: [
                            s3WAFv2LogsBucket.attrArn,
                            `${s3WAFv2LogsBucket.attrArn}/*`,
                        ],
                        Condition: { Bool: { "aws:SecureTransport": "false" } },
                    },
                ],
            },
        });

        cdk.Tags.of(s3WAFv2LogsBucketScope).add("Name", s3WAFv2LogsBucketName);
        cdk.Tags.of(s3WAFv2LogsBucketScope).add("ProvisionedBy", "AWS");
        cdk.Tags.of(s3WAFv2LogsBucketScope).add("ProjectCode", "1234567890");

        // Allow WAF log delivery to use the customer-managed KMS key encrypting the bucket.
        kmsProps.s3Key.addToResourcePolicy(
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
            `aws-waf-logs-${commonProps.projectName}-${envProps.envName}-wafv2-webacl`,
        );
        cdk.Tags.of(this).add("ProvisionedBy", "AWS");
        cdk.Tags.of(this).add("ProjectCode", "1234567890");

        // ------------------------------------------------------------
        // AWS WAFv2 Logging Configuration
        // ------------------------------------------------------------
        new cdk.aws_wafv2.CfnLoggingConfiguration(
            this,
            "wafv2LoggingConfiguration",
            {
                resourceArn: this.wafv2WebACL.attrArn,
                logDestinationConfigs: [s3WAFv2LogsBucket.attrArn],
            },
        );
    }
}
