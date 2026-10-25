import { join } from "node:path";
import * as cdk from "aws-cdk-lib";
import {
    aws_events as events,
    aws_iam as iam,
    aws_lambda as lambda,
} from "aws-cdk-lib";
import type * as kms from "aws-cdk-lib/aws-kms";
import type * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

export interface CommonProps {
    projectName: string;
    dashboardName: string;
}

export interface EnvProps {
    envName: string;
    vpcCidr: string;
    defaultGatewayCidr: string;
    slackHookUrl: string;
}

export interface KmsProps {
    lambdaKey: kms.IKey;
}

export interface CloudWatchLogsProps {
    logGroupLambdaRdsControl: logs.CfnLogGroup;
    logGroupLambdaCloudWatchLogsAlert: logs.CfnLogGroup;
    logGroupLambdaCloudWatchMetricsAlert: logs.CfnLogGroup;
}

export interface DatabaseProps {
    auroraClusterArn: string;
    auroraWriterInstanceArn: string;
    auroraReaderInstanceArn: string;
    elastiCacheReplicationGroupArn: string;
}

// ------------------------------------------------------------
// [15] - Compute Serverless Stack
// ------------------------------------------------------------
export class CfComputeServerlessStack extends Construct {
    public readonly lambdaCloudWatchLogsAlert: lambda.Function;
    public readonly lambdaCloudWatchMetricsAlert: lambda.Function;

    constructor(
        scope: Construct,
        id: string,
        kmsProps: KmsProps,
        cloudWatchLogsProps: CloudWatchLogsProps,
        databaseProps: DatabaseProps,
        commonProps: CommonProps,
        envProps: EnvProps,
    ) {
        super(scope, id);

        const stack = cdk.Stack.of(this);
        const prefix = `${commonProps.projectName}-${envProps.envName}`;

        // L1 resources live under a wrapper scope with the id "Resource" so that
        // construct paths (and logical IDs) match the former L2 constructs.
        const wrap = (wrapperId: string, name: string): Construct => {
            const wrapper = new Construct(this, wrapperId);
            cdk.Tags.of(wrapper).add("Name", name);
            cdk.Tags.of(wrapper).add("ProvisionedBy", "AWS");
            cdk.Tags.of(wrapper).add("ProjectCode", "1234567890");
            return wrapper;
        };

        const allow = (
            sid: string,
            actions: string[],
            resources: string[],
        ) => ({
            Sid: sid,
            Effect: "Allow",
            Action: actions,
            Resource: resources,
        });

        const logsActions = [
            "logs:CreateLogGroup",
            "logs:CreateLogStream",
            "logs:PutLogEvents",
        ];

        const kmsActions = [
            "kms:Decrypt",
            "kms:Encrypt",
            "kms:GenerateDataKey",
        ];

        const firehoseActions = [
            "firehose:PutRecord",
            "firehose:PutRecordBatch",
        ];

        const firehoseArn = `arn:aws:firehose:${stack.region}:${stack.account}:*`;
        const snsArn = `arn:aws:sns:${stack.region}:${stack.account}:*`;

        // ------------------------------------------------------------
        // AWS IAM for AWS Lambda (cloudwatch-log-alert) Configuration
        // ------------------------------------------------------------
        const iamLambdaCloudWatchLogsAlertRole = new iam.Role(
            this,
            "iamLambdaCloudWatchLogsAlertRole",
            {
                roleName: `${commonProps.projectName}-${envProps.envName}-lambda-cloudwatch-logs-alert-role`,
                description: `IAM role for Lambda functions (cloudwatch-log-alert) in the ${commonProps.projectName} project`,
                assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
            },
        );

        cdk.Tags.of(iamLambdaCloudWatchLogsAlertRole).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-iam-lambda-role`,
        );
        cdk.Tags.of(iamLambdaCloudWatchLogsAlertRole).add(
            "ProvisionedBy",
            "AWS",
        );
        cdk.Tags.of(iamLambdaCloudWatchLogsAlertRole).add(
            "ProjectCode",
            "1234567890",
        );

        new iam.CfnPolicy(
            wrap(
                "iamLambdaCloudWatchLogsAlertPolicy",
                `${prefix}-iam-lambda-policy`,
            ),
            "Resource",
            {
                policyName: `${prefix}-LambdaPolicy`,
                roles: [iamLambdaCloudWatchLogsAlertRole.roleName],
                policyDocument: {
                    Version: "2012-10-17",
                    Statement: [
                        allow("CloudWatchLogsAccess", logsActions, [
                            cloudWatchLogsProps
                                .logGroupLambdaCloudWatchLogsAlert.attrArn,
                        ]),
                        allow("KMSAccess", kmsActions, [
                            kmsProps.lambdaKey.keyArn,
                        ]),
                        allow("ADFAccess", firehoseActions, [firehoseArn]),
                    ],
                },
            },
        );

        // ------------------------------------------------------------
        // AWS IAM for AWS Lambda (cloudwatch-metrics-alert) Configuration
        // ------------------------------------------------------------
        const iamLambdaCloudWatchMetricsAlertRole = new iam.Role(
            this,
            "iamLambdaCloudWatchMetricsAlertRole",
            {
                roleName: `${commonProps.projectName}-${envProps.envName}-lambda-cloudwatch-metrics-alert-role`,
                description: `IAM role for Lambda functions (cloudwatch-metrics-alert) in the ${commonProps.projectName} project`,
                assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
            },
        );

        cdk.Tags.of(iamLambdaCloudWatchMetricsAlertRole).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-iam-lambda-cloudwatch-metrics-alert-role`,
        );
        cdk.Tags.of(iamLambdaCloudWatchMetricsAlertRole).add(
            "ProvisionedBy",
            "AWS",
        );
        cdk.Tags.of(iamLambdaCloudWatchMetricsAlertRole).add(
            "ProjectCode",
            "1234567890",
        );

