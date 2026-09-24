import * as cdk from "aws-cdk-lib";
import { aws_logs as logs } from "aws-cdk-lib";
import { Construct } from "constructs";

export interface commonProps {
    projectName: string;
    envName: string;
}

// ------------------------------------------------------------
// [15] - cfLoggingStack
// ------------------------------------------------------------
export class cfLoggingStack extends Construct {
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

    constructor(scope: Construct, id: string, commonProps: commonProps) {
        super(scope, id);

        // ------------------------------------------------------------
        // Amazon CloudWatch Logs for Amazon ECS (app: Nginx) Container Configuration
        // ------------------------------------------------------------
        this.logGroupNginxEcsApp = new logs.LogGroup(
            this,
            "LogGroupNginxEcsApp",
            {
                logGroupName: `/ecs/${commonProps.projectName}/${commonProps.envName}/nginx-app`,
                logGroupClass: logs.LogGroupClass.STANDARD,
                retention: logs.RetentionDays.ONE_YEAR,
            },
        );

        cdk.Tags.of(this.logGroupNginxEcsApp).add(
            "Name",
            `${commonProps.envName}-${commonProps.projectName}-loggroup-nginx-app`,
        );
        cdk.Tags.of(this.logGroupNginxEcsApp).add("ProvisionedBy", "AWS");

        this.logStreamNginxEcsApp = new logs.LogStream(
            this,
            "LogStreamNginxEcsApp",
            {
                logGroup: this.logGroupNginxEcsApp,
                logStreamName: `/ecs/${commonProps.projectName}/${commonProps.envName}/nginx-app`,
            },
        );

        // ------------------------------------------------------------
        // Amazon CloudWatch Logs for Amazon ECS (app: App) Container Configuration
        // ------------------------------------------------------------
        this.logGroupAppEcsApp = new logs.LogGroup(this, "LogGroupAppEcsApp", {
            logGroupName: `/ecs/${commonProps.projectName}/${commonProps.envName}/app-app`,
            logGroupClass: logs.LogGroupClass.STANDARD,
            retention: logs.RetentionDays.ONE_YEAR,
        });

        cdk.Tags.of(this.logGroupAppEcsApp).add(
            "Name",
            `${commonProps.envName}-${commonProps.projectName}-loggroup-app-app`,
        );
        cdk.Tags.of(this.logGroupAppEcsApp).add("ProvisionedBy", "AWS");

        this.logStreamAppEcsApp = new logs.LogStream(
            this,
            "LogStreamAppEcsApp",
            {
                logGroup: this.logGroupAppEcsApp,
                logStreamName: `/ecs/${commonProps.projectName}/${commonProps.envName}/app-app`,
            },
        );

        // ------------------------------------------------------------
        // Amazon CloudWatch Logs for Amazon ECS (cron) Container Configuration
        // ------------------------------------------------------------
        this.logGroupEcsCron = new logs.LogGroup(this, "LogGroupEcsCron", {
            logGroupName: `/ecs/${commonProps.projectName}/${commonProps.envName}/cron`,
            logGroupClass: logs.LogGroupClass.STANDARD,
            retention: logs.RetentionDays.ONE_YEAR,
        });

        cdk.Tags.of(this.logGroupEcsCron).add(
            "Name",
            `${commonProps.envName}-${commonProps.projectName}-loggroup-cron`,
        );
        cdk.Tags.of(this.logGroupEcsCron).add("ProvisionedBy", "AWS");

        this.logStreamEcsCron = new logs.LogStream(this, "LogStreamEcsCron", {
            logGroup: this.logGroupEcsCron,
            logStreamName: `/ecs/${commonProps.projectName}/${commonProps.envName}/cron`,
        });

        // ------------------------------------------------------------
        // Amazon CloudWatch Logs for Amazon ECS (queue) Container Configuration
        // ------------------------------------------------------------
        this.logGroupEcsQueue = new logs.LogGroup(this, "LogGroupEcsQueue", {
            logGroupName: `/ecs/${commonProps.projectName}/${commonProps.envName}/queue`,
            logGroupClass: logs.LogGroupClass.STANDARD,
            retention: logs.RetentionDays.ONE_YEAR,
        });

        cdk.Tags.of(this.logGroupEcsQueue).add(
            "Name",
            `${commonProps.envName}-${commonProps.projectName}-loggroup-queue`,
        );
        cdk.Tags.of(this.logGroupEcsQueue).add("ProvisionedBy", "AWS");

        this.logStreamEcsQueue = new logs.LogStream(this, "LogStreamEcsQueue", {
            logGroup: this.logGroupEcsQueue,
            logStreamName: `/ecs/${commonProps.projectName}/${commonProps.envName}/queue`,
        });

        // ------------------------------------------------------------
        // Amazon CloudWatch Logs for Amazon Aurora (instance) Configuration
        // ------------------------------------------------------------
        this.logGroupAuroraInstance = new logs.LogGroup(
            this,
            "LogGroupAuroraInstance",
            {
                logGroupName: `/rds/${commonProps.projectName}/${commonProps.envName}/aurora-instance`,
                logGroupClass: logs.LogGroupClass.STANDARD,
                retention: logs.RetentionDays.ONE_YEAR,
            },
        );

        cdk.Tags.of(this.logGroupAuroraInstance).add(
            "Name",
            `${commonProps.envName}-${commonProps.projectName}-loggroup-aurora-instance`,
        );
        cdk.Tags.of(this.logGroupAuroraInstance).add("ProvisionedBy", "AWS");

        this.logStreamAuroraInstance = new logs.LogStream(
            this,
            "LogStreamAuroraInstance",
            {
                logGroup: this.logGroupAuroraInstance,
                logStreamName: `/rds/${commonProps.projectName}/${commonProps.envName}/aurora-instance`,
            },
        );

        // ------------------------------------------------------------
        // Amazon CloudWatch Logs for Amazon Aurora (postgresql) Configuration
        // ------------------------------------------------------------
        this.logGroupAuroraPostgresql = new logs.LogGroup(
            this,
            "LogGroupAuroraPostgresql",
            {
                logGroupName: `/rds/${commonProps.projectName}/${commonProps.envName}/aurora-postgresql`,
                logGroupClass: logs.LogGroupClass.STANDARD,
                retention: logs.RetentionDays.ONE_YEAR,
            },
        );

        cdk.Tags.of(this.logGroupAuroraPostgresql).add(
            "Name",
            `${commonProps.envName}-${commonProps.projectName}-loggroup-aurora-postgresql`,
        );
        cdk.Tags.of(this.logGroupAuroraPostgresql).add("ProvisionedBy", "AWS");

        this.logStreamAuroraPostgresql = new logs.LogStream(
            this,
            "LogStreamAuroraPostgresql",
            {
                logGroup: this.logGroupAuroraPostgresql,
                logStreamName: `/rds/${commonProps.projectName}/${commonProps.envName}/aurora-postgresql`,
            },
        );

        // ------------------------------------------------------------
        // Amazon CloudWatch Logs for Amazon Aurora (IAM DB Auth Error) Configuration
        // ------------------------------------------------------------
        this.logGroupAuroraIamDbAuthError = new logs.LogGroup(
            this,
            "LogGroupAuroraIamDbAuthError",
            {
                logGroupName: `/rds/${commonProps.projectName}/${commonProps.envName}/aurora-iam-db-auth-error`,
                logGroupClass: logs.LogGroupClass.STANDARD,
                retention: logs.RetentionDays.ONE_YEAR,
            },
        );

        cdk.Tags.of(this.logGroupAuroraIamDbAuthError).add(
            "Name",
            `${commonProps.envName}-${commonProps.projectName}-loggroup-aurora-iam-db-auth-error`,
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
                logStreamName: `/rds/${commonProps.projectName}/${commonProps.envName}/aurora-iam-db-auth-error`,
            },
        );

