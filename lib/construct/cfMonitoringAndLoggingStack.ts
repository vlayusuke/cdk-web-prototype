import * as cdk from "aws-cdk-lib";
import {
    aws_applicationautoscaling as applicationautoscaling,
    aws_cloudwatch as cloudwatch,
    aws_cloudwatch_actions as cloudwatchActions,
    type aws_ecs as ecs,
} from "aws-cdk-lib";
import { Construct } from "constructs";

export interface commonProps {
    projectName: string;
    envName: string;
}

export interface ecsProps {
    ecsAppScalableTarget: ecs.ScalableTaskCount;
}

// ------------------------------------------------------------
// [13] - cfMonitoringAndLoggingStack
// ------------------------------------------------------------
export class cfMonitoringAndLoggingStack extends Construct {
    private readonly cpuUtilizationHighAlarmEcsApp: cloudwatch.Alarm;
    private readonly cpuUtilizationLowAlarmEcsApp: cloudwatch.Alarm;
    private readonly memoryUtilizationHighAlarmEcsApp: cloudwatch.Alarm;
    private readonly memoryUtilizationLowAlarmEcsApp: cloudwatch.Alarm;
    private readonly deploymentFailedAlarmEcsApp: cloudwatch.Alarm;
    private readonly cpuUtilizationHighAlarmEcsCron: cloudwatch.Alarm;
    private readonly memoryUtilizationHighAlarmEcsCron: cloudwatch.Alarm;
    private readonly cpuUtilizationHighAlarmEcsQueue: cloudwatch.Alarm;
    private readonly memoryUtilizationHighAlarmEcsQueue: cloudwatch.Alarm;

    constructor(
        scope: Construct,
        id: string,
        ecsProps: ecsProps,
        commonProps: commonProps,
    ) {
        super(scope, id);

        // ------------------------------------------------------------
        // Amazon CloudWatch Metric Alarms for Amazon ECS (app) Configuration
        // ------------------------------------------------------------
        this.cpuUtilizationHighAlarmEcsApp = new cloudwatch.Alarm(
            this,
            "CpuUtilizationHighAlarmEcsApp",
            {
                metric: new cloudwatch.Metric({
                    namespace: "AWS/ECS",
                    metricName: "CPUUtilization",
                    dimensionsMap: {
                        ClusterName: `${commonProps.projectName}-${commonProps.envName}-ecs-cluster`,
                        ServiceName: `${commonProps.projectName}-${commonProps.envName}-app-service`,
                    },
                    statistic: "Maximum",
                    period: cdk.Duration.seconds(60),
                }),
                threshold: 80,
                evaluationPeriods: 2,
                datapointsToAlarm: 2,
                treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
                comparisonOperator:
                    cloudwatch.ComparisonOperator
                        .GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
                alarmDescription: "Alarm when CPU utilization exceeds 80%",
                alarmName: "CpuUtilizationHighAlarmEcsApp",
                actionsEnabled: true,
            },
        );

        cdk.Tags.of(this.cpuUtilizationHighAlarmEcsApp).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-cpu-utilization-high-alarm-ecs-app`,
        );
        cdk.Tags.of(this.cpuUtilizationHighAlarmEcsApp).add(
            "ProvisionedBy",
            "AWS",
        );

        this.cpuUtilizationLowAlarmEcsApp = new cloudwatch.Alarm(
            this,
            "CpuUtilizationLowAlarmEcsApp",
            {
                metric: new cloudwatch.Metric({
                    namespace: "AWS/ECS",
                    metricName: "CPUUtilization",
                    dimensionsMap: {
                        ClusterName: `${commonProps.projectName}-${commonProps.envName}-ecs-cluster`,
                        ServiceName: `${commonProps.projectName}-${commonProps.envName}-app-service`,
                    },
                    statistic: "Maximum",
                    period: cdk.Duration.seconds(60),
                }),
                threshold: 15,
                evaluationPeriods: 10,
                datapointsToAlarm: 10,
                treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
                comparisonOperator:
                    cloudwatch.ComparisonOperator
                        .LESS_THAN_OR_EQUAL_TO_THRESHOLD,
                alarmDescription: "Alarm when CPU utilization falls below 15%",
                alarmName: "CpuUtilizationLowAlarmEcsApp",
                actionsEnabled: true,
            },
        );

        cdk.Tags.of(this.cpuUtilizationLowAlarmEcsApp).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-cpu-utilization-low-alarm-ecs-app`,
        );
        cdk.Tags.of(this.cpuUtilizationLowAlarmEcsApp).add(
            "ProvisionedBy",
            "AWS",
        );

