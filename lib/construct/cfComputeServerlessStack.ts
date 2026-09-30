import * as cdk from "aws-cdk-lib";
import { aws_iam as iam, aws_lambda as lambda } from "aws-cdk-lib";
import type * as kms from "aws-cdk-lib/aws-kms";
import { Construct } from "constructs";

export interface commonProps {
    projectName: string;
    envName: string;
}

export interface pocProps {
    slackHookUrl: string;
}

export interface kmsProps {
    lambdaKey: kms.IKey;
}

// ------------------------------------------------------------
// [15] - Compute Serverless Stack
// ------------------------------------------------------------
export class cfComputeServerlessStack extends Construct {
    constructor(
        scope: Construct,
        id: string,
        kmsProps: kmsProps,
        commonProps: commonProps,
        pocProps: pocProps,
    ) {
        super(scope, id);

        // ------------------------------------------------------------
        // AWS IAM for AWS Lambda (cloudwatch-log-alert) Configuration
        // ------------------------------------------------------------
        const iamLambdaCloudWatchLogsAlertRole = new iam.Role(
            this,
            "iamLambdaCloudWatchLogsAlertRole",
            {
                roleName: `${commonProps.projectName}-${commonProps.envName}-LambdaRole`,
                description: `IAM role for Lambda functions (cloudwatch-log-alert) in the ${commonProps.projectName} project`,
                assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
            },
        );

        cdk.Tags.of(iamLambdaCloudWatchLogsAlertRole).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-iam-lambda-role`,
        );
        cdk.Tags.of(iamLambdaCloudWatchLogsAlertRole).add(
            "ProvisionedBy",
            "AWS",
        );

        const lambdaPolicy = new iam.Policy(
            this,
            "iamLambdaCloudWatchLogsAlertPolicy",
            {
                policyName: `${commonProps.projectName}-${commonProps.envName}-LambdaPolicy`,
                roles: [iamLambdaCloudWatchLogsAlertRole],
                statements: [
                    new iam.PolicyStatement({
                        sid: "CloudWatchLogsAccess",
                        effect: iam.Effect.ALLOW,
                        actions: [
                            "logs:CreateLogGroup",
                            "logs:CreateLogStream",
                            "logs:PutLogEvents",
                        ],
                        resources: ["*"],
                    }),
                    new iam.PolicyStatement({
                        sid: "KMSAccess",
                        effect: iam.Effect.ALLOW,
                        actions: [
                            "kms:Decrypt",
                            "kms:Encrypt",
                            "kms:GenerateDataKey",
                        ],
                        resources: [kmsProps.lambdaKey.keyArn],
                    }),
                    new iam.PolicyStatement({
                        sid: "LambdaBasicExecution",
                        effect: iam.Effect.ALLOW,
                        actions: ["lambda:InvokeFunction"],
                        resources: ["*"],
                    }),
                    new iam.PolicyStatement({
                        sid: "PublishSNS",
                        effect: iam.Effect.ALLOW,
                        actions: ["sns:Publish"],
                        resources: ["*"],
                    }),
                ],
            },
        );

        cdk.Tags.of(lambdaPolicy).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-iam-lambda-policy`,
        );
        cdk.Tags.of(lambdaPolicy).add("ProvisionedBy", "AWS");

        // ------------------------------------------------------------
        // AWS IAM for AWS Lambda (cloudwatch-metrics-alert) Configuration
        // ------------------------------------------------------------
        const iamLambdaCloudWatchMetricsAlertRole = new iam.Role(
            this,
            "iamLambdaCloudWatchMetricsAlertRole",
            {
                roleName: `${commonProps.projectName}-${commonProps.envName}-LambdaRole`,
                description: `IAM role for Lambda functions (cloudwatch-metrics-alert) in the ${commonProps.projectName} project`,
                assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
            },
        );

