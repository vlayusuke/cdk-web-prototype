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

export interface commonProps {
    projectName: string;
    dashboardName: string;
}

export interface envProps {
    envName: string;
    vpcCidr: string;
    defaultGatewayCidr: string;
}

export interface notificationProps {
    monitoringSlackWorkspaceId: string;
    monitoringSlackChannelId: string;
}

export interface kmsProps {
    snsKeyArn: kms.IKey;
}

// ------------------------------------------------------------
// [12] - Notification Configuration Stack
// ------------------------------------------------------------
export class cfNotificationStack extends Construct {
    public readonly snsTopicMetricsAlarm: sns.Topic;
    public readonly snsTopicLogsAlarm: sns.Topic;
    public readonly snsTopicEventNotification: sns.Topic;

    constructor(
        scope: Construct,
        id: string,
        commonProps: commonProps,
        envProps: envProps,
        notificationProps: notificationProps,
        kmsProps: kmsProps,
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