        // ------------------------------------------------------------
        // Amazon CloudWatch Logs for Amazon ElastiCache Configuration
        // ------------------------------------------------------------
        this.logGroupElastiCache = new logs.LogGroup(
            this,
            "LogGroupElastiCache",
            {
                logGroupName: `/elasticache/${commonProps.projectName}/${commonProps.envName}`,
                logGroupClass: logs.LogGroupClass.STANDARD,
                retention: logs.RetentionDays.ONE_YEAR,
            },
        );

        cdk.Tags.of(this.logGroupElastiCache).add(
            "Name",
            `${commonProps.envName}-${commonProps.projectName}-loggroup-elasticache`,
        );
        cdk.Tags.of(this.logGroupElastiCache).add("ProvisionedBy", "AWS");

        this.logStreamElastiCache = new logs.LogStream(
            this,
            "LogStreamElastiCache",
            {
                logGroup: this.logGroupElastiCache,
                logStreamName: `/elasticache/${commonProps.projectName}/${commonProps.envName}`,
            },
        );

        // ------------------------------------------------------------
        // Amazon CloudWatch Logs for AWS Lambda Configuration (cloudwatch-logs-alert)
        // ------------------------------------------------------------
        this.logGroupLambdaLogsAlert = new logs.LogGroup(
            this,
            "LogGroupLambdaLogsAlert",
            {
                logGroupName: `/lambda/${commonProps.projectName}/${commonProps.envName}/cloudwatch-logs-alert`,
                logGroupClass: logs.LogGroupClass.STANDARD,
                retention: logs.RetentionDays.ONE_YEAR,
            },
        );