        this.memoryUtilizationHighAlarmEcsApp = new cloudwatch.Alarm(
            this,
            "MemoryUtilizationHighAlarmEcsApp",
            {
                metric: new cloudwatch.Metric({
                    namespace: "AWS/ECS",
                    metricName: "MemoryUtilization",
                    dimensionsMap: {
                        ClusterName: `${commonProps.projectName}-${commonProps.envName}-ecs-cluster`,
                        ServiceName: `${commonProps.projectName}-${commonProps.envName}-app-service`,
                    },
                    statistic: "Maximum",
                    period: cdk.Duration.seconds(60),
                }),
                threshold: 80,
                evaluationPeriods: 2,
                datapointsToAlarm: 2,
                treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
                comparisonOperator:
                    cloudwatch.ComparisonOperator
                        .GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
                alarmDescription: "Alarm when Memory utilization exceeds 80%",
                alarmName: "MemoryUtilizationHighAlarmEcsApp",
                actionsEnabled: true,
            },
        );

        cdk.Tags.of(this.memoryUtilizationHighAlarmEcsApp).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-memory-utilization-high-alarm-ecs-app`,
        );
        cdk.Tags.of(this.memoryUtilizationHighAlarmEcsApp).add(
            "ProvisionedBy",
            "AWS",
        );

        this.memoryUtilizationLowAlarmEcsApp = new cloudwatch.Alarm(
            this,
            "MemoryUtilizationLowAlarmEcsApp",
            {
                metric: new cloudwatch.Metric({
                    namespace: "AWS/ECS",
                    metricName: "MemoryUtilization",
                    dimensionsMap: {
                        ClusterName: `${commonProps.projectName}-${commonProps.envName}-ecs-cluster`,
                        ServiceName: `${commonProps.projectName}-${commonProps.envName}-app-service`,
                    },
                    statistic: "Maximum",
                    period: cdk.Duration.seconds(60),
                }),
                threshold: 15,
                evaluationPeriods: 10,
                datapointsToAlarm: 10,
                treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
                comparisonOperator:
                    cloudwatch.ComparisonOperator
                        .LESS_THAN_OR_EQUAL_TO_THRESHOLD,
                alarmDescription:
                    "Alarm when Memory utilization falls below 15%",
                alarmName: "MemoryUtilizationLowAlarmEcsApp",
                actionsEnabled: true,
            },
        );

        cdk.Tags.of(this.memoryUtilizationLowAlarmEcsApp).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-memory-utilization-low-alarm-ecs-app`,
        );
        cdk.Tags.of(this.memoryUtilizationLowAlarmEcsApp).add(
            "ProvisionedBy",
            "AWS",
        );

        this.deploymentFailedAlarmEcsApp = new cloudwatch.Alarm(
            this,
            "DeploymentFailedAlarmEcsApp",
            {
                metric: new cloudwatch.Metric({
                    namespace: "AWS/ECS",
                    metricName: "DeploymentFailed",
                    dimensionsMap: {
                        ClusterName: `${commonProps.projectName}-${commonProps.envName}-ecs-cluster`,
                        ServiceName: `${commonProps.projectName}-${commonProps.envName}-app-service`,
                    },
                    statistic: "Maximum",
                    period: cdk.Duration.seconds(60),
                }),
                threshold: 1,
                evaluationPeriods: 1,
                datapointsToAlarm: 1,
                treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
                comparisonOperator:
                    cloudwatch.ComparisonOperator
                        .GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
                alarmDescription: "Alarm when ECS deployment fails",
                alarmName: "DeploymentFailedAlarmEcsApp",
                actionsEnabled: true,
            },
        );

        cdk.Tags.of(this.deploymentFailedAlarmEcsApp).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-deployment-failed-alarm-ecs-app`,
        );
        cdk.Tags.of(this.deploymentFailedAlarmEcsApp).add(
            "ProvisionedBy",
            "AWS",
        );

        // ------------------------------------------------------------
        // Amazon ECS (app) Scale-Out Action Triggered by the Alarm
        // ------------------------------------------------------------
        const ecsAppScaleOutAction =
            new applicationautoscaling.StepScalingAction(
                this,
                "ScaleOutActionEcsApp",
                {
                    scalingTarget: ecsProps.ecsAppScalableTarget,
                    adjustmentType:
                        applicationautoscaling.AdjustmentType
                            .CHANGE_IN_CAPACITY,
                    cooldown: cdk.Duration.seconds(120),
                },
            );

        ecsAppScaleOutAction.addAdjustment({
            adjustment: 1,
            lowerBound: 0,
        });

        this.cpuUtilizationHighAlarmEcsApp.addAlarmAction(
            new cloudwatchActions.ApplicationScalingAction(
                ecsAppScaleOutAction,
            ),
        );

        this.memoryUtilizationHighAlarmEcsApp.addAlarmAction(
            new cloudwatchActions.ApplicationScalingAction(
                ecsAppScaleOutAction,
            ),
        );

        // ------------------------------------------------------------
        // Amazon ECS (app) Scale-In Action Triggered by the Alarm
        // ------------------------------------------------------------
        const ecsAppScaleInAction =
            new applicationautoscaling.StepScalingAction(
                this,
                "ScaleInActionEcsApp",
                {
                    scalingTarget: ecsProps.ecsAppScalableTarget,
                    adjustmentType:
                        applicationautoscaling.AdjustmentType
                            .CHANGE_IN_CAPACITY,
                    cooldown: cdk.Duration.seconds(120),
                },
            );

        ecsAppScaleInAction.addAdjustment({
            adjustment: -1,
            lowerBound: 0,
        });

        this.cpuUtilizationLowAlarmEcsApp.addAlarmAction(
            new cloudwatchActions.ApplicationScalingAction(ecsAppScaleInAction),
        );

        this.memoryUtilizationLowAlarmEcsApp.addAlarmAction(
            new cloudwatchActions.ApplicationScalingAction(ecsAppScaleInAction),
        );

        // ------------------------------------------------------------
        // Amazon CloudWatch Metric Alarms for Amazon ECS (cron) Configuration
        // ------------------------------------------------------------
        this.cpuUtilizationHighAlarmEcsCron = new cloudwatch.Alarm(
            this,
            "CpuUtilizationHighAlarmEcsCron",
            {
                metric: new cloudwatch.Metric({
                    namespace: "AWS/ECS",
                    metricName: "CPUUtilization",
                    dimensionsMap: {
                        ClusterName: `${commonProps.projectName}-${commonProps.envName}-ecs-cluster`,
                        ServiceName: `${commonProps.projectName}-${commonProps.envName}-cron-service`,
                    },
                    statistic: "Maximum",
                    period: cdk.Duration.seconds(60),
                }),
                threshold: 80,
                evaluationPeriods: 2,
                datapointsToAlarm: 2,
                treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
                comparisonOperator:
                    cloudwatch.ComparisonOperator
                        .GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
                alarmDescription: "Alarm when CPU utilization exceeds 80%",
                alarmName: "CpuUtilizationHighAlarmEcsCron",
                actionsEnabled: true,
            },
        );

        cdk.Tags.of(this.cpuUtilizationHighAlarmEcsCron).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-cpu-utilization-high-alarm-ecs-cron`,
        );
        cdk.Tags.of(this.cpuUtilizationHighAlarmEcsCron).add(
            "ProvisionedBy",
            "AWS",
        );

        this.memoryUtilizationHighAlarmEcsCron = new cloudwatch.Alarm(
            this,
            "MemoryUtilizationHighAlarmEcsCron",
            {
                metric: new cloudwatch.Metric({
                    namespace: "AWS/ECS",
                    metricName: "MemoryUtilization",
                    dimensionsMap: {
                        ClusterName: `${commonProps.projectName}-${commonProps.envName}-ecs-cluster`,
                        ServiceName: `${commonProps.projectName}-${commonProps.envName}-cron-service`,
                    },
                    statistic: "Maximum",
                    period: cdk.Duration.seconds(60),
                }),
                threshold: 80,
                evaluationPeriods: 2,
                datapointsToAlarm: 2,
                treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
                comparisonOperator:
                    cloudwatch.ComparisonOperator
                        .GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
                alarmDescription: "Alarm when Memory utilization exceeds 80%",
                alarmName: "MemoryUtilizationHighAlarmEcsCron",
                actionsEnabled: true,
            },
        );

        cdk.Tags.of(this.memoryUtilizationHighAlarmEcsCron).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-memory-utilization-high-alarm-ecs-cron`,
        );
        cdk.Tags.of(this.memoryUtilizationHighAlarmEcsCron).add(
            "ProvisionedBy",
            "AWS",
        );

        // ------------------------------------------------------------
        // Amazon CloudWatch Metric Alarms for Amazon ECS (queue) Configuration
        // ------------------------------------------------------------
        this.cpuUtilizationHighAlarmEcsQueue = new cloudwatch.Alarm(
            this,
            "CpuUtilizationHighAlarmEcsQueue",
            {
                metric: new cloudwatch.Metric({
                    namespace: "AWS/ECS",
                    metricName: "CPUUtilization",
                    dimensionsMap: {
                        ClusterName: `${commonProps.projectName}-${commonProps.envName}-ecs-cluster`,
                        ServiceName: `${commonProps.projectName}-${commonProps.envName}-queue-service`,
                    },
                    statistic: "Maximum",
                    period: cdk.Duration.seconds(60),
                }),
                threshold: 80,
                evaluationPeriods: 2,
                datapointsToAlarm: 2,
                treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
                comparisonOperator:
                    cloudwatch.ComparisonOperator
                        .GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
                alarmDescription: "Alarm when CPU utilization exceeds 80%",
                alarmName: "CpuUtilizationHighAlarmEcsQueue",
                actionsEnabled: true,
            },
        );

        cdk.Tags.of(this.cpuUtilizationHighAlarmEcsQueue).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-cpu-utilization-high-alarm-ecs-queue`,
        );
        cdk.Tags.of(this.cpuUtilizationHighAlarmEcsQueue).add(
            "ProvisionedBy",
            "AWS",
        );

        this.memoryUtilizationHighAlarmEcsQueue = new cloudwatch.Alarm(
            this,
            "MemoryUtilizationHighAlarmEcsQueue",
            {
                metric: new cloudwatch.Metric({
                    namespace: "AWS/ECS",
                    metricName: "MemoryUtilization",
                    dimensionsMap: {
                        ClusterName: `${commonProps.projectName}-${commonProps.envName}-ecs-cluster`,
                        ServiceName: `${commonProps.projectName}-${commonProps.envName}-queue-service`,
                    },
                    statistic: "Maximum",
                    period: cdk.Duration.seconds(60),
                }),
                threshold: 80,
                evaluationPeriods: 2,
                datapointsToAlarm: 2,
                treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
                comparisonOperator:
                    cloudwatch.ComparisonOperator
                        .GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
                alarmDescription: "Alarm when Memory utilization exceeds 80%",
                alarmName: "MemoryUtilizationHighAlarmEcsQueue",
                actionsEnabled: true,
            },
        );

        cdk.Tags.of(this.memoryUtilizationHighAlarmEcsQueue).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-memory-utilization-high-alarm-ecs-queue`,
        );
        cdk.Tags.of(this.memoryUtilizationHighAlarmEcsQueue).add(
            "ProvisionedBy",
            "AWS",
        );
    }
}
