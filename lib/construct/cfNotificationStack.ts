import type { aws_kms as kms } from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib";
import {
    aws_chatbot as chatbot,
    aws_iam as iam,
    aws_sns as sns,
    aws_sns_subscriptions as snsSubscriptions,
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

export interface NotificationProps {
    monitoringSlackWorkspaceId: string;
    monitoringSlackChannelId: string;
}

export interface KmsProps {
    snsKeyArn: kms.IKey;
}

// ------------------------------------------------------------
// [12] - Notification Configuration Stack
// ------------------------------------------------------------
export class CfNotificationStack extends Construct {
    public readonly snsTopicMetricsAlarm: sns.Topic;
    public readonly snsTopicLogsAlarm: sns.Topic;
    public readonly snsTopicEventNotification: sns.Topic;

    constructor(
        scope: Construct,
        id: string,
        notificationProps: NotificationProps,
        kmsProps: KmsProps,
        commonProps: CommonProps,
        envProps: EnvProps,
    ) {
        super(scope, id);

        // ------------------------------------------------------------
        // Amazon SNS for Amazon CloudWatch Metrics Alarm Configuration
        // ------------------------------------------------------------
        this.snsTopicMetricsAlarm = new sns.Topic(
            this,
            "SnsTopicMetricsAlarm",
            {
                topicName: `${commonProps.projectName}-${envProps.envName}-sns-metrics-alarm`,
                displayName: "SNS Topic for CloudWatch Metrics Alarm",
                enforceSSL: true,
                masterKey: kmsProps.snsKeyArn,
                signatureVersion: "2",
            },
        );

        cdk.Tags.of(this.snsTopicMetricsAlarm).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-sns-metrics-alarm`,
        );
        cdk.Tags.of(this.snsTopicMetricsAlarm).add("ProvisionedBy", "AWS");
        cdk.Tags.of(this.snsTopicMetricsAlarm).add("ProjectCode", "1234567890");

        // ------------------------------------------------------------
        // Amazon SNS for Amazon CloudWatch Logs Alarm Configuration
        // ------------------------------------------------------------
        this.snsTopicLogsAlarm = new sns.Topic(this, "SnsTopicLogsAlarm", {
            topicName: `${commonProps.projectName}-${envProps.envName}-sns-logs-alarm`,
            displayName: "SNS Topic for CloudWatch Logs Alarm",
            enforceSSL: true,
            masterKey: kmsProps.snsKeyArn,
            signatureVersion: "2",
        });

        cdk.Tags.of(this.snsTopicLogsAlarm).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-sns-logs-alarm`,
        );
        cdk.Tags.of(this.snsTopicLogsAlarm).add("ProvisionedBy", "AWS");
        cdk.Tags.of(this.snsTopicLogsAlarm).add("ProjectCode", "1234567890");

        // ------------------------------------------------------------
        // Amazon SNS for Event Notification Configuration
        // ------------------------------------------------------------
        this.snsTopicEventNotification = new sns.Topic(
            this,
            "SnsTopicEventNotification",
            {
                topicName: `${commonProps.projectName}-${envProps.envName}-sns-event-notification`,
                displayName: "SNS Topic for Event Notification",
                enforceSSL: true,
                masterKey: kmsProps.snsKeyArn,
                signatureVersion: "2",
            },
        );

        cdk.Tags.of(this.snsTopicEventNotification).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-sns-event-notification`,
        );
        cdk.Tags.of(this.snsTopicEventNotification).add("ProvisionedBy", "AWS");
        cdk.Tags.of(this.snsTopicEventNotification).add(
            "ProjectCode",
            "1234567890",
        );

        new chatbot.SlackChannelConfiguration(
            this,
            "SlackChannelConfiguration",
            {
                slackChannelConfigurationName: `${commonProps.projectName}-${envProps.envName}-slack-channel`,
                slackWorkspaceId: notificationProps.monitoringSlackWorkspaceId,
                slackChannelId: notificationProps.monitoringSlackChannelId,
                notificationTopics: [
                    this.snsTopicMetricsAlarm,
                    this.snsTopicLogsAlarm,
                    this.snsTopicEventNotification,
                ],
                guardrailPolicies: [
                    iam.ManagedPolicy.fromAwsManagedPolicyName(
                        "CloudWatchReadOnlyAccess",
                    ),
                ],
                loggingLevel: chatbot.LoggingLevel.ERROR,
            },
        );

        cdk.Tags.of(this).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-notification-stack`,
        );
        cdk.Tags.of(this).add("ProvisionedBy", "AWS");
        cdk.Tags.of(this).add("ProjectCode", "1234567890");
    }

    // ------------------------------------------------------------
    // Amazon SNS Subscription Configuration
    // (grants Amazon SNS permission to invoke the Lambda function)
    // ------------------------------------------------------------
    public addEventNotificationSubscription(
        lambdaFunction: lambda.IFunction,
    ): void {
        this.snsTopicEventNotification.addSubscription(
            new snsSubscriptions.LambdaSubscription(lambdaFunction),
        );
    }
}