        cdk.Tags.of(this.logGroupLambdaLogsAlert).add(
            "Name",
            `${commonProps.envName}-${commonProps.projectName}-loggroup-lambda-logs-alert`,
        );
        cdk.Tags.of(this.logGroupLambdaLogsAlert).add("ProvisionedBy", "AWS");

        this.logStreamLambdaLogsAlert = new logs.LogStream(
            this,
            "LogStreamLambdaLogsAlert",
            {
                logGroup: this.logGroupLambdaLogsAlert,
                logStreamName: `/lambda/${commonProps.projectName}/${commonProps.envName}/cloudwatch-logs-alert`,
            },
        );

        // ------------------------------------------------------------
        // Amazon CloudWatch Logs for AWS Lambda Configuration (cloudwatch-metrics-alert)
        // ------------------------------------------------------------
        this.logGroupLambdaMetricsAlert = new logs.LogGroup(
            this,
            "LogGroupLambdaMetricsAlert",
            {
                logGroupName: `/lambda/${commonProps.projectName}/${commonProps.envName}/cloudwatch-metrics-alert`,
                logGroupClass: logs.LogGroupClass.STANDARD,
                retention: logs.RetentionDays.ONE_YEAR,
            },
        );

        cdk.Tags.of(this.logGroupLambdaMetricsAlert).add(
            "Name",
            `${commonProps.envName}-${commonProps.projectName}-loggroup-lambda-metrics-alert`,
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
                logStreamName: `/lambda/${commonProps.projectName}/${commonProps.envName}/cloudwatch-metrics-alert`,
            },
        );

        // ------------------------------------------------------------
        // Amazon CloudWatch Logs for AWS Lambda Configuration (rds-control)
        // ------------------------------------------------------------
        this.logGroupLambdaRdsControl = new logs.LogGroup(
            this,
            "LogGroupLambdaRdsControl",
            {
                logGroupName: `/lambda/${commonProps.projectName}/${commonProps.envName}/rds-control`,
                logGroupClass: logs.LogGroupClass.STANDARD,
                retention: logs.RetentionDays.ONE_YEAR,
            },
        );

        cdk.Tags.of(this.logGroupLambdaRdsControl).add(
            "Name",
            `${commonProps.envName}-${commonProps.projectName}-loggroup-lambda-rds-control`,
        );
        cdk.Tags.of(this.logGroupLambdaRdsControl).add("ProvisionedBy", "AWS");

        this.logStreamLambdaRdsControl = new logs.LogStream(
            this,
            "LogStreamLambdaRdsControl",
            {
                logGroup: this.logGroupLambdaRdsControl,
                logStreamName: `/lambda/${commonProps.projectName}/${commonProps.envName}/rds-control`,
            },
        );
    }
}
