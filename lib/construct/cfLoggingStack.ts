import * as cdk from "aws-cdk-lib";
import {
    aws_logs as logs,
    aws_logs_destinations as logsDestinations,
} from "aws-cdk-lib";
import type * as lambda from "aws-cdk-lib/aws-lambda";
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

// ------------------------------------------------------------
// [14] - cfLoggingStack
// ------------------------------------------------------------
export class CfLoggingStack extends Construct {
    public readonly logGroupNginxEcsApp: logs.LogGroup;
    public readonly logGroupAppEcsApp: logs.LogGroup;
    public readonly logGroupEcsCron: logs.LogGroup;
    public readonly logGroupEcsQueue: logs.LogGroup;
    public readonly logGroupAuroraInstance: logs.LogGroup;
    public readonly logGroupAuroraPostgresql: logs.LogGroup;
    public readonly logGroupAuroraIamDbAuthError: logs.LogGroup;
    public readonly logGroupElastiCache: logs.LogGroup;
    public readonly logGroupLambdaLogsAlert: logs.LogGroup;
    public readonly logGroupLambdaMetricsAlert: logs.LogGroup;
    public readonly logGroupLambdaRdsControl: logs.LogGroup;
    public readonly logGroupEc2Bastion: logs.LogGroup;
    public readonly logGroupEc2BatchAzA: logs.LogGroup;
    public readonly logGroupEc2BatchAzC: logs.LogGroup;
    public readonly logGroupSns: logs.LogGroup;
    public readonly logStreamNginxEcsApp: logs.LogStream;
    public readonly logStreamAppEcsApp: logs.LogStream;
    public readonly logStreamEcsCron: logs.LogStream;
    public readonly logStreamEcsQueue: logs.LogStream;
    public readonly logStreamAuroraInstance: logs.LogStream;
    public readonly logStreamAuroraPostgresql: logs.LogStream;
    public readonly logStreamAuroraIamDbAuthError: logs.LogStream;
    public readonly logStreamElastiCache: logs.LogStream;
    public readonly logStreamLambdaLogsAlert: logs.LogStream;
    public readonly logStreamLambdaMetricsAlert: logs.LogStream;
    public readonly logStreamLambdaRdsControl: logs.LogStream;
    public readonly logStreamEc2Bastion: logs.LogStream;
    public readonly logStreamEc2BatchAzA: logs.LogStream;
    public readonly logStreamEc2BatchAzC: logs.LogStream;
    public readonly logStreamSns: logs.LogStream;

    constructor(
        scope: Construct,
        id: string,
        commonProps: CommonProps,
        envProps: EnvProps,
    ) {
        super(scope, id);

        // ------------------------------------------------------------
        // Amazon CloudWatch Logs for Amazon ECS (app: Nginx) Container Configuration
        // ------------------------------------------------------------
        this.logGroupNginxEcsApp = new logs.LogGroup(
            this,
            "LogGroupNginxEcsApp",
            {
                logGroupName: `/ecs/${commonProps.projectName}/${envProps.envName}/nginx-app`,
                logGroupClass: logs.LogGroupClass.STANDARD,
                retention: logs.RetentionDays.ONE_YEAR,
            },
        );

        cdk.Tags.of(this.logGroupNginxEcsApp).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-loggroup-nginx-app`,
        );
        cdk.Tags.of(this.logGroupNginxEcsApp).add("ProvisionedBy", "AWS");

        this.logStreamNginxEcsApp = new logs.LogStream(
            this,
            "LogStreamNginxEcsApp",
            {
                logGroup: this.logGroupNginxEcsApp,
                logStreamName: `/ecs/${commonProps.projectName}/${envProps.envName}/nginx-app`,
            },
        );

        // ------------------------------------------------------------
        // Amazon CloudWatch Logs for Amazon ECS (app: App) Container Configuration
        // ------------------------------------------------------------
        this.logGroupAppEcsApp = new logs.LogGroup(this, "LogGroupAppEcsApp", {
            logGroupName: `/ecs/${commonProps.projectName}/${envProps.envName}/app-app`,
            logGroupClass: logs.LogGroupClass.STANDARD,
            retention: logs.RetentionDays.ONE_YEAR,
        });

        cdk.Tags.of(this.logGroupAppEcsApp).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-loggroup-app-app`,
        );
        cdk.Tags.of(this.logGroupAppEcsApp).add("ProvisionedBy", "AWS");

