import * as cdk from "aws-cdk-lib";
import {
    aws_logs as logs,
    aws_logs_destinations as logsDestinations,
} from "aws-cdk-lib";
import type * as lambda from "aws-cdk-lib/aws-lambda";
import type * as sns from "aws-cdk-lib/aws-sns";
import { Construct } from "constructs";

export interface SnsProps {
    snsTopicLogsAlarm: sns.Topic;
}

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
    public readonly logGroupNginxEcsApp: logs.CfnLogGroup;
    public readonly logGroupAppEcsApp: logs.CfnLogGroup;
    public readonly logGroupEcsCron: logs.CfnLogGroup;
    public readonly logGroupEcsQueue: logs.CfnLogGroup;
    public readonly logGroupAuroraInstance: logs.CfnLogGroup;
    public readonly logGroupAuroraPostgresql: logs.CfnLogGroup;
    public readonly logGroupAuroraIamDbAuthError: logs.CfnLogGroup;
    public readonly logGroupElastiCache: logs.CfnLogGroup;
    public readonly logGroupLambdaLogsAlert: logs.CfnLogGroup;
    public readonly logGroupLambdaMetricsAlert: logs.CfnLogGroup;
    public readonly logGroupLambdaRdsControl: logs.CfnLogGroup;
    public readonly logGroupEc2Bastion: logs.CfnLogGroup;
    public readonly logGroupEc2BatchAzA: logs.CfnLogGroup;
    public readonly logGroupEc2BatchAzC: logs.CfnLogGroup;
    public readonly logGroupSns: logs.CfnLogGroup;
    public readonly logStreamNginxEcsApp: logs.CfnLogStream;
    public readonly logStreamAppEcsApp: logs.CfnLogStream;
    public readonly logStreamEcsCron: logs.CfnLogStream;
    public readonly logStreamEcsQueue: logs.CfnLogStream;
    public readonly logStreamAuroraInstance: logs.CfnLogStream;
    public readonly logStreamAuroraPostgresql: logs.CfnLogStream;
    public readonly logStreamAuroraIamDbAuthError: logs.CfnLogStream;
    public readonly logStreamElastiCache: logs.CfnLogStream;
    public readonly logStreamLambdaLogsAlert: logs.CfnLogStream;
    public readonly logStreamLambdaMetricsAlert: logs.CfnLogStream;
    public readonly logStreamLambdaRdsControl: logs.CfnLogStream;
    public readonly logStreamEc2Bastion: logs.CfnLogStream;
    public readonly logStreamEc2BatchAzA: logs.CfnLogStream;
    public readonly logStreamEc2BatchAzC: logs.CfnLogStream;
    public readonly logStreamSns: logs.CfnLogStream;

    constructor(
        scope: Construct,
        id: string,
        private readonly snsProps: SnsProps,
        commonProps: CommonProps,
        envProps: EnvProps,
    ) {
        super(scope, id);

        // ------------------------------------------------------------
        // Amazon CloudWatch Logs for Amazon ECS (app: Nginx) Container Configuration
        // ------------------------------------------------------------
        this.logGroupNginxEcsApp = new logs.CfnLogGroup(
            new Construct(this, "LogGroupNginxEcsApp"),
            "Resource",
            {
                logGroupName: `/ecs/${commonProps.projectName}/${envProps.envName}/nginx-app`,
                logGroupClass: "STANDARD",
                retentionInDays: 365,
            },
        );

        cdk.Tags.of(this.logGroupNginxEcsApp).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-loggroup-nginx-app`,
        );
        cdk.Tags.of(this.logGroupNginxEcsApp).add("ProvisionedBy", "AWS");
        cdk.Tags.of(this.logGroupNginxEcsApp).add("ProjectCode", "1234567890");

        this.logStreamNginxEcsApp = new logs.CfnLogStream(
            new Construct(this, "LogStreamNginxEcsApp"),
            "Resource",
            {
                logGroupName: this.logGroupNginxEcsApp,
                logStreamName: `/ecs/${commonProps.projectName}/${envProps.envName}/nginx-app`,
            },
        );

        // ------------------------------------------------------------
        // Amazon CloudWatch Logs for Amazon ECS (app: App) Container Configuration
        // ------------------------------------------------------------
        this.logGroupAppEcsApp = new logs.CfnLogGroup(
            new Construct(this, "LogGroupAppEcsApp"),
            "Resource",
            {
                logGroupName: `/ecs/${commonProps.projectName}/${envProps.envName}/app-app`,
                logGroupClass: "STANDARD",
                retentionInDays: 365,
            },
        );

        cdk.Tags.of(this.logGroupAppEcsApp).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-loggroup-app-app`,
        );
        cdk.Tags.of(this.logGroupAppEcsApp).add("ProvisionedBy", "AWS");
        cdk.Tags.of(this.logGroupAppEcsApp).add("ProjectCode", "1234567890");

        this.logStreamAppEcsApp = new logs.CfnLogStream(
            new Construct(this, "LogStreamAppEcsApp"),
            "Resource",
            {
                logGroupName: this.logGroupAppEcsApp,
                logStreamName: `/ecs/${commonProps.projectName}/${envProps.envName}/app-app`,
            },
        );

        // ------------------------------------------------------------
        // Amazon CloudWatch Logs for Amazon ECS (cron) Container Configuration
        // ------------------------------------------------------------
        this.logGroupEcsCron = new logs.CfnLogGroup(
            new Construct(this, "LogGroupEcsCron"),
            "Resource",
            {
                logGroupName: `/ecs/${commonProps.projectName}/${envProps.envName}/cron`,
                logGroupClass: "STANDARD",
                retentionInDays: 365,
            },
        );

        cdk.Tags.of(this.logGroupEcsCron).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-loggroup-cron`,
        );
        cdk.Tags.of(this.logGroupEcsCron).add("ProvisionedBy", "AWS");
        cdk.Tags.of(this.logGroupEcsCron).add("ProjectCode", "1234567890");

        this.logStreamEcsCron = new logs.CfnLogStream(
            new Construct(this, "LogStreamEcsCron"),
            "Resource",
            {
                logGroupName: this.logGroupEcsCron,
                logStreamName: `/ecs/${commonProps.projectName}/${envProps.envName}/cron`,
            },
        );

        // ------------------------------------------------------------
        // Amazon CloudWatch Logs for Amazon ECS (queue) Container Configuration
        // ------------------------------------------------------------
        this.logGroupEcsQueue = new logs.CfnLogGroup(
            new Construct(this, "LogGroupEcsQueue"),
            "Resource",
            {
                logGroupName: `/ecs/${commonProps.projectName}/${envProps.envName}/queue`,
                logGroupClass: "STANDARD",
                retentionInDays: 365,
            },
        );

        cdk.Tags.of(this.logGroupEcsQueue).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-loggroup-queue`,
        );
        cdk.Tags.of(this.logGroupEcsQueue).add("ProvisionedBy", "AWS");
        cdk.Tags.of(this.logGroupEcsQueue).add("ProjectCode", "1234567890");

        this.logStreamEcsQueue = new logs.CfnLogStream(
            new Construct(this, "LogStreamEcsQueue"),
            "Resource",
            {
                logGroupName: this.logGroupEcsQueue,
                logStreamName: `/ecs/${commonProps.projectName}/${envProps.envName}/queue`,
            },
        );

        // ------------------------------------------------------------
        // Amazon CloudWatch Logs for Amazon Aurora (instance) Configuration
        // ------------------------------------------------------------
        this.logGroupAuroraInstance = new logs.CfnLogGroup(
            new Construct(this, "LogGroupAuroraInstance"),
            "Resource",
            {
                logGroupName: `/rds/${commonProps.projectName}/${envProps.envName}/aurora-instance`,
                logGroupClass: "STANDARD",
                retentionInDays: 365,
            },
        );

        cdk.Tags.of(this.logGroupAuroraInstance).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-loggroup-aurora-instance`,
        );
        cdk.Tags.of(this.logGroupAuroraInstance).add("ProvisionedBy", "AWS");
        cdk.Tags.of(this.logGroupAuroraInstance).add(
            "ProjectCode",
            "1234567890",
        );

        this.logStreamAuroraInstance = new logs.CfnLogStream(
            new Construct(this, "LogStreamAuroraInstance"),
            "Resource",
            {
                logGroupName: this.logGroupAuroraInstance,
                logStreamName: `/rds/${commonProps.projectName}/${envProps.envName}/aurora-instance`,
            },
        );

        // ------------------------------------------------------------
        // Amazon CloudWatch Logs for Amazon Aurora (PostgreSQL) Configuration
        // ------------------------------------------------------------
        this.logGroupAuroraPostgresql = new logs.CfnLogGroup(
            new Construct(this, "LogGroupAuroraPostgresql"),
            "Resource",
            {
                logGroupName: `/rds/${commonProps.projectName}/${envProps.envName}/aurora-postgresql`,
                logGroupClass: "STANDARD",
                retentionInDays: 365,
            },
        );

        cdk.Tags.of(this.logGroupAuroraPostgresql).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-loggroup-aurora-postgresql`,
        );
        cdk.Tags.of(this.logGroupAuroraPostgresql).add("ProvisionedBy", "AWS");
        cdk.Tags.of(this.logGroupAuroraPostgresql).add(
            "ProjectCode",
            "1234567890",
        );

        this.logStreamAuroraPostgresql = new logs.CfnLogStream(
            new Construct(this, "LogStreamAuroraPostgresql"),
            "Resource",
            {
                logGroupName: this.logGroupAuroraPostgresql,
                logStreamName: `/rds/${commonProps.projectName}/${envProps.envName}/aurora-postgresql`,
            },
        );

        // ------------------------------------------------------------
        // Amazon CloudWatch Logs for Amazon Aurora (IAM DB Auth Error) Configuration
        // ------------------------------------------------------------
        this.logGroupAuroraIamDbAuthError = new logs.CfnLogGroup(
            new Construct(this, "LogGroupAuroraIamDbAuthError"),
            "Resource",
            {
                logGroupName: `/rds/${commonProps.projectName}/${envProps.envName}/aurora-iam-db-auth-error`,
                logGroupClass: "STANDARD",
                retentionInDays: 365,
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
        cdk.Tags.of(this.logGroupAuroraIamDbAuthError).add(
            "ProjectCode",
            "1234567890",
        );

        this.logStreamAuroraIamDbAuthError = new logs.CfnLogStream(
            new Construct(this, "LogStreamAuroraIamDbAuthError"),
            "Resource",
            {
                logGroupName: this.logGroupAuroraIamDbAuthError,
                logStreamName: `/rds/${commonProps.projectName}/${envProps.envName}/aurora-iam-db-auth-error`,
            },
        );

        // ------------------------------------------------------------
        // Amazon CloudWatch Logs for Amazon ElastiCache Configuration
        // ------------------------------------------------------------
        this.logGroupElastiCache = new logs.CfnLogGroup(
            new Construct(this, "LogGroupElastiCache"),
            "Resource",
            {
                logGroupName: `/elasticache/${commonProps.projectName}/${envProps.envName}`,
                logGroupClass: "STANDARD",
                retentionInDays: 365,
            },
        );

        cdk.Tags.of(this.logGroupElastiCache).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-loggroup-elasticache`,
        );
        cdk.Tags.of(this.logGroupElastiCache).add("ProvisionedBy", "AWS");
        cdk.Tags.of(this.logGroupElastiCache).add("ProjectCode", "1234567890");

        this.logStreamElastiCache = new logs.CfnLogStream(
            new Construct(this, "LogStreamElastiCache"),
            "Resource",
            {
                logGroupName: this.logGroupElastiCache,
                logStreamName: `/elasticache/${commonProps.projectName}/${envProps.envName}`,
            },
        );

        // ------------------------------------------------------------
        // Amazon CloudWatch Logs for AWS Lambda Configuration (cloudwatch-logs-alert)
        // ------------------------------------------------------------
        this.logGroupLambdaLogsAlert = new logs.CfnLogGroup(
            new Construct(this, "LogGroupLambdaLogsAlert"),
            "Resource",
            {
                logGroupName: `/lambda/${commonProps.projectName}/${envProps.envName}/cloudwatch-logs-alert`,
                logGroupClass: "STANDARD",
                retentionInDays: 365,
            },
        );

        cdk.Tags.of(this.logGroupLambdaLogsAlert).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-loggroup-lambda-logs-alert`,
        );
        cdk.Tags.of(this.logGroupLambdaLogsAlert).add("ProvisionedBy", "AWS");
        cdk.Tags.of(this.logGroupLambdaLogsAlert).add(
            "ProjectCode",
            "1234567890",
        );

        this.logStreamLambdaLogsAlert = new logs.CfnLogStream(
            new Construct(this, "LogStreamLambdaLogsAlert"),
            "Resource",
            {
                logGroupName: this.logGroupLambdaLogsAlert,
                logStreamName: `/lambda/${commonProps.projectName}/${envProps.envName}/cloudwatch-logs-alert`,
            },
        );

        // ------------------------------------------------------------
        // Amazon CloudWatch Logs for AWS Lambda Configuration (cloudwatch-metrics-alert)
        // ------------------------------------------------------------
        this.logGroupLambdaMetricsAlert = new logs.CfnLogGroup(
            new Construct(this, "LogGroupLambdaMetricsAlert"),
            "Resource",
            {
                logGroupName: `/lambda/${commonProps.projectName}/${envProps.envName}/cloudwatch-metrics-alert`,
                logGroupClass: "STANDARD",
                retentionInDays: 365,
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
        cdk.Tags.of(this.logGroupLambdaMetricsAlert).add(
            "ProjectCode",
            "1234567890",
        );

        this.logStreamLambdaMetricsAlert = new logs.CfnLogStream(
            new Construct(this, "LogStreamLambdaMetricsAlert"),
            "Resource",
            {
                logGroupName: this.logGroupLambdaMetricsAlert,
                logStreamName: `/lambda/${commonProps.projectName}/${envProps.envName}/cloudwatch-metrics-alert`,
            },
        );

        // ------------------------------------------------------------
        // Amazon CloudWatch Logs for AWS Lambda Configuration (rds-control)
        // ------------------------------------------------------------
        this.logGroupLambdaRdsControl = new logs.CfnLogGroup(
            new Construct(this, "LogGroupLambdaRdsControl"),
            "Resource",
            {
                logGroupName: `/lambda/${commonProps.projectName}/${envProps.envName}/rds-control`,
                logGroupClass: "STANDARD",
                retentionInDays: 365,
            },
        );

        cdk.Tags.of(this.logGroupLambdaRdsControl).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-loggroup-lambda-rds-control`,
        );
        cdk.Tags.of(this.logGroupLambdaRdsControl).add("ProvisionedBy", "AWS");
        cdk.Tags.of(this.logGroupLambdaRdsControl).add(
            "ProjectCode",
            "1234567890",
        );

        this.logStreamLambdaRdsControl = new logs.CfnLogStream(
            new Construct(this, "LogStreamLambdaRdsControl"),
            "Resource",
            {
                logGroupName: this.logGroupLambdaRdsControl,
                logStreamName: `/lambda/${commonProps.projectName}/${envProps.envName}/rds-control`,
            },
        );

        // ------------------------------------------------------------
        // Amazon CloudWatch Logs for Amazon EC2 Bastion Configuration
        // ------------------------------------------------------------
        this.logGroupEc2Bastion = new logs.CfnLogGroup(
            new Construct(this, "LogGroupEc2Bastion"),
            "Resource",
            {
                logGroupName: `/ec2/${commonProps.projectName}/${envProps.envName}/bastion`,
                logGroupClass: "STANDARD",
                retentionInDays: 365,
            },
        );

        cdk.Tags.of(this.logGroupEc2Bastion).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-loggroup-ec2-bastion`,
        );
        cdk.Tags.of(this.logGroupEc2Bastion).add("ProvisionedBy", "AWS");
        cdk.Tags.of(this.logGroupEc2Bastion).add("ProjectCode", "1234567890");

        this.logStreamEc2Bastion = new logs.CfnLogStream(
            new Construct(this, "LogStreamEc2Bastion"),
            "Resource",
            {
                logGroupName: this.logGroupEc2Bastion,
                logStreamName: `/ec2/${commonProps.projectName}/${envProps.envName}/bastion`,
            },
        );

        // ------------------------------------------------------------
        // Amazon CloudWatch Logs for Amazon EC2 Batch (AZ-a) Configuration
        // ------------------------------------------------------------
        this.logGroupEc2BatchAzA = new logs.CfnLogGroup(
            new Construct(this, "LogGroupEc2BatchAzA"),
            "Resource",
            {
                logGroupName: `/ec2/${commonProps.projectName}/${envProps.envName}/batch-az-a`,
                logGroupClass: "STANDARD",
                retentionInDays: 365,
            },
        );

        cdk.Tags.of(this.logGroupEc2BatchAzA).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-loggroup-ec2-batch-az-a`,
        );
        cdk.Tags.of(this.logGroupEc2BatchAzA).add("ProvisionedBy", "AWS");
        cdk.Tags.of(this.logGroupEc2BatchAzA).add("ProjectCode", "1234567890");

        this.logStreamEc2BatchAzA = new logs.CfnLogStream(
            new Construct(this, "LogStreamEc2BatchAzA"),
            "Resource",
            {
                logGroupName: this.logGroupEc2BatchAzA,
                logStreamName: `/ec2/${commonProps.projectName}/${envProps.envName}/batch-az-a`,
            },
        );

        // ------------------------------------------------------------
        // Amazon CloudWatch Logs for Amazon EC2 Batch (AZ-c) Configuration
        // ------------------------------------------------------------
        this.logGroupEc2BatchAzC = new logs.CfnLogGroup(
            new Construct(this, "LogGroupEc2BatchAzC"),
            "Resource",
            {
                logGroupName: `/ec2/${commonProps.projectName}/${envProps.envName}/batch-az-c`,
                logGroupClass: "STANDARD",
                retentionInDays: 365,
            },
        );

        cdk.Tags.of(this.logGroupEc2BatchAzC).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-loggroup-ec2-batch-az-c`,
        );
        cdk.Tags.of(this.logGroupEc2BatchAzC).add("ProvisionedBy", "AWS");
        cdk.Tags.of(this.logGroupEc2BatchAzC).add("ProjectCode", "1234567890");

        this.logStreamEc2BatchAzC = new logs.CfnLogStream(
            new Construct(this, "LogStreamEc2BatchAzC"),
            "Resource",
            {
                logGroupName: this.logGroupEc2BatchAzC,
                logStreamName: `/ec2/${commonProps.projectName}/${envProps.envName}/batch-az-c`,
            },
        );

        // ------------------------------------------------------------
        // Amazon CloudWatch Logs for Amazon SNS Configuration
        // ------------------------------------------------------------
        this.logGroupSns = new logs.CfnLogGroup(
            new Construct(this, "LogGroupSns"),
            "Resource",
            {
                logGroupName: `/sns/${commonProps.projectName}/${envProps.envName}`,
                logGroupClass: "STANDARD",
                retentionInDays: 365,
            },
        );

        cdk.Tags.of(this.logGroupSns).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-loggroup-sns`,
        );
        cdk.Tags.of(this.logGroupSns).add("ProvisionedBy", "AWS");

        this.logStreamSns = new logs.CfnLogStream(
            new Construct(this, "LogStreamSns"),
            "Resource",
            {
                logGroupName: this.logGroupSns,
                logStreamName: `/sns/${commonProps.projectName}/${envProps.envName}`,
            },
        );
    }

    // ------------------------------------------------------------
    // Amazon CloudWatch Logs Subscription Filter Configuration
    // ------------------------------------------------------------
    public addCloudWatchLogsAlertSubscription(
        lambdaFunction: lambda.Function,
    ): void {
        lambdaFunction.addEnvironment(
            "snsTopicArn",
            this.snsProps.snsTopicLogsAlarm.topicArn,
        );
        this.snsProps.snsTopicLogsAlarm.grantPublish(lambdaFunction);

        const destination = new logsDestinations.LambdaDestination(
            lambdaFunction,
        );

        const sourceLogGroups: Record<string, logs.ILogGroup> = {
            NginxEcsApp: logs.LogGroup.fromLogGroupName(
                this,
                "NginxEcsAppSubscriptionSource",
                this.logGroupNginxEcsApp.ref,
            ),
            AppEcsApp: logs.LogGroup.fromLogGroupName(
                this,
                "AppEcsAppSubscriptionSource",
                this.logGroupAppEcsApp.ref,
            ),
            EcsCron: logs.LogGroup.fromLogGroupName(
                this,
                "EcsCronSubscriptionSource",
                this.logGroupEcsCron.ref,
            ),
            EcsQueue: logs.LogGroup.fromLogGroupName(
                this,
                "EcsQueueSubscriptionSource",
                this.logGroupEcsQueue.ref,
            ),
            AuroraInstance: logs.LogGroup.fromLogGroupName(
                this,
                "AuroraInstanceSubscriptionSource",
                this.logGroupAuroraInstance.ref,
            ),
            AuroraPostgresql: logs.LogGroup.fromLogGroupName(
                this,
                "AuroraPostgresqlSubscriptionSource",
                this.logGroupAuroraPostgresql.ref,
            ),
            AuroraIamDbAuthError: logs.LogGroup.fromLogGroupName(
                this,
                "AuroraIamDbAuthErrorSubscriptionSource",
                this.logGroupAuroraIamDbAuthError.ref,
            ),
            ElastiCache: logs.LogGroup.fromLogGroupName(
                this,
                "ElastiCacheSubscriptionSource",
                this.logGroupElastiCache.ref,
            ),
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