        new iam.CfnPolicy(
            wrap(
                "lambdaCloudWatchMetricsAlertPolicy",
                `${prefix}-lambda-cloudwatch-metrics-alert-policy`,
            ),
            "Resource",
            {
                policyName: `${prefix}-lambda-cloudwatch-metrics-alert-policy`,
                roles: [iamLambdaCloudWatchMetricsAlertRole.roleName],
                policyDocument: {
                    Version: "2012-10-17",
                    Statement: [
                        allow("CloudWatchLogsAccess", logsActions, [
                            cloudWatchLogsProps
                                .logGroupLambdaCloudWatchMetricsAlert.attrArn,
                        ]),
                        allow("KMSAccess", kmsActions, [
                            kmsProps.lambdaKey.keyArn,
                        ]),
                        allow("ADFAccess", firehoseActions, [firehoseArn]),
                        allow("SNSPublish", ["sns:Publish"], [snsArn]),
                    ],
                },
            },
        );

        // ------------------------------------------------------------
        // AWS IAM for AWS Lambda (rds-control) Configuration
        // ------------------------------------------------------------
        const iamLambdaRdsControlRole = new iam.CfnRole(
            wrap(
                "iamLambdaRdsControlRole",
                `${prefix}-iam-lambda-rds-control-role`,
            ),
            "Resource",
            {
                roleName: `${prefix}-lambda-rds-control-role`,
                description: `IAM role for Lambda functions (rds-control) in the ${commonProps.projectName} project`,
                assumeRolePolicyDocument: {
                    Version: "2012-10-17",
                    Statement: [
                        {
                            Effect: "Allow",
                            Principal: { Service: "lambda.amazonaws.com" },
                            Action: "sts:AssumeRole",
                        },
                    ],
                },
            },
        );

        new iam.CfnPolicy(
            wrap(
                "lambdaRdsControlPolicy",
                `${prefix}-lambda-rds-control-policy`,
            ),
            "Resource",
            {
                policyName: `${prefix}-lambda-rds-control-policy`,
                roles: [iamLambdaRdsControlRole.ref],
                policyDocument: {
                    Version: "2012-10-17",
                    Statement: [
                        allow("CloudWatchLogsAccess", logsActions, [
                            `arn:aws:logs:${stack.region}:${stack.account}:log-group:/aws/lambda/*`,
                        ]),
                        allow(
                            "RDSAccess",
                            [
                                "rds:DescribeDBClusters",
                                "rds:DescribeDBInstances",
                                "rds:StartDBCluster",
                                "rds:StopDBCluster",
                                "rds:ListTagsForResource",
                            ],
                            [
                                databaseProps.auroraClusterArn,
                                databaseProps.auroraWriterInstanceArn,
                                databaseProps.auroraReaderInstanceArn,
                            ],
                        ),
                        allow("ADFAccess", firehoseActions, [firehoseArn]),
                        allow("SNSPublish", ["sns:Publish"], [snsArn]),
                    ],
                },
            },
        );

        // ------------------------------------------------------------
        // AWS Lambda (cloudwatch-log-alert) Configuration
        // ------------------------------------------------------------
        const lambdaCloudWatchLogsAlert = new lambda.Function(
            this,
            "lambdaCloudWatchLogsAlert",
            {
                functionName: `${commonProps.projectName}-${envProps.envName}-cloudwatch-log-alert`,
                description: `Lambda function (cloudwatch-log-alert) in the ${commonProps.projectName} project`,
                code: lambda.Code.fromAsset(
                    join(__dirname, "../lambda/cloudwatch-logs-alert"),
                ),
                handler: "lambda_function.lambda_handler",
                runtime: lambda.Runtime.PYTHON_3_11,
                architecture: lambda.Architecture.ARM_64,
                memorySize: 128,
                timeout: cdk.Duration.seconds(30),
                role: iamLambdaCloudWatchLogsAlertRole,
                environmentEncryption: kmsProps.lambdaKey,
            },
        );

        this.lambdaCloudWatchLogsAlert = lambdaCloudWatchLogsAlert;

        this.lambdaCloudWatchLogsAlert.addPermission(
            "AllowExecutionFromCloudWatch",
            {
                principal: new iam.ServicePrincipal("logs.amazonaws.com"),
                action: "lambda:InvokeFunction",
            },
        );

