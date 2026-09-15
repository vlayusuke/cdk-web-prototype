import type { aws_kms as kms } from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib";
import { aws_ec2 as ec2, aws_ecs as ecs, aws_iam as iam } from "aws-cdk-lib";
import { Construct } from "constructs";

export interface kmsProps {
    applicationKey: kms.Key;
}

export interface networkingProps {
    vpcId: string;
    subnetIds: string[];
}

export interface sgProps {
    ecsSecurityGroup: ec2.SecurityGroup;
}

export interface ecsProps {
    ecsCluster: ecs.Cluster;
}


// ------------------------------------------------------------
// [12] - Compute Definition Stack
// ------------------------------------------------------------
export class cfComputeDefinitionStack extends Construct {

    constructor(scope: Construct, id: string, sgProps: sgProps, ecsProps: ecsProps, kmsProps: kmsProps) {
        super(scope, id);


        // ------------------------------------------------------------
        // AWS IAM for Amazon ECS Service Configuration
        // ------------------------------------------------------------
        const iamEcsTaskExecutionRole = new iam.Role(this, 'iamEcsTaskExecutionRole', {
            roleName: 'iamEcsTaskExecutionRole',
            description: 'IAM role for ECS task execution',
            assumedBy: new iam.CompositePrincipal(
                new iam.ServicePrincipal('ecs.amazonaws.com'),
                new iam.ServicePrincipal('ecs-tasks.amazonaws.com')
            )
        });

        cdk.Tags.of(iamEcsTaskExecutionRole).add('Name', 'iamEcsTaskExecutionRole');
        cdk.Tags.of(iamEcsTaskExecutionRole).add('ProvisionedBy', 'AWS');

        const iamEcsTaskExectionPolicy = new iam.Policy(this, 'iamEcsTaskExectionPolicy', {
            policyName: 'iamEcsTaskExectionPolicy',
            roles: [iamEcsTaskExecutionRole],
            statements: [
                new iam.PolicyStatement({
                    sid: 'PassRole',
                    actions: [
                        'iam:PassRole',
                    ],
                    resources: [
                        iamEcsTaskExecutionRole.roleArn,
                    ],
                }),
                new iam.PolicyStatement({
                    sid: 'GetKeyAndSecrets',
                    actions: [
                        'kms:Decrypt',
                        'ssm:GetParameters',
                        'ssm:GetParameter',
                        'secretsmanager:GetSecretValue',
                    ],
                    resources: [
                        kmsProps.applicationKey.keyArn,
                    ],
                }),
            ],
        });

        iamEcsTaskExecutionRole.addManagedPolicy(
            iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy')
        );

        iamEcsTaskExecutionRole.attachInlinePolicy(iamEcsTaskExectionPolicy);

        cdk.Tags.of(iamEcsTaskExectionPolicy).add('Name', 'iamEcsTaskExectionPolicy');
        cdk.Tags.of(iamEcsTaskExectionPolicy).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // AWS IAM for Amazon ECS Task Configuration
        // ------------------------------------------------------------
        const iamEcsTaskRole = new iam.Role(this, 'iamEcsTaskRole', {
            roleName: 'iamEcsTaskRole',
            description: 'IAM role for ECS task',
            assumedBy: new iam.CompositePrincipal(
                new iam.ServicePrincipal('ecs.amazonaws.com'),
                new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
                new iam.ServicePrincipal('delivery.logs.amazonaws.com'),
            )
        });

        cdk.Tags.of(iamEcsTaskRole).add('Name', 'iamEcsTaskRole');
        cdk.Tags.of(iamEcsTaskRole).add('ProvisionedBy', 'AWS');

        const iamEcsTaskPolicy = new iam.Policy(this, 'iamEcsTaskPolicy', {
            statements: [
                new iam.PolicyStatement({
                    sid: 'PassRole',
                    actions: [
                        'iam:PassRole',
                    ],
                    resources: [
                        iamEcsTaskRole.roleArn,
                        iamEcsTaskExecutionRole.roleArn,
                    ],
                }),
                new iam.PolicyStatement({
                    sid: 'ECSAccess',
                    actions: [
                        "ecs:RunTask",
                        "ecs:ListTaskDefinitions",
                        "ecs:DescribeServices",
                    ],
                    resources: [
                        '*',
                    ],
                }),
                new iam.PolicyStatement({
                    sid: 'AuroraAccess',
                    actions: [
                        "rds-db:connect",
                        "rds-data:ExecuteStatement",
                    ],
                    resources: [
                        `arn:aws:rds-db:${cdk.Stack.of(this).account}:${cdk.Stack.of(this).region}:dbuser:*/*`,
                    ],
                }),
                new iam.PolicyStatement({
                    sid: 'AllowECSExec',
                    actions: [
                        "ssmmessages:CreateControlChannel",
                        "ssmmessages:CreateDataChannel",
                        "ssmmessages:OpenControlChannel",
                        "ssmmessages:OpenDataChannel",
                    ],
                    resources: [
                        '*',
                    ],
                }),
            ],
        });

        iamEcsTaskRole.attachInlinePolicy(iamEcsTaskPolicy);

        cdk.Tags.of(iamEcsTaskPolicy).add('Name', 'iamEcsTaskPolicy');
        cdk.Tags.of(iamEcsTaskPolicy).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // Amazon ECS App Task Definition Configuration
        // ------------------------------------------------------------
        const ecsAppTaskDefinition = new ecs.FargateTaskDefinition(this, 'ecsAppTaskDefinition', {
            family: 'app',
            taskRole: iamEcsTaskRole,
            executionRole: iamEcsTaskExecutionRole,
            runtimePlatform: {
                operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
                cpuArchitecture: ecs.CpuArchitecture.ARM64,
            }
        });

        cdk.Tags.of(ecsAppTaskDefinition).add('Name', 'ecsAppTaskDefinition');
        cdk.Tags.of(ecsAppTaskDefinition).add('ProvisionedBy', 'AWS');

        ecsAppTaskDefinition.addContainer('app', {
            image: ecs.ContainerImage.fromRegistry('json/amazon-ecs-task-definition-app.json'),
            cpu: 512,
            memoryReservationMiB: 1024,
        });


        // ------------------------------------------------------------
        // Amazon ECS Cron Task Definition Configuration
        // ------------------------------------------------------------
        const ecsCronTaskDefinition = new ecs.FargateTaskDefinition(this, 'ecsCronTaskDefinition', {
            family: 'cron',
            taskRole: iamEcsTaskRole,
            executionRole: iamEcsTaskExecutionRole,
            runtimePlatform: {
                operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
                cpuArchitecture: ecs.CpuArchitecture.ARM64,
            }
        });

        cdk.Tags.of(ecsCronTaskDefinition).add('Name', 'ecsCronTaskDefinition');
        cdk.Tags.of(ecsCronTaskDefinition).add('ProvisionedBy', 'AWS');

        ecsCronTaskDefinition.addContainer('cron', {
            image: ecs.ContainerImage.fromRegistry('json/amazon-ecs-task-definition-cron.json'),
            cpu: 256,
            memoryReservationMiB: 512,
        });


        // ------------------------------------------------------------
        // Amazon ECS Queue Task Definition Configuration
        // ------------------------------------------------------------
        const ecsQueueTaskDefinition = new ecs.FargateTaskDefinition(this, 'ecsQueueTaskDefinition', {
            family: 'queue',
            taskRole: iamEcsTaskRole,
            executionRole: iamEcsTaskExecutionRole,
            runtimePlatform: {
                operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
                cpuArchitecture: ecs.CpuArchitecture.ARM64,
            }
        });

        cdk.Tags.of(ecsQueueTaskDefinition).add('Name', 'ecsQueueTaskDefinition');
        cdk.Tags.of(ecsQueueTaskDefinition).add('ProvisionedBy', 'AWS');

        ecsQueueTaskDefinition.addContainer('queue', {
            image: ecs.ContainerImage.fromRegistry('json/amazon-ecs-task-definition-queue.json'),
            cpu: 256,
            memoryReservationMiB: 512,
        });


        // ------------------------------------------------------------
        // Amazon ECS App Service Configuration
        // ------------------------------------------------------------
        const ecsAppService = new ecs.FargateService(this, 'ecsAppServiceConfiguration', {
            cluster: ecsProps.ecsCluster,
            serviceName: 'ecsAppService',
            taskDefinition: ecsAppTaskDefinition,
            desiredCount: 2,
            maxHealthyPercent: 200,
            minHealthyPercent: 50,
            platformVersion: ecs.FargatePlatformVersion.VERSION1_4,
            capacityProviderStrategies: [
                {
                    capacityProvider: 'FARGATE',
                    base: 1,
                    weight: 0
                },
                {
                    capacityProvider: 'FARGATE_SPOT',
                    base: 0,
                    weight: 1
                }
            ],
            availabilityZoneRebalancing: ecs.AvailabilityZoneRebalancing.ENABLED,
            circuitBreaker: {
                rollback: true,
            },
            deploymentController: {
                type: ecs.DeploymentControllerType.ECS,
            },
            deploymentStrategy: ecs.DeploymentStrategy.ROLLING,
            enableExecuteCommand: true,
            forceNewDeployment: {
                enabled: true,
            },
            vpcSubnets: {
                subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
            },
            securityGroups: [sgProps.ecsSecurityGroup],
        });

        cdk.Tags.of(ecsAppService).add('Name', 'ecsAppService');
        cdk.Tags.of(ecsAppService).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // Amazon ECS Cron Service Configuration
        // ------------------------------------------------------------
        const ecsCronServiceConfiguration = new ecs.FargateService(this, 'ecsCronServiceConfiguration', {
            cluster: ecsProps.ecsCluster,
            taskDefinition: ecsCronTaskDefinition,
            desiredCount: 1,
            platformVersion: ecs.FargatePlatformVersion.VERSION1_4,
            capacityProviderStrategies: [
                {
                    capacityProvider: 'FARGATE',
                    base: 1,
                    weight: 1
                }
            ],
            availabilityZoneRebalancing: ecs.AvailabilityZoneRebalancing.ENABLED,
            circuitBreaker: {
                rollback: true,
            },
            deploymentController: {
                type: ecs.DeploymentControllerType.ECS,
            },
            deploymentStrategy: ecs.DeploymentStrategy.ROLLING,
            enableExecuteCommand: true,
            forceNewDeployment: {
                enabled: true,
            },
            vpcSubnets: {
                subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
            },
            securityGroups: [sgProps.ecsSecurityGroup],
        });

        cdk.Tags.of(ecsCronServiceConfiguration).add('Name', 'ecsCronService');
        cdk.Tags.of(ecsCronServiceConfiguration).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // Amazon ECS Queue Service Configuration
        // ------------------------------------------------------------
        const ecsQueueServiceConfiguration = new ecs.FargateService(this, 'ecsQueueServiceConfiguration', {
            cluster: ecsProps.ecsCluster,
            taskDefinition: ecsQueueTaskDefinition,
            desiredCount: 1,
            platformVersion: ecs.FargatePlatformVersion.VERSION1_4,
            capacityProviderStrategies: [
                {
                    capacityProvider: 'FARGATE',
                    base: 1,
                    weight: 1
                }
            ],
            availabilityZoneRebalancing: ecs.AvailabilityZoneRebalancing.ENABLED,
            circuitBreaker: {
                rollback: true,
            },
            deploymentController: {
                type: ecs.DeploymentControllerType.ECS,
            },
            deploymentStrategy: ecs.DeploymentStrategy.ROLLING,
            enableExecuteCommand: true,
            forceNewDeployment: {
                enabled: true,
            },
            vpcSubnets: {
                subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
            },
            securityGroups: [sgProps.ecsSecurityGroup],
        });

        cdk.Tags.of(ecsQueueServiceConfiguration).add('Name', 'ecsQueueService');
        cdk.Tags.of(ecsQueueServiceConfiguration).add('ProvisionedBy', 'AWS');
    }
}

