import type { aws_kms as kms } from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib";
import {
    aws_sns as sns,
    aws_sns_subscriptions as subscriptions,
} from "aws-cdk-lib";
import { Construct } from "constructs";

export interface commonProps {
    projectName: string;
    envName: string;
}

export interface pocProps {
    monitoringNotificationEmail: string;
    monitoringSlackWorkspaceId: string;
}

export interface kmsProps {
    snsKeyArn: kms.IKey;
}

// ------------------------------------------------------------
// [13] - Notification Configuration Stack
// ------------------------------------------------------------
export class cfNotificationStack extends Construct {
    public readonly snsTopicMetricsAlarm: sns.Topic;
    public readonly snsTopicLogsAlarm: sns.Topic;
    public readonly snsTopicEventNotification: sns.Topic;

    constructor(
        scope: Construct,
        id: string,
        props: commonProps,
        pocProps: pocProps,
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
                topicName: `${props.projectName}-${props.envName}-sns-metrics-alarm`,
                displayName: "SNS Topic for CloudWatch Metrics Alarm",
                enforceSSL: true,
                masterKey: kmsProps.snsKeyArn,
                signatureVersion: "sigv4",
            },
        );

        this.snsTopicMetricsAlarm.addSubscription(
            new subscriptions.UrlSubscription(
                pocProps.monitoringSlackWorkspaceId,
                {
                    deliveryPolicy: {
                        healthyRetryPolicy: {
                            numRetries: 3,
                            minDelayTarget: cdk.Duration.seconds(20),
                            maxDelayTarget: cdk.Duration.seconds(20),
                            numNoDelayRetries: 0,
                            numMinDelayRetries: 0,
                            numMaxDelayRetries: 0,
                            backoffFunction: sns.BackoffFunction.LINEAR,
                        },
                    },
                },
            ),
        );

        cdk.Tags.of(this.snsTopicMetricsAlarm).add(
            "Name",
            `${props.projectName}-${props.envName}-sns-metrics-alarm`,
        );
        cdk.Tags.of(this.snsTopicMetricsAlarm).add("ProvisionedBy", "AWS");

        // ------------------------------------------------------------
        // Amazon SNS for Amazon CloudWatch Logs Alarm Configuration
        // ------------------------------------------------------------
        this.snsTopicLogsAlarm = new sns.Topic(this, "SnsTopicLogsAlarm", {
            topicName: `${props.projectName}-${props.envName}-sns-logs-alarm`,
            displayName: "SNS Topic for CloudWatch Logs Alarm",
            enforceSSL: true,
            masterKey: kmsProps.snsKeyArn,
            signatureVersion: "sigv4",
        });

        this.snsTopicLogsAlarm.addSubscription(
            new subscriptions.UrlSubscription(
                pocProps.monitoringSlackWorkspaceId,
                {
                    deliveryPolicy: {
                        healthyRetryPolicy: {
                            numRetries: 3,
                            minDelayTarget: cdk.Duration.seconds(20),
                            maxDelayTarget: cdk.Duration.seconds(20),
                            numNoDelayRetries: 0,
                            numMinDelayRetries: 0,
                            numMaxDelayRetries: 0,
                            backoffFunction: sns.BackoffFunction.LINEAR,
                        },
                    },
                },
            ),
        );

        cdk.Tags.of(this.snsTopicLogsAlarm).add(
            "Name",
            `${props.projectName}-${props.envName}-sns-logs-alarm`,
        );
        cdk.Tags.of(this.snsTopicLogsAlarm).add("ProvisionedBy", "AWS");

        // ------------------------------------------------------------
        // Amazon SNS for Event Notification Configuration
        // ------------------------------------------------------------
        this.snsTopicEventNotification = new sns.Topic(
            this,
            "SnsTopicEventNotification",
            {
                topicName: `${props.projectName}-${props.envName}-sns-event-notification`,
                displayName: "SNS Topic for Event Notification",
                enforceSSL: true,
                masterKey: kmsProps.snsKeyArn,
                signatureVersion: "sigv4",
            },
        );

        this.snsTopicEventNotification.addSubscription(
            new subscriptions.UrlSubscription(
                pocProps.monitoringSlackWorkspaceId,
                {
                    deliveryPolicy: {
                        healthyRetryPolicy: {
                            numRetries: 3,
                            minDelayTarget: cdk.Duration.seconds(20),
                            maxDelayTarget: cdk.Duration.seconds(20),
                            numNoDelayRetries: 0,
                            numMinDelayRetries: 0,
                            numMaxDelayRetries: 0,
                            backoffFunction: sns.BackoffFunction.LINEAR,
                        },
                    },
                },
            ),
        );

        cdk.Tags.of(this.snsTopicEventNotification).add(
            "Name",
            `${props.projectName}-${props.envName}-sns-event-notification`,
        );
        cdk.Tags.of(this.snsTopicEventNotification).add("ProvisionedBy", "AWS");
    }
}