        this.logStreamAppEcsApp = new logs.LogStream(
            this,
            "LogStreamAppEcsApp",
            {
                logGroup: this.logGroupAppEcsApp,
                logStreamName: `/ecs/${commonProps.projectName}/${envProps.envName}/app-app`,
            },
        );

        // ------------------------------------------------------------
        // Amazon CloudWatch Logs for Amazon ECS (cron) Container Configuration
        // ------------------------------------------------------------
        this.logGroupEcsCron = new logs.LogGroup(this, "LogGroupEcsCron", {
            logGroupName: `/ecs/${commonProps.projectName}/${envProps.envName}/cron`,
            logGroupClass: logs.LogGroupClass.STANDARD,
            retention: logs.RetentionDays.ONE_YEAR,
        });

        cdk.Tags.of(this.logGroupEcsCron).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-loggroup-cron`,
        );
        cdk.Tags.of(this.logGroupEcsCron).add("ProvisionedBy", "AWS");

        this.logStreamEcsCron = new logs.LogStream(this, "LogStreamEcsCron", {
            logGroup: this.logGroupEcsCron,
            logStreamName: `/ecs/${commonProps.projectName}/${envProps.envName}/cron`,
        });

        // ------------------------------------------------------------
        // Amazon CloudWatch Logs for Amazon ECS (queue) Container Configuration
        // ------------------------------------------------------------
        this.logGroupEcsQueue = new logs.LogGroup(this, "LogGroupEcsQueue", {
            logGroupName: `/ecs/${commonProps.projectName}/${envProps.envName}/queue`,
            logGroupClass: logs.LogGroupClass.STANDARD,
            retention: logs.RetentionDays.ONE_YEAR,
        });

        cdk.Tags.of(this.logGroupEcsQueue).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-loggroup-queue`,
        );
        cdk.Tags.of(this.logGroupEcsQueue).add("ProvisionedBy", "AWS");

        this.logStreamEcsQueue = new logs.LogStream(this, "LogStreamEcsQueue", {
            logGroup: this.logGroupEcsQueue,
            logStreamName: `/ecs/${commonProps.projectName}/${envProps.envName}/queue`,
        });

        // ------------------------------------------------------------
        // Amazon CloudWatch Logs for Amazon Aurora (instance) Configuration
        // ------------------------------------------------------------
        this.logGroupAuroraInstance = new logs.LogGroup(
            this,
            "LogGroupAuroraInstance",
            {
                logGroupName: `/rds/${commonProps.projectName}/${envProps.envName}/aurora-instance`,
                logGroupClass: logs.LogGroupClass.STANDARD,
                retention: logs.RetentionDays.ONE_YEAR,
            },
        );

        cdk.Tags.of(this.logGroupAuroraInstance).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-loggroup-aurora-instance`,
        );
        cdk.Tags.of(this.logGroupAuroraInstance).add("ProvisionedBy", "AWS");

        this.logStreamAuroraInstance = new logs.LogStream(
            this,
            "LogStreamAuroraInstance",
            {
                logGroup: this.logGroupAuroraInstance,
                logStreamName: `/rds/${commonProps.projectName}/${envProps.envName}/aurora-instance`,
            },
        );

        // ------------------------------------------------------------
        // Amazon CloudWatch Logs for Amazon Aurora (postgresql) Configuration
        // ------------------------------------------------------------
        this.logGroupAuroraPostgresql = new logs.LogGroup(
            this,
            "LogGroupAuroraPostgresql",
            {
                logGroupName: `/rds/${commonProps.projectName}/${envProps.envName}/aurora-postgresql`,
                logGroupClass: logs.LogGroupClass.STANDARD,
                retention: logs.RetentionDays.ONE_YEAR,
            },
        );

        cdk.Tags.of(this.logGroupAuroraPostgresql).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-loggroup-aurora-postgresql`,
        );
        cdk.Tags.of(this.logGroupAuroraPostgresql).add("ProvisionedBy", "AWS");

        this.logStreamAuroraPostgresql = new logs.LogStream(
            this,
            "LogStreamAuroraPostgresql",
            {
                logGroup: this.logGroupAuroraPostgresql,
                logStreamName: `/rds/${commonProps.projectName}/${envProps.envName}/aurora-postgresql`,
            },
        );

        // ------------------------------------------------------------
        // Amazon CloudWatch Logs for Amazon Aurora (IAM DB Auth Error) Configuration
        // ------------------------------------------------------------
        this.logGroupAuroraIamDbAuthError = new logs.LogGroup(
            this,
            "LogGroupAuroraIamDbAuthError",
            {
                logGroupName: `/rds/${commonProps.projectName}/${envProps.envName}/aurora-iam-db-auth-error`,
                logGroupClass: logs.LogGroupClass.STANDARD,
                retention: logs.RetentionDays.ONE_YEAR,
            },
        );

        cdk.Tags.of(this.logGroupAuroraIamDbAuthError).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-loggroup-aurora-iam-db-auth-error`,
        );
        cdk.Tags.of(this.logGroupAuroraIamDbAuthError).add(
            "ProvisionedBy",
            "AWS",
        );

        this.logStreamAuroraIamDbAuthError = new logs.LogStream(
            this,
            "LogStreamAuroraIamDbAuthError",
            {
                logGroup: this.logGroupAuroraIamDbAuthError,
                logStreamName: `/rds/${commonProps.projectName}/${envProps.envName}/aurora-iam-db-auth-error`,
            },
        );

        // ------------------------------------------------------------
        // Amazon CloudWatch Logs for Amazon ElastiCache Configuration
        // ------------------------------------------------------------
        this.logGroupElastiCache = new logs.LogGroup(
            this,
            "LogGroupElastiCache",
            {
                logGroupName: `/elasticache/${commonProps.projectName}/${envProps.envName}`,
                logGroupClass: logs.LogGroupClass.STANDARD,
                retention: logs.RetentionDays.ONE_YEAR,
            },
        );

        cdk.Tags.of(this.logGroupElastiCache).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-loggroup-elasticache`,
        );
        cdk.Tags.of(this.logGroupElastiCache).add("ProvisionedBy", "AWS");

        this.logStreamElastiCache = new logs.LogStream(
            this,
            "LogStreamElastiCache",
            {
                logGroup: this.logGroupElastiCache,
                logStreamName: `/elasticache/${commonProps.projectName}/${envProps.envName}`,
            },
        );

        // ------------------------------------------------------------
        // Amazon CloudWatch Logs for AWS Lambda Configuration (cloudwatch-logs-alert)
        // ------------------------------------------------------------
        this.logGroupLambdaLogsAlert = new logs.LogGroup(
            this,
            "LogGroupLambdaLogsAlert",
            {
                logGroupName: `/lambda/${commonProps.projectName}/${envProps.envName}/cloudwatch-logs-alert`,
                logGroupClass: logs.LogGroupClass.STANDARD,
                retention: logs.RetentionDays.ONE_YEAR,
            },
        );

        cdk.Tags.of(this.logGroupLambdaLogsAlert).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-loggroup-lambda-logs-alert`,
        );
        cdk.Tags.of(this.logGroupLambdaLogsAlert).add("ProvisionedBy", "AWS");

        this.logStreamLambdaLogsAlert = new logs.LogStream(
            this,
            "LogStreamLambdaLogsAlert",
            {
                logGroup: this.logGroupLambdaLogsAlert,
                logStreamName: `/lambda/${commonProps.projectName}/${envProps.envName}/cloudwatch-logs-alert`,
            },
        );

        // ------------------------------------------------------------
        // Amazon CloudWatch Logs for AWS Lambda Configuration (cloudwatch-metrics-alert)
        // ------------------------------------------------------------
        this.logGroupLambdaMetricsAlert = new logs.LogGroup(
            this,
            "LogGroupLambdaMetricsAlert",
            {
                logGroupName: `/lambda/${commonProps.projectName}/${envProps.envName}/cloudwatch-metrics-alert`,
                logGroupClass: logs.LogGroupClass.STANDARD,
                retention: logs.RetentionDays.ONE_YEAR,
            },
        );

        cdk.Tags.of(this.logGroupLambdaMetricsAlert).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-loggroup-lambda-metrics-alert`,
        );
        cdk.Tags.of(this.logGroupLambdaMetricsAlert).add(
            "ProvisionedBy",
            "AWS",
        );

        this.logStreamLambdaMetricsAlert = new logs.LogStream(
            this,
            "LogStreamLambdaMetricsAlert",
            {
                logGroup: this.logGroupLambdaMetricsAlert,
                logStreamName: `/lambda/${commonProps.projectName}/${envProps.envName}/cloudwatch-metrics-alert`,
            },
        );

        // ------------------------------------------------------------
        // Amazon CloudWatch Logs for AWS Lambda Configuration (rds-control)
        // ------------------------------------------------------------
        this.logGroupLambdaRdsControl = new logs.LogGroup(
            this,
            "LogGroupLambdaRdsControl",
            {
                logGroupName: `/lambda/${commonProps.projectName}/${envProps.envName}/rds-control`,
                logGroupClass: logs.LogGroupClass.STANDARD,
                retention: logs.RetentionDays.ONE_YEAR,
            },
        );

        cdk.Tags.of(this.logGroupLambdaRdsControl).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-loggroup-lambda-rds-control`,
        );
        cdk.Tags.of(this.logGroupLambdaRdsControl).add("ProvisionedBy", "AWS");

        this.logStreamLambdaRdsControl = new logs.LogStream(
            this,
            "LogStreamLambdaRdsControl",
            {
                logGroup: this.logGroupLambdaRdsControl,
                logStreamName: `/lambda/${commonProps.projectName}/${envProps.envName}/rds-control`,
            },
        );

        // ------------------------------------------------------------
        // Amazon CloudWatch Logs for Amazon EC2 Bastion Configuration
        // ------------------------------------------------------------
        this.logGroupEc2Bastion = new logs.LogGroup(
            this,
            "LogGroupEc2Bastion",
            {
                logGroupName: `/ec2/${commonProps.projectName}/${envProps.envName}/bastion`,
                logGroupClass: logs.LogGroupClass.STANDARD,
                retention: logs.RetentionDays.ONE_YEAR,
            },
        );

        cdk.Tags.of(this.logGroupEc2Bastion).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-loggroup-ec2-bastion`,
        );
        cdk.Tags.of(this.logGroupEc2Bastion).add("ProvisionedBy", "AWS");

        this.logStreamEc2Bastion = new logs.LogStream(
            this,
            "LogStreamEc2Bastion",
            {
                logGroup: this.logGroupEc2Bastion,
                logStreamName: `/ec2/${commonProps.projectName}/${envProps.envName}/bastion`,
            },
        );

        // ------------------------------------------------------------
        // Amazon CloudWatch Logs for Amazon EC2 Batch (AZ-a) Configuration
        // ------------------------------------------------------------
        this.logGroupEc2BatchAzA = new logs.LogGroup(
            this,
            "LogGroupEc2BatchAzA",
            {
                logGroupName: `/ec2/${commonProps.projectName}/${envProps.envName}/batch-az-a`,
                logGroupClass: logs.LogGroupClass.STANDARD,
                retention: logs.RetentionDays.ONE_YEAR,
            },
        );
        cdk.Tags.of(this.logGroupEc2BatchAzA).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-loggroup-ec2-batch-az-a`,
        );
        cdk.Tags.of(this.logGroupEc2BatchAzA).add("ProvisionedBy", "AWS");

        this.logStreamEc2BatchAzA = new logs.LogStream(
            this,
            "LogStreamEc2BatchAzA",
            {
                logGroup: this.logGroupEc2BatchAzA,
                logStreamName: `/ec2/${commonProps.projectName}/${envProps.envName}/batch-az-a`,
            },
        );

        // ------------------------------------------------------------
        // Amazon CloudWatch Logs for Amazon EC2 Batch (AZ-c) Configuration
        // ------------------------------------------------------------
        this.logGroupEc2BatchAzC = new logs.LogGroup(
            this,
            "LogGroupEc2BatchAzC",
            {
                logGroupName: `/ec2/${commonProps.projectName}/${envProps.envName}/batch-az-c`,
                logGroupClass: logs.LogGroupClass.STANDARD,
                retention: logs.RetentionDays.ONE_YEAR,
            },
        );
        cdk.Tags.of(this.logGroupEc2BatchAzC).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-loggroup-ec2-batch-az-c`,
        );
        cdk.Tags.of(this.logGroupEc2BatchAzC).add("ProvisionedBy", "AWS");

        this.logStreamEc2BatchAzC = new logs.LogStream(
            this,
            "LogStreamEc2BatchAzC",
            {
                logGroup: this.logGroupEc2BatchAzC,
                logStreamName: `/ec2/${commonProps.projectName}/${envProps.envName}/batch-az-c`,
            },
        );

        // ------------------------------------------------------------
        // Amazon CloudWatch Logs for Amazon SNS Configuration
        // ------------------------------------------------------------
        this.logGroupSns = new logs.LogGroup(this, "LogGroupSns", {
            logGroupName: `/sns/${commonProps.projectName}/${envProps.envName}`,
            logGroupClass: logs.LogGroupClass.STANDARD,
            retention: logs.RetentionDays.ONE_YEAR,
        });
        cdk.Tags.of(this.logGroupSns).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-loggroup-sns`,
        );
        cdk.Tags.of(this.logGroupSns).add("ProvisionedBy", "AWS");

        this.logStreamSns = new logs.LogStream(this, "LogStreamSns", {
            logGroup: this.logGroupSns,
            logStreamName: `/sns/${commonProps.projectName}/${envProps.envName}`,
        });
    }

    // ------------------------------------------------------------
    // Amazon CloudWatch Logs Subscription Filter Configuration
    // ------------------------------------------------------------
    public addCloudWatchLogsAlertSubscription(
        lambdaFunction: lambda.IFunction,
    ): void {
        const destination = new logsDestinations.LambdaDestination(
            lambdaFunction,
        );

        const sourceLogGroups: Record<string, logs.ILogGroup> = {
            NginxEcsApp: this.logGroupNginxEcsApp,
            AppEcsApp: this.logGroupAppEcsApp,
            EcsCron: this.logGroupEcsCron,
            EcsQueue: this.logGroupEcsQueue,
            AuroraInstance: this.logGroupAuroraInstance,
            AuroraPostgresql: this.logGroupAuroraPostgresql,
            AuroraIamDbAuthError: this.logGroupAuroraIamDbAuthError,
            ElastiCache: this.logGroupElastiCache,
        };

        for (const [name, logGroup] of Object.entries(sourceLogGroups)) {
            new logs.SubscriptionFilter(this, `SubscriptionFilter${name}`, {
                logGroup,
                destination,
                filterPattern: logs.FilterPattern.allEvents(),
            });
        }
    }
}
