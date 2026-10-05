import { join } from "node:path";
import * as cdk from "aws-cdk-lib";
import {
    aws_events as events,
    aws_iam as iam,
    aws_lambda as lambda,
    aws_events_targets as targets,
} from "aws-cdk-lib";
import type * as kms from "aws-cdk-lib/aws-kms";
import { Construct } from "constructs";

export interface commonProps {
    projectName: string;
    dashboardName: string;
}

export interface envProps {
    envName: string;
    vpcCidr: string;
    defaultGatewayCidr: string;
    slackHookUrl: string;
}

export interface kmsProps {
    lambdaKey: kms.IKey;
}

// ------------------------------------------------------------
// [15] - Compute Serverless Stack
// ------------------------------------------------------------
export class cfComputeServerlessStack extends Construct {
    public readonly lambdaCloudWatchLogsAlert: lambda.Function;
    public readonly lambdaCloudWatchMetricsAlert: lambda.Function;

    constructor(
        scope: Construct,
        id: string,
        kmsProps: kmsProps,
        commonProps: commonProps,
        envProps: envProps,
    ) {
        super(scope, id);

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

        const lambdaPolicy = new iam.Policy(
            this,
            "iamLambdaCloudWatchLogsAlertPolicy",
            {
                policyName: `${commonProps.projectName}-${envProps.envName}-LambdaPolicy`,
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
            `${commonProps.projectName}-${envProps.envName}-iam-lambda-policy`,
        );
        cdk.Tags.of(lambdaPolicy).add("ProvisionedBy", "AWS");

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

        const lambdaCloudWatchMetricsAlertPolicy = new iam.Policy(
            this,
            "lambdaCloudWatchMetricsAlertPolicy",
            {
                policyName: `${commonProps.projectName}-${envProps.envName}-lambda-cloudwatch-metrics-alert-policy`,
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
            `${commonProps.projectName}-${envProps.envName}-lambda-cloudwatch-metrics-alert-policy`,
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
                roleName: `${commonProps.projectName}-${envProps.envName}-lambda-rds-control-role`,
                description: `IAM role for Lambda functions (rds-control) in the ${commonProps.projectName} project`,
                assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
            },
        );

        cdk.Tags.of(iamLambdaRdsControlRole).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-iam-lambda-rds-control-role`,
        );
        cdk.Tags.of(iamLambdaRdsControlRole).add("ProvisionedBy", "AWS");

        const lambdaRdsControlPolicy = new iam.Policy(
            this,
            "lambdaRdsControlPolicy",
            {
                policyName: `${commonProps.projectName}-${envProps.envName}-lambda-rds-control-policy`,
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
            `${commonProps.projectName}-${envProps.envName}-lambda-rds-control-policy`,
        );
        cdk.Tags.of(lambdaRdsControlPolicy).add("ProvisionedBy", "AWS");

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
                environment: {
                    hookUrl: envProps.slackHookUrl,
                },
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

        // ------------------------------------------------------------
        // AWS Lambda (rds-control) Configuration
        // ------------------------------------------------------------
        const lambdaRdsControl = new lambda.Function(this, "lambdaRdsControl", {
            functionName: `${commonProps.projectName}-${envProps.envName}-rds-control`,
            description: `Lambda function (rds-control) in the ${commonProps.projectName} project`,
            code: lambda.Code.fromAsset(
                join(__dirname, "../lambda/rds-control"),
            ),
            handler: "lambda_function.lambda_handler",
            runtime: lambda.Runtime.PYTHON_3_11,
            architecture: lambda.Architecture.ARM_64,
            memorySize: 128,
            timeout: cdk.Duration.seconds(30),
            role: iamLambdaRdsControlRole,
            environmentEncryption: kmsProps.lambdaKey,
            environment: {
                hookUrl: envProps.slackHookUrl,
            },
        });

        lambdaRdsControl.addPermission("AllowExecutionFromCloudWatch", {
            principal: new iam.ServicePrincipal("logs.amazonaws.com"),
            action: "lambda:InvokeFunction",
        });

        cdk.Tags.of(lambdaRdsControl).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-rds-control`,
        );
        cdk.Tags.of(lambdaRdsControl).add("ProvisionedBy", "AWS");

        // ------------------------------------------------------------
        // Amazon EventBridge Rule Configuration
        // ------------------------------------------------------------
        const rdsControlStartRule = new events.Rule(
            this,
            "RdsControlStartRule",
            {
                ruleName: `${commonProps.projectName}-${envProps.envName}-rds-control-start`,
                description:
                    "Starts Aurora clusters tagged AutoStop at 09:00 JST (00:00 UTC) on weekdays",
                schedule: events.Schedule.expression("cron(0 0 ? * MON-FRI *)"),
            },
        );

        rdsControlStartRule.addTarget(
            new targets.LambdaFunction(lambdaRdsControl, {
                event: events.RuleTargetInput.fromObject({ Action: "start" }),
            }),
        );

        cdk.Tags.of(rdsControlStartRule).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-rds-control-start`,
        );
        cdk.Tags.of(rdsControlStartRule).add("ProvisionedBy", "AWS");

        const rdsControlStopRule = new events.Rule(this, "RdsControlStopRule", {
            ruleName: `${commonProps.projectName}-${envProps.envName}-rds-control-stop`,
            description:
                "Stops Aurora clusters tagged AutoStop at 18:00 JST (09:00 UTC) on weekdays",
            schedule: events.Schedule.expression("cron(0 9 ? * MON-FRI *)"),
        });

        rdsControlStopRule.addTarget(
            new targets.LambdaFunction(lambdaRdsControl, {
                event: events.RuleTargetInput.fromObject({ Action: "stop" }),
            }),
        );

        cdk.Tags.of(rdsControlStopRule).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-rds-control-stop`,
        );
        cdk.Tags.of(rdsControlStopRule).add("ProvisionedBy", "AWS");
    }
}