        cdk.Tags.of(iamLambdaCloudWatchMetricsAlertRole).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-iam-lambda-cloudwatch-metrics-alert-role`,
        );
        cdk.Tags.of(iamLambdaCloudWatchMetricsAlertRole).add(
            "ProvisionedBy",
            "AWS",
        );

        const lambdaCloudWatchMetricsAlertPolicy = new iam.Policy(
            this,
            "lambdaCloudWatchMetricsAlertPolicy",
            {
                policyName: `${commonProps.projectName}-${commonProps.envName}-lambda-cloudwatch-metrics-alert-policy`,
                roles: [iamLambdaCloudWatchMetricsAlertRole],
                statements: [
                    new iam.PolicyStatement({
                        sid: "CloudWatchMetricsAccess",
                        effect: iam.Effect.ALLOW,
                        actions: ["cloudwatch:PutMetricData"],
                        resources: ["*"],
                    }),
                ],
            },
        );

        cdk.Tags.of(lambdaCloudWatchMetricsAlertPolicy).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-lambda-cloudwatch-metrics-alert-policy`,
        );
        cdk.Tags.of(lambdaCloudWatchMetricsAlertPolicy).add(
            "ProvisionedBy",
            "AWS",
        );

        // ------------------------------------------------------------
        // AWS IAM for AWS Lambda (rds-control) Configuration
        // ------------------------------------------------------------
        const iamLambdaRdsControlRole = new iam.Role(
            this,
            "iamLambdaRdsControlRole",
            {
                roleName: `${commonProps.projectName}-${commonProps.envName}-LambdaRole`,
                description: `IAM role for Lambda functions (rds-control) in the ${commonProps.projectName} project`,
                assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
            },
        );

        cdk.Tags.of(iamLambdaRdsControlRole).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-iam-lambda-rds-control-role`,
        );
        cdk.Tags.of(iamLambdaRdsControlRole).add("ProvisionedBy", "AWS");

        const lambdaRdsControlPolicy = new iam.Policy(
            this,
            "lambdaRdsControlPolicy",
            {
                policyName: `${commonProps.projectName}-${commonProps.envName}-lambda-rds-control-policy`,
                roles: [iamLambdaRdsControlRole],
                statements: [
                    new iam.PolicyStatement({
                        sid: "RdsControlAccess",
                        effect: iam.Effect.ALLOW,
                        actions: [
                            "rds:DescribeDBInstances",
                            "rds:ModifyDBInstance",
                        ],
                        resources: ["*"],
                    }),
                ],
            },
        );

        cdk.Tags.of(lambdaRdsControlPolicy).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-lambda-rds-control-policy`,
        );
        cdk.Tags.of(lambdaRdsControlPolicy).add("ProvisionedBy", "AWS");

        // ------------------------------------------------------------
        // AWS Lambda (cloudwatch-log-alert) Configuration
        // ------------------------------------------------------------
        const lambdaCloudWatchLogsAlert = new lambda.Function(
            this,
            "lambdaCloudWatchLogsAlert",
            {
                functionName: `${commonProps.projectName}-${commonProps.envName}-cloudwatch-log-alert`,
                description: `Lambda function (cloudwatch-log-alert) in the ${commonProps.projectName} project`,
                code: lambda.Code.fromAsset("lambda/cloudwatch-log-alert"),
                handler: "lambda_function.lambda_handler",
                runtime: lambda.Runtime.PYTHON_3_11,
                architecture: lambda.Architecture.ARM_64,
                memorySize: 128,
                timeout: cdk.Duration.seconds(30),
                role: iamLambdaCloudWatchLogsAlertRole,
                environmentEncryption: kmsProps.lambdaKey,
                environment: {
                    hookUrl: pocProps.slackHookUrl,
                },
            },
        );
        cdk.Tags.of(lambdaCloudWatchLogsAlert).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-cloudwatch-log-alert`,
        );
        cdk.Tags.of(lambdaCloudWatchLogsAlert).add("ProvisionedBy", "AWS");

        // ------------------------------------------------------------
        // AWS Lambda (cloudwatch-metrics-alert) Configuration
        // ------------------------------------------------------------
        const lambdaCloudWatchMetricsAlert = new lambda.Function(
            this,
            "lambdaCloudWatchMetricsAlert",
            {
                functionName: `${commonProps.projectName}-${commonProps.envName}-cloudwatch-metrics-alert`,
                description: `Lambda function (cloudwatch-metrics-alert) in the ${commonProps.projectName} project`,
                code: lambda.Code.fromAsset("lambda/cloudwatch-metrics-alert"),
                handler: "lambda_function.lambda_handler",
                runtime: lambda.Runtime.PYTHON_3_11,
                architecture: lambda.Architecture.ARM_64,
                memorySize: 128,
                timeout: cdk.Duration.seconds(30),
                role: iamLambdaCloudWatchMetricsAlertRole,
                environmentEncryption: kmsProps.lambdaKey,
                environment: {
                    hookUrl: pocProps.slackHookUrl,
                },
            },
        );
        cdk.Tags.of(lambdaCloudWatchMetricsAlert).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-cloudwatch-metrics-alert`,
        );
        cdk.Tags.of(lambdaCloudWatchMetricsAlert).add("ProvisionedBy", "AWS");

        // ------------------------------------------------------------
        // AWS Lambda (rds-control) Configuration
        // ------------------------------------------------------------
        const lambdaRdsControl = new lambda.Function(this, "lambdaRdsControl", {
            functionName: `${commonProps.projectName}-${commonProps.envName}-rds-control`,
            description: `Lambda function (rds-control) in the ${commonProps.projectName} project`,
            code: lambda.Code.fromAsset("lambda/rds-control"),
            handler: "lambda_function.lambda_handler",
            runtime: lambda.Runtime.PYTHON_3_11,
            architecture: lambda.Architecture.ARM_64,
            memorySize: 128,
            timeout: cdk.Duration.seconds(30),
            role: iamLambdaRdsControlRole,
            environmentEncryption: kmsProps.lambdaKey,
            environment: {
                hookUrl: pocProps.slackHookUrl,
            },
        });
        cdk.Tags.of(lambdaRdsControl).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-rds-control`,
        );
        cdk.Tags.of(lambdaRdsControl).add("ProvisionedBy", "AWS");
    }
}