        cdk.Tags.of(lambdaCloudWatchLogsAlert).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-cloudwatch-log-alert`,
        );
        cdk.Tags.of(lambdaCloudWatchLogsAlert).add("ProvisionedBy", "AWS");
        cdk.Tags.of(lambdaCloudWatchLogsAlert).add("ProjectCode", "1234567890");

        // ------------------------------------------------------------
        // AWS Lambda (cloudwatch-metrics-alert) Configuration
        // ------------------------------------------------------------
        const lambdaCloudWatchMetricsAlert = new lambda.Function(
            this,
            "lambdaCloudWatchMetricsAlert",
            {
                functionName: `${commonProps.projectName}-${envProps.envName}-cloudwatch-metrics-alert`,
                description: `Lambda function (cloudwatch-metrics-alert) in the ${commonProps.projectName} project`,
                code: lambda.Code.fromAsset(
                    join(__dirname, "../lambda/cloudwatch-metrics-alert"),
                ),
                handler: "lambda_function.lambda_handler",
                runtime: lambda.Runtime.PYTHON_3_11,
                architecture: lambda.Architecture.ARM_64,
                memorySize: 128,
                timeout: cdk.Duration.seconds(30),
                role: iamLambdaCloudWatchMetricsAlertRole,
                environmentEncryption: kmsProps.lambdaKey,
                environment: {
                    hookUrl: envProps.slackHookUrl,
                    target_region: cdk.Aws.REGION,
                },
            },
        );

        this.lambdaCloudWatchMetricsAlert = lambdaCloudWatchMetricsAlert;

        this.lambdaCloudWatchMetricsAlert.addPermission(
            "AllowExecutionFromCloudWatch",
            {
                principal: new iam.ServicePrincipal("logs.amazonaws.com"),
                action: "lambda:InvokeFunction",
            },
        );

        cdk.Tags.of(lambdaCloudWatchMetricsAlert).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-cloudwatch-metrics-alert`,
        );
        cdk.Tags.of(lambdaCloudWatchMetricsAlert).add("ProvisionedBy", "AWS");
        cdk.Tags.of(lambdaCloudWatchMetricsAlert).add(
            "ProjectCode",
            "1234567890",
        );

        // ------------------------------------------------------------
        // AWS Lambda (rds-control) Configuration
        // ------------------------------------------------------------
        const codeConfig = lambda.Code.fromAsset(
            join(__dirname, "../lambda/rds-control"),
        ).bind(this);

        const lambdaRdsControlScope = wrap(
            "lambdaRdsControl",
            `${prefix}-rds-control`,
        );

        const lambdaRdsControl = new lambda.CfnFunction(
            lambdaRdsControlScope,
            "Resource",
            {
                functionName: `${prefix}-rds-control`,
                description: `Lambda function (rds-control) in the ${commonProps.projectName} project`,
                code: {
                    s3Bucket: codeConfig.s3Location?.bucketName,
                    s3Key: codeConfig.s3Location?.objectKey,
                },
                handler: "lambda_function.lambda_handler",
                runtime: "python3.11",
                architectures: ["arm64"],
                memorySize: 128,
                timeout: 30,
                role: iamLambdaRdsControlRole.attrArn,
                kmsKeyArn: kmsProps.lambdaKey.keyArn,
                environment: { variables: { hookUrl: envProps.slackHookUrl } },
            },
        );

        new lambda.CfnPermission(
            lambdaRdsControlScope,
            "AllowExecutionFromCloudWatch",
            {
                functionName: lambdaRdsControl.ref,
                principal: "logs.amazonaws.com",
                action: "lambda:InvokeFunction",
            },
        );

        // ------------------------------------------------------------
        // Amazon EventBridge Rule Configuration
        // ------------------------------------------------------------
        const createRdsControlRule = (
            ruleId: string,
            action: "start" | "stop",
            description: string,
            cron: string,
        ) => {
            const ruleScope = wrap(ruleId, `${prefix}-rds-control-${action}`);

            const rule = new events.CfnRule(ruleScope, "Resource", {
                name: `${prefix}-rds-control-${action}`,
                description,
                scheduleExpression: cron,
                state: "ENABLED",
                targets: [
                    {
                        id: "Target0",
                        arn: lambdaRdsControl.attrArn,
                        input: JSON.stringify({ Action: action }),
                    },
                ],
            });

            new lambda.CfnPermission(ruleScope, "AllowEventRuleInvoke", {
                functionName: lambdaRdsControl.ref,
                principal: "events.amazonaws.com",
                action: "lambda:InvokeFunction",
                sourceArn: rule.attrArn,
            });
        };

        createRdsControlRule(
            "RdsControlStartRule",
            "start",
            "Starts Aurora clusters tagged AutoStop at 09:00 JST (00:00 UTC) on weekdays",
            "cron(0 0 ? * MON-FRI *)",
        );

        createRdsControlRule(
            "RdsControlStopRule",
            "stop",
            "Stops Aurora clusters tagged AutoStop at 18:00 JST (09:00 UTC) on weekdays",
            "cron(0 9 ? * MON-FRI *)",
        );
    }
}
