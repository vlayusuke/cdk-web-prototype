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
    auroraMaxConnections: number;
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
    private readonly cpuUtilizationHighAlarmEc2Bastion: cloudwatch.Alarm;
    private readonly memoryUtilizationHighAlarmEc2Bastion: cloudwatch.Alarm;
    private readonly cpuUtilizationHighAlarmEc2BatchAzA: cloudwatch.Alarm;
    private readonly memoryUtilizationHighAlarmEc2BatchAzA: cloudwatch.Alarm;
    private readonly cpuUtilizationHighAlarmEc2BatchAzC: cloudwatch.Alarm;
    private readonly memoryUtilizationHighAlarmEc2BatchAzC: cloudwatch.Alarm;
    private readonly healtyHostCounAlarmAlb: cloudwatch.Alarm;
    private readonly unHealthyHostCountAlarmAlb: cloudwatch.Alarm;
    private readonly rejectedConnectionCountAlarmAlb: cloudwatch.Alarm;
    private readonly cpuUtilizationHighAlarmAurora: cloudwatch.Alarm;
    private readonly memoryUtilizationHighAlarmAurora: cloudwatch.Alarm;
    private readonly connectionHighAlarmAurora: cloudwatch.Alarm;
    private readonly cpuUtilizationHighAlarmElastiCache: cloudwatch.Alarm;
    private readonly memoryUtilizationHighAlarmElastiCache: cloudwatch.Alarm;
    private readonly swapUsageHighAlarmElastiCache: cloudwatch.Alarm;

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

        // ------------------------------------------------------------
        // Amazon CloudWatch Metrics for Amazon EC2 (bastion) Configuration
        // ------------------------------------------------------------
        this.cpuUtilizationHighAlarmEc2Bastion = new cloudwatch.Alarm(
            this,
            "CpuUtilizationHighAlarmBastion",
            {
                metric: new cloudwatch.Metric({
                    namespace: "AWS/EC2",
                    metricName: "CPUUtilization",
                    dimensionsMap: {
                        InstanceId: `${commonProps.projectName}-${commonProps.envName}-bastion-instance`,
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
                alarmDescription:
                    "Amazon EC2 (bastion) Alarm when CPU utilization exceeds 80%",
                alarmName: "CpuUtilizationHighAlarmBastion",
                actionsEnabled: true,
            },
        );

        cdk.Tags.of(this.cpuUtilizationHighAlarmEc2Bastion).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-cpu-utilization-high-alarm-bastion`,
        );
        cdk.Tags.of(this.cpuUtilizationHighAlarmEc2Bastion).add(
            "ProvisionedBy",
            "AWS",
        );

        this.memoryUtilizationHighAlarmEc2Bastion = new cloudwatch.Alarm(
            this,
            "MemoryUtilizationHighAlarmBastion",
            {
                metric: new cloudwatch.Metric({
                    namespace: "AWS/EC2",
                    metricName: "MemoryUtilization",
                    dimensionsMap: {
                        InstanceId: `${commonProps.projectName}-${commonProps.envName}-bastion-instance`,
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
                alarmDescription:
                    "Amazon EC2 (bastion) Alarm when Memory utilization exceeds 80%",
                alarmName: "MemoryUtilizationHighAlarmBastion",
                actionsEnabled: true,
            },
        );

        cdk.Tags.of(this.memoryUtilizationHighAlarmEc2Bastion).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-memory-utilization-high-alarm-bastion`,
        );
        cdk.Tags.of(this.memoryUtilizationHighAlarmEc2Bastion).add(
            "ProvisionedBy",
            "AWS",
        );

        // ------------------------------------------------------------
        // Amazon CloudWatch Metrics for Amazon EC2 (batch) Configuration
        // ------------------------------------------------------------
        this.cpuUtilizationHighAlarmEc2BatchAzA = new cloudwatch.Alarm(
            this,
            "CpuUtilizationHighAlarmEc2BatchAzA",
            {
                metric: new cloudwatch.Metric({
                    namespace: "AWS/EC2",
                    metricName: "CPUUtilization",
                    dimensionsMap: {
                        InstanceId: `${commonProps.projectName}-${commonProps.envName}-batch-az-a-instance`,
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
                alarmDescription:
                    "Amazon EC2 (batch AZ-a) Alarm when CPU utilization exceeds 80%",
                alarmName: "CpuUtilizationHighAlarmEc2BatchAzA",
                actionsEnabled: true,
            },
        );

        cdk.Tags.of(this.cpuUtilizationHighAlarmEc2BatchAzA).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-cpu-utilization-high-alarm-ec2-batch-az-a`,
        );
        cdk.Tags.of(this.cpuUtilizationHighAlarmEc2BatchAzA).add(
            "ProvisionedBy",
            "AWS",
        );

        this.memoryUtilizationHighAlarmEc2BatchAzA = new cloudwatch.Alarm(
            this,
            "MemoryUtilizationHighAlarmEc2BatchAzA",
            {
                metric: new cloudwatch.Metric({
                    namespace: "AWS/EC2",
                    metricName: "MemoryUtilization",
                    dimensionsMap: {
                        InstanceId: `${commonProps.projectName}-${commonProps.envName}-batch-az-a-instance`,
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
                alarmDescription:
                    "Amazon EC2 (batch AZ-a) Alarm when Memory utilization exceeds 80%",
                alarmName: "MemoryUtilizationHighAlarmEc2BatchAzA",
                actionsEnabled: true,
            },
        );

        cdk.Tags.of(this.memoryUtilizationHighAlarmEc2BatchAzA).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-memory-utilization-high-alarm-ec2-batch-az-a`,
        );
        cdk.Tags.of(this.memoryUtilizationHighAlarmEc2BatchAzA).add(
            "ProvisionedBy",
            "AWS",
        );

        this.cpuUtilizationHighAlarmEc2BatchAzC = new cloudwatch.Alarm(
            this,
            "CpuUtilizationHighAlarmEc2BatchAzC",
            {
                metric: new cloudwatch.Metric({
                    namespace: "AWS/EC2",
                    metricName: "CPUUtilization",
                    dimensionsMap: {
                        InstanceId: `${commonProps.projectName}-${commonProps.envName}-batch-az-c-instance`,
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
                alarmDescription:
                    "Amazon EC2 (batch AZ-c) Alarm when CPU utilization exceeds 80%",
                alarmName: "CpuUtilizationHighAlarmEc2BatchAzC",
                actionsEnabled: true,
            },
        );

        cdk.Tags.of(this.cpuUtilizationHighAlarmEc2BatchAzC).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-cpu-utilization-high-alarm-ec2-batch-az-c`,
        );
        cdk.Tags.of(this.cpuUtilizationHighAlarmEc2BatchAzC).add(
            "ProvisionedBy",
            "AWS",
        );

        this.memoryUtilizationHighAlarmEc2BatchAzC = new cloudwatch.Alarm(
            this,
            "MemoryUtilizationHighAlarmEc2BatchAzC",
            {
                metric: new cloudwatch.Metric({
                    namespace: "AWS/EC2",
                    metricName: "MemoryUtilization",
                    dimensionsMap: {
                        InstanceId: `${commonProps.projectName}-${commonProps.envName}-batch-az-c-instance`,
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
                alarmDescription:
                    "Amazon EC2 (batch AZ-c) Alarm when Memory utilization exceeds 80%",
                alarmName: "MemoryUtilizationHighAlarmEc2BatchAzC",
                actionsEnabled: true,
            },
        );

        cdk.Tags.of(this.memoryUtilizationHighAlarmEc2BatchAzC).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-memory-utilization-high-alarm-ec2-batch-az-c`,
        );
        cdk.Tags.of(this.memoryUtilizationHighAlarmEc2BatchAzC).add(
            "ProvisionedBy",
            "AWS",
        );

        // ------------------------------------------------------------
        // Amazon CloudWatch Metrics for Application Load Balancer Configuration
        // ------------------------------------------------------------
        this.healtyHostCounAlarmAlb = new cloudwatch.Alarm(
            this,
            "HealtyHostCounAlarmAlb",
            {
                metric: new cloudwatch.Metric({
                    namespace: "AWS/ApplicationELB",
                    metricName: "HealthyHostCount",
                    dimensionsMap: {
                        LoadBalancer: `${commonProps.projectName}-${commonProps.envName}-alb`,
                    },
                    statistic: "Minimum",
                    period: cdk.Duration.seconds(60),
                }),
                threshold: 0,
                evaluationPeriods: 1,
                datapointsToAlarm: 1,
                treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
                comparisonOperator:
                    cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
                alarmDescription:
                    "Application Load Balancer Alarm when Healthy Host Count is less than 1",
                alarmName: "HealtyHostCounAlarmAlb",
                actionsEnabled: true,
            },
        );

        cdk.Tags.of(this.healtyHostCounAlarmAlb).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-healty-host-coun-alarm-alb`,
        );
        cdk.Tags.of(this.healtyHostCounAlarmAlb).add("ProvisionedBy", "AWS");

        this.unHealthyHostCountAlarmAlb = new cloudwatch.Alarm(
            this,
            "UnHealthyHostCountAlarmAlb",
            {
                metric: new cloudwatch.Metric({
                    namespace: "AWS/ApplicationELB",
                    metricName: "UnHealthyHostCount",
                    dimensionsMap: {
                        LoadBalancer: `${commonProps.projectName}-${commonProps.envName}-alb`,
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
                alarmDescription:
                    "Application Load Balancer Alarm when UnHealthy Host Count is greater than or equal to 1",
                alarmName: "UnHealthyHostCountAlarmAlb",
                actionsEnabled: true,
            },
        );

        cdk.Tags.of(this.unHealthyHostCountAlarmAlb).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-unhealthy-host-count-alarm-alb`,
        );
        cdk.Tags.of(this.unHealthyHostCountAlarmAlb).add(
            "ProvisionedBy",
            "AWS",
        );

        this.rejectedConnectionCountAlarmAlb = new cloudwatch.Alarm(
            this,
            "RejectedConnectionCountAlarmAlb",
            {
                metric: new cloudwatch.Metric({
                    namespace: "AWS/ApplicationELB",
                    metricName: "RejectedConnectionCount",
                    dimensionsMap: {
                        LoadBalancer: `${commonProps.projectName}-${commonProps.envName}-alb`,
                    },
                    statistic: "Sum",
                    period: cdk.Duration.seconds(60),
                }),
                threshold: 1,
                evaluationPeriods: 2,
                datapointsToAlarm: 2,
                treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
                comparisonOperator:
                    cloudwatch.ComparisonOperator
                        .GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
                alarmDescription:
                    "Application Load Balancer Alarm when Rejected Connection Count is greater than or equal to 1",
                alarmName: "RejectedConnectionCountAlarmAlb",
                actionsEnabled: true,
            },
        );

        cdk.Tags.of(this.rejectedConnectionCountAlarmAlb).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-rejected-connection-count-alarm-alb`,
        );
        cdk.Tags.of(this.rejectedConnectionCountAlarmAlb).add(
            "ProvisionedBy",
            "AWS",
        );

        // ------------------------------------------------------------
        // Amazon CloudWatch Metrics for Amazon Aurora Configuration
        // ------------------------------------------------------------
        this.cpuUtilizationHighAlarmAurora = new cloudwatch.Alarm(
            this,
            "CpuUtilizationHighAlarmAurora",
            {
                metric: new cloudwatch.Metric({
                    namespace: "AWS/RDS",
                    metricName: "CPUUtilization",
                    dimensionsMap: {
                        DBInstanceIdentifier: `${commonProps.projectName}-${commonProps.envName}-aurora`,
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
                alarmDescription:
                    "Amazon RDS (Aurora) Alarm when CPU utilization exceeds 80%",
                alarmName: "CpuUtilizationHighAlarmAurora",
                actionsEnabled: true,
            },
        );

        cdk.Tags.of(this.cpuUtilizationHighAlarmAurora).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-cpu-utilization-high-alarm-aurora`,
        );
        cdk.Tags.of(this.cpuUtilizationHighAlarmAurora).add(
            "ProvisionedBy",
            "AWS",
        );

        this.memoryUtilizationHighAlarmAurora = new cloudwatch.Alarm(
            this,
            "MemoryUtilizationHighAlarmAurora",
            {
                metric: new cloudwatch.Metric({
                    namespace: "AWS/RDS",
                    metricName: "FreeableMemory",
                    dimensionsMap: {
                        DBInstanceIdentifier: `${commonProps.projectName}-${commonProps.envName}-aurora`,
                    },
                    statistic: "Maximum",
                    period: cdk.Duration.seconds(300),
                }),
                threshold: 256000000,
                evaluationPeriods: 2,
                datapointsToAlarm: 2,
                treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
                comparisonOperator:
                    cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
                alarmDescription:
                    "Amazon RDS (Aurora) Alarm when Freeable Memory is less than 256MB",
                alarmName: "MemoryUtilizationHighAlarmAurora",
                actionsEnabled: true,
            },
        );
        cdk.Tags.of(this.memoryUtilizationHighAlarmAurora).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-memory-utilization-high-alarm-aurora`,
        );
        cdk.Tags.of(this.memoryUtilizationHighAlarmAurora).add(
            "ProvisionedBy",
            "AWS",
        );

        this.connectionHighAlarmAurora = new cloudwatch.Alarm(
            this,
            "ConnectionHighAlarmAurora",
            {
                metric: new cloudwatch.Metric({
                    namespace: "AWS/RDS",
                    metricName: "DatabaseConnections",
                    dimensionsMap: {
                        DBInstanceIdentifier: `${commonProps.projectName}-${commonProps.envName}-aurora`,
                    },
                    statistic: "Maximum",
                    period: cdk.Duration.seconds(60),
                }),
                threshold: commonProps.auroraMaxConnections * 0.8,
                evaluationPeriods: 2,
                datapointsToAlarm: 2,
                treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
                comparisonOperator:
                    cloudwatch.ComparisonOperator
                        .GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
                alarmDescription:
                    "Amazon RDS (Aurora) Alarm when Database Connections exceed 80% of the maximum",
                alarmName: "ConnectionHighAlarmAurora",
                actionsEnabled: true,
            },
        );
        cdk.Tags.of(this.connectionHighAlarmAurora).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-connection-high-alarm-aurora`,
        );
        cdk.Tags.of(this.connectionHighAlarmAurora).add("ProvisionedBy", "AWS");

        // ------------------------------------------------------------
        // Amazon CloudWatch Metrics for Amazon ElastiCache Configuration
        // ------------------------------------------------------------
        this.cpuUtilizationHighAlarmElastiCache = new cloudwatch.Alarm(
            this,
            "CpuUtilizationHighAlarmElastiCache",
            {
                metric: new cloudwatch.Metric({
                    namespace: "AWS/ElastiCache",
                    metricName: "CPUUtilization",
                    dimensionsMap: {
                        CacheClusterId: `${commonProps.projectName}-${commonProps.envName}-redis`,
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
                alarmDescription:
                    "Amazon ElastiCache (Redis) Alarm when CPU utilization exceeds 80%",
                alarmName: "CpuUtilizationHighAlarmElastiCache",
                actionsEnabled: true,
            },
        );

        cdk.Tags.of(this.cpuUtilizationHighAlarmElastiCache).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-cpu-utilization-high-alarm-elasticache`,
        );
        cdk.Tags.of(this.cpuUtilizationHighAlarmElastiCache).add(
            "ProvisionedBy",
            "AWS",
        );

        this.memoryUtilizationHighAlarmElastiCache = new cloudwatch.Alarm(
            this,
            "MemoryUtilizationHighAlarmElastiCache",
            {
                metric: new cloudwatch.Metric({
                    namespace: "AWS/ElastiCache",
                    metricName: "MemoryUtilization",
                    dimensionsMap: {
                        CacheClusterId: `${commonProps.projectName}-${commonProps.envName}-redis`,
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
                alarmDescription:
                    "Amazon ElastiCache (Redis) Alarm when Memory utilization exceeds 80%",
                alarmName: "MemoryUtilizationHighAlarmElastiCache",
                actionsEnabled: true,
            },
        );

        cdk.Tags.of(this.memoryUtilizationHighAlarmElastiCache).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-memory-utilization-high-alarm-elasticache`,
        );
        cdk.Tags.of(this.memoryUtilizationHighAlarmElastiCache).add(
            "ProvisionedBy",
            "AWS",
        );

        this.swapUsageHighAlarmElastiCache = new cloudwatch.Alarm(
            this,
            "SwapUsageHighAlarmElastiCache",
            {
                metric: new cloudwatch.Metric({
                    namespace: "AWS/ElastiCache",
                    metricName: "SwapUsage",
                    dimensionsMap: {
                        CacheClusterId: `${commonProps.projectName}-${commonProps.envName}-redis`,
                    },
                    statistic: "Maximum",
                    period: cdk.Duration.seconds(300),
                }),
                threshold: 50000000,
                evaluationPeriods: 2,
                datapointsToAlarm: 2,
                treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
                comparisonOperator:
                    cloudwatch.ComparisonOperator
                        .GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
                alarmDescription:
                    "Amazon ElastiCache (Redis) Alarm when Swap usage exceeds 50000000 bytes",
                alarmName: "SwapUsageHighAlarmElastiCache",
                actionsEnabled: true,
            },
        );

        cdk.Tags.of(this.swapUsageHighAlarmElastiCache).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-swap-usage-high-alarm-elasticache`,
        );
        cdk.Tags.of(this.swapUsageHighAlarmElastiCache).add(
            "ProvisionedBy",
            "AWS",
        );
    }
}
