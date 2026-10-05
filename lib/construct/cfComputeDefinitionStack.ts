import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { aws_kms as kms } from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib";
import {
    aws_applicationautoscaling as applicationautoscaling,
    aws_cloudwatch as cloudwatch,
    aws_ec2 as ec2,
    aws_ecs as ecs,
    aws_iam as iam,
    aws_logs as logs,
    aws_secretsmanager as secretsmanager,
    aws_ssm as ssm,
} from "aws-cdk-lib";
import type * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Construct } from "constructs";

interface JsonContainerDefinition {
    name: string;
    image: string;
    repositoryCredentials?: { credentialsParameter: string };
    cpu?: number;
    memoryReservation?: number;
    essential?: boolean;
    readonlyRootFilesystem?: boolean;
    portMappings?: {
        containerPort: number;
        hostPort?: number;
        protocol?: string;
    }[];
    environment?: { name: string; value: string }[];
    logConfiguration?: {
        logDriver: string;
        options: Record<string, string>;
    };
    ulimits?: { softLimit: number; hardLimit: number; name: string }[];
    entryPoint?: string[];
    command?: string[];
}

const loadContainerDefinitions = (
    fileName: string,
    replacements: Record<string, string>,
): JsonContainerDefinition[] => {
    const replacePlaceholders = (value: unknown): unknown => {
        if (typeof value === "string") {
            return value.replace(
                /\$\{([^}]+)\}/g,
                (placeholder, name: string) =>
                    replacements[name] ?? placeholder,
            );
        }
        if (Array.isArray(value)) {
            return value.map(replacePlaceholders);
        }
        if (value !== null && typeof value === "object") {
            return Object.fromEntries(
                Object.entries(value).map(([key, nestedValue]) => [
                    key,
                    replacePlaceholders(nestedValue),
                ]),
            );
        }
        return value;
    };

    return replacePlaceholders(
        JSON.parse(readFileSync(join(__dirname, "../json", fileName), "utf8")),
    ) as JsonContainerDefinition[];
};

const addJsonContainerDefinitions = (
    scope: Construct,
    taskDefinition: ecs.FargateTaskDefinition,
    containerDefinitions: JsonContainerDefinition[],
): void => {
    for (const definition of containerDefinitions) {
        const registryCredentials = definition.repositoryCredentials
            ? secretsmanager.Secret.fromSecretCompleteArn(
                  scope,
                  `${definition.name}RegistryCredentials`,
                  definition.repositoryCredentials.credentialsParameter,
              )
            : undefined;
        registryCredentials?.grantRead(taskDefinition.obtainExecutionRole());
        const logOptions = definition.logConfiguration?.options;
        taskDefinition.addContainer(definition.name, {
            image: ecs.ContainerImage.fromRegistry(definition.image, {
                credentials: registryCredentials,
            }),
            cpu: definition.cpu,
            memoryReservationMiB: definition.memoryReservation,
            essential: definition.essential,
            readonlyRootFilesystem: definition.readonlyRootFilesystem,
            portMappings: definition.portMappings?.map((mapping) => ({
                containerPort: mapping.containerPort,
                hostPort: mapping.hostPort,
                protocol:
                    mapping.protocol?.toLowerCase() === "udp"
                        ? ecs.Protocol.UDP
                        : ecs.Protocol.TCP,
            })),
            environment: definition.environment?.reduce<Record<string, string>>(
                (variables, variable) => {
                    variables[variable.name] = variable.value;
                    return variables;
                },
                {},
            ),
            logging:
                definition.logConfiguration?.logDriver === "awslogs" &&
                logOptions
                    ? ecs.LogDriver.awsLogs({
                          streamPrefix: logOptions["awslogs-stream-prefix"],
                          logGroup: logs.LogGroup.fromLogGroupName(
                              scope,
                              `${definition.name}LogGroup`,
                              logOptions["awslogs-group"],
                          ),
                      })
                    : undefined,
            ulimits: definition.ulimits?.map((ulimit) => ({
                name: ulimit.name as ecs.UlimitName,
                softLimit: ulimit.softLimit,
                hardLimit: ulimit.hardLimit,
            })),
            entryPoint: definition.entryPoint,
            command: definition.command,
        });
    }
};

export interface commonProps {
    projectName: string;
    dashboardName: string;
}

export interface envProps {
    envName: string;
    vpcCidr: string;
    defaultGatewayCidr: string;
}

export interface kmsProps {
    applicationKey: kms.IKey;
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

export interface albProps {
    targetGroup: elbv2.IApplicationTargetGroup;
}

// ------------------------------------------------------------
// [11] - Compute Definition Stack
// ------------------------------------------------------------
export class cfComputeDefinitionStack extends Construct {
    public readonly ecsAppScalableTarget: ecs.ScalableTaskCount;
    public readonly ssmParameterStoreAppKey: ssm.StringParameter;
    public readonly ssmParamenterStoreJwtSecret: ssm.StringParameter;
    public readonly ssmParameterStoreAuroraWriterEndPoint: ssm.StringParameter;
    public readonly ssmParameterStoreAuroraReaderEndPoint: ssm.StringParameter;
    public readonly ssmParameterStoreElastiCacheWriterEndPoint: ssm.StringParameter;
    public readonly ssmParameterStoreElastiCacheReaderEndPoint: ssm.StringParameter;

    constructor(
        scope: Construct,
        id: string,
        sgProps: sgProps,
        albProps: albProps,
        ecsProps: ecsProps,
        kmsProps: kmsProps,
        commonProps: commonProps,
        envProps: envProps,
    ) {
        super(scope, id);

        const dockerRegistryCredentialsArn = new cdk.CfnParameter(
            this,
            "DockerRegistryCredentialsArn",
            {
                type: "String",
                description:
                    "Secrets Manager ARN for the container registry credentials",
            },
        );

        const containerDefinitionReplacements: Record<string, string> = {
            credentials_parameters_arn:
                dockerRegistryCredentialsArn.valueAsString,
            project: commonProps.projectName,
            env: envProps.envName,
            region: cdk.Stack.of(this).region,
            log_group_prefix: `/ecs/${commonProps.projectName}/${envProps.envName}`,
        };

        // ------------------------------------------------------------
        // OpenID Connect Provider for GitHub Actions Configuration
        // ------------------------------------------------------------
        const oidcProvider = new iam.OidcProviderNative(this, "oidcProvider", {
            url: "https://token.actions.githubusercontent.com",
            clientIds: ["sts.amazonaws.com"],
        });

        cdk.Tags.of(oidcProvider).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-oidc-provider`,
        );
        cdk.Tags.of(oidcProvider).add("ProvisionedBy", "AWS");

        // ------------------------------------------------------------
        // AWS IAM for GitHub Actions Deployment Configuration
        // ------------------------------------------------------------
        const iamGithubActionsRole = new iam.Role(
            this,
            "iamGithubActionsRole",
            {
                roleName: `${commonProps.projectName}-${envProps.envName}-iam-github-actions-role`,
                description: "IAM role for GitHub Actions deployment",
                assumedBy: new iam.WebIdentityPrincipal(
                    oidcProvider.openIdConnectProviderArn,
                    {
                        StringLike: {
                            "token.actions.githubusercontent.com:sub": [
                                `repo:${commonProps.dashboardName}:ref:refs/heads/main`,
                                `repo:${commonProps.dashboardName}:ref:refs/heads/*`,
                            ],
                        },
                    },
                ),
            },
        );

        const assumeRolePolicy = iamGithubActionsRole.assumeRolePolicy;

        assumeRolePolicy?.addStatements(
            new iam.PolicyStatement({
                sid: "OIDCFederateRef",
                effect: iam.Effect.ALLOW,
                actions: ["sts:AssumeRoleWithWebIdentity"],
                principals: [
                    new iam.FederatedPrincipal(
                        oidcProvider.openIdConnectProviderArn,
                        {},
                        "sts:AssumeRoleWithWebIdentity",
                    ),
                ],
                conditions: {
                    StringLike: {
                        "token.actions.githubusercontent.com:sub": [
                            `repo:${commonProps.dashboardName}:ref:refs/heads/main`,
                            `repo:${commonProps.dashboardName}:ref:refs/heads/*`,
                        ],
                    },
                },
            }),
        );

        cdk.Tags.of(iamGithubActionsRole).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-iam-github-actions-role`,
        );
        cdk.Tags.of(iamGithubActionsRole).add("ProvisionedBy", "AWS");

        const iamGithubActionsPolicy = new iam.Policy(
            this,
            "iamGithubActionsPolicy",
            {
                policyName: `${commonProps.projectName}-${envProps.envName}-iam-github-actions-policy`,
                roles: [iamGithubActionsRole],
                statements: [
                    new iam.PolicyStatement({
                        sid: "PassRole",
                        effect: iam.Effect.ALLOW,
                        actions: ["iam:PassRole"],
                        resources: [iamGithubActionsRole.roleArn],
                    }),
                ],
            },
        );

        cdk.Tags.of(iamGithubActionsPolicy).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-iam-github-actions-policy`,
        );
        cdk.Tags.of(iamGithubActionsPolicy).add("ProvisionedBy", "AWS");

        iamGithubActionsPolicy.attachToRole(iamGithubActionsRole);

        // ------------------------------------------------------------
        // AWS IAM for Amazon ECS Service Configuration
        // ------------------------------------------------------------
        const iamEcsTaskExecutionRole = new iam.Role(
            this,
            "iamEcsTaskExecutionRole",
            {
                roleName: `${commonProps.projectName}-${envProps.envName}-iam-ecs-task-execution-role`,
                description: "IAM role for ECS task execution",
                assumedBy: new iam.CompositePrincipal(
                    new iam.ServicePrincipal("ecs.amazonaws.com"),
                    new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
                ),
            },
        );

        cdk.Tags.of(iamEcsTaskExecutionRole).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-iam-ecs-task-execution-role`,
        );
        cdk.Tags.of(iamEcsTaskExecutionRole).add("ProvisionedBy", "AWS");

        const iamEcsTaskExectionPolicy = new iam.Policy(
            this,
            "iamEcsTaskExectionPolicy",
            {
                policyName: `${commonProps.projectName}-${envProps.envName}-iam-ecs-task-execution-policy`,
                roles: [iamEcsTaskExecutionRole],
                statements: [
                    new iam.PolicyStatement({
                        sid: "PassRole",
                        effect: iam.Effect.ALLOW,
                        actions: ["iam:PassRole"],
                        resources: [iamEcsTaskExecutionRole.roleArn],
                    }),
                    new iam.PolicyStatement({
                        sid: "GetKeyAndSecrets",
                        effect: iam.Effect.ALLOW,
                        actions: [
                            "kms:Decrypt",
                            "ssm:GetParameters",
                            "ssm:GetParameter",
                            "secretsmanager:GetSecretValue",
                        ],
                        resources: [kmsProps.applicationKey.keyArn],
                    }),
                ],
            },
        );

        cdk.Tags.of(iamEcsTaskExectionPolicy).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-iam-ecs-task-execution-policy`,
        );
        cdk.Tags.of(iamEcsTaskExectionPolicy).add("ProvisionedBy", "AWS");

        iamEcsTaskExecutionRole.addManagedPolicy(
            iam.ManagedPolicy.fromAwsManagedPolicyName(
                "service-role/AmazonECSTaskExecutionRolePolicy",
            ),
        );

        iamEcsTaskExectionPolicy.attachToRole(iamEcsTaskExecutionRole);

        // ------------------------------------------------------------
        // AWS IAM for Amazon ECS Task Configuration
        // ------------------------------------------------------------
        const iamEcsTaskRole = new iam.Role(this, "iamEcsTaskRole", {
            roleName: `${commonProps.projectName}-${envProps.envName}-iam-ecs-task-role`,
            description: "IAM role for ECS task",
            assumedBy: new iam.CompositePrincipal(
                new iam.ServicePrincipal("ecs.amazonaws.com"),
                new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
                new iam.ServicePrincipal("delivery.logs.amazonaws.com"),
            ),
        });

        cdk.Tags.of(iamEcsTaskRole).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-iam-ecs-task-role`,
        );
        cdk.Tags.of(iamEcsTaskRole).add("ProvisionedBy", "AWS");

        const iamEcsTaskPolicy = new iam.Policy(
            this,
            `${commonProps.projectName}-${envProps.envName}-iam-ecs-task-policy`,
            {
                policyName: `${commonProps.projectName}-${envProps.envName}-iam-ecs-task-policy`,
                statements: [
                    new iam.PolicyStatement({
                        sid: "PassRole",
                        effect: iam.Effect.ALLOW,
                        actions: ["iam:PassRole"],
                        resources: [
                            iamEcsTaskRole.roleArn,
                            iamEcsTaskExecutionRole.roleArn,
                        ],
                    }),
                    new iam.PolicyStatement({
                        sid: "ECSAccess",
                        effect: iam.Effect.ALLOW,
                        actions: [
                            "ecs:RunTask",
                            "ecs:ListTaskDefinitions",
                            "ecs:DescribeServices",
                        ],
                        resources: [
                            `arn:aws:ecs:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:task/*`,
                        ],
                    }),
                    new iam.PolicyStatement({
                        sid: "AuroraAccess",
                        effect: iam.Effect.ALLOW,
                        actions: [
                            "rds-db:connect",
                            "rds-data:ExecuteStatement",
                        ],
                        resources: [
                            `arn:aws:rds:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:db:*`,
                            `arn:aws:rds-db:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:dbuser:*/*`,
                        ],
                    }),
                    new iam.PolicyStatement({
                        sid: "ElastiCacheConnect",
                        effect: iam.Effect.ALLOW,
                        actions: ["elasticache:Connect"],
                        resources: [
                            `arn:aws:elasticache:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:replicationgroup:*`,
                            `arn:aws:elasticache:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:user:*`,
                        ],
                    }),
                    new iam.PolicyStatement({
                        sid: "AllowECSExec",
                        effect: iam.Effect.ALLOW,
                        actions: [
                            "ssmmessages:CreateControlChannel",
                            "ssmmessages:CreateDataChannel",
                            "ssmmessages:OpenControlChannel",
                            "ssmmessages:OpenDataChannel",
                        ],
                        resources: [
                            `arn:aws:ecs:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:task/*`,
                        ],
                    }),
                ],
            },
        );

        cdk.Tags.of(iamEcsTaskPolicy).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-iam-ecs-task-policy`,
        );
        cdk.Tags.of(iamEcsTaskPolicy).add("ProvisionedBy", "AWS");

        iamEcsTaskPolicy.attachToRole(iamEcsTaskRole);

        // ------------------------------------------------------------
        // Amazon ECS App Task Definition Configuration
        // ------------------------------------------------------------
        const ecsAppTaskDefinition = new ecs.FargateTaskDefinition(
            this,
            "ecsAppTaskDefinition",
            {
                family: "app",
                cpu: 512,
                memoryLimitMiB: 1024,
                taskRole: iamEcsTaskRole,
                executionRole: iamEcsTaskExecutionRole,
                runtimePlatform: {
                    operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
                    cpuArchitecture: ecs.CpuArchitecture.ARM64,
                },
            },
        );

        cdk.Tags.of(ecsAppTaskDefinition).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-ecs-app-task-definition`,
        );
        cdk.Tags.of(ecsAppTaskDefinition).add("ProvisionedBy", "AWS");

        addJsonContainerDefinitions(
            this,
            ecsAppTaskDefinition,
            loadContainerDefinitions(
                "amazon-ecs-task-definition-app.json",
                containerDefinitionReplacements,
            ),
        );

        // ------------------------------------------------------------
        // Amazon ECS Cron Task Definition Configuration
        // ------------------------------------------------------------
        const ecsCronTaskDefinition = new ecs.FargateTaskDefinition(
            this,
            "ecsCronTaskDefinition",
            {
                family: "cron",
                taskRole: iamEcsTaskRole,
                executionRole: iamEcsTaskExecutionRole,
                runtimePlatform: {
                    operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
                    cpuArchitecture: ecs.CpuArchitecture.ARM64,
                },
            },
        );

        cdk.Tags.of(ecsCronTaskDefinition).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-ecs-cron-task-definition`,
        );
        cdk.Tags.of(ecsCronTaskDefinition).add("ProvisionedBy", "AWS");

        addJsonContainerDefinitions(
            this,
            ecsCronTaskDefinition,
            loadContainerDefinitions(
                "amazon-ecs-task-definition-cron.json",
                containerDefinitionReplacements,
            ),
        );

        // ------------------------------------------------------------
        // Amazon ECS Queue Task Definition Configuration
        // ------------------------------------------------------------
        const ecsQueueTaskDefinition = new ecs.FargateTaskDefinition(
            this,
            "ecsQueueTaskDefinition",
            {
                family: "queue",
                taskRole: iamEcsTaskRole,
                executionRole: iamEcsTaskExecutionRole,
                runtimePlatform: {
                    operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
                    cpuArchitecture: ecs.CpuArchitecture.ARM64,
                },
            },
        );

        cdk.Tags.of(ecsQueueTaskDefinition).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-ecs-queue-task-definition`,
        );
        cdk.Tags.of(ecsQueueTaskDefinition).add("ProvisionedBy", "AWS");

        addJsonContainerDefinitions(
            this,
            ecsQueueTaskDefinition,
            loadContainerDefinitions(
                "amazon-ecs-task-definition-queue.json",
                containerDefinitionReplacements,
            ),
        );

        // ------------------------------------------------------------
        // Amazon ECS App Service Configuration
        // ------------------------------------------------------------
        const ecsAppService = new ecs.FargateService(
            this,
            "ecsAppServiceConfiguration",
            {
                cluster: ecsProps.ecsCluster,
                serviceName: "ecsAppService",
                taskDefinition: ecsAppTaskDefinition,
                desiredCount: 2,
                maxHealthyPercent: 200,
                minHealthyPercent: 50,
                platformVersion: ecs.FargatePlatformVersion.VERSION1_4,
                capacityProviderStrategies: [
                    {
                        capacityProvider: "FARGATE",
                        base: 1,
                        weight: 0,
                    },
                    {
                        capacityProvider: "FARGATE_SPOT",
                        base: 0,
                        weight: 1,
                    },
                ],
                availabilityZoneRebalancing:
                    ecs.AvailabilityZoneRebalancing.ENABLED,
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
            },
        );

        ecsAppService.attachToApplicationTargetGroup(albProps.targetGroup);

        cdk.Tags.of(ecsAppService).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-ecs-app-service`,
        );
        cdk.Tags.of(ecsAppService).add("ProvisionedBy", "AWS");

        this.ecsAppScalableTarget = ecsAppService.autoScaleTaskCount({
            minCapacity: 2,
            maxCapacity: 4,
        });

        cdk.Tags.of(this.ecsAppScalableTarget).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-ecs-app-autoscaling-target`,
        );
        cdk.Tags.of(this.ecsAppScalableTarget).add("ProvisionedBy", "AWS");

        new applicationautoscaling.StepScalingPolicy(
            this,
            "AutoScaleOutEcsApp",
            {
                scalingTarget: this.ecsAppScalableTarget,
                metric: new cloudwatch.Metric({
                    namespace: "AWS/ECS",
                    metricName: "CPUUtilization",
                    dimensionsMap: {
                        TaskDefinitionFamily: ecsAppTaskDefinition.family,
                    },
                    statistic: "Average",
                    period: cdk.Duration.seconds(60),
                }),
                adjustmentType:
                    applicationautoscaling.AdjustmentType.CHANGE_IN_CAPACITY,
                scalingSteps: [
                    { change: 1, lower: 0, upper: 50 },
                    { change: 1, lower: 50 },
                ],
                cooldown: cdk.Duration.seconds(120),
            },
        );

        new applicationautoscaling.StepScalingPolicy(
            this,
            "AutoScaleInEcsApp",
            {
                scalingTarget: this.ecsAppScalableTarget,
                metric: new cloudwatch.Metric({
                    namespace: "AWS/ECS",
                    metricName: "CPUUtilization",
                    dimensionsMap: {
                        TaskDefinitionFamily: ecsAppTaskDefinition.family,
                    },
                    statistic: "Average",
                    period: cdk.Duration.seconds(60),
                }),
                adjustmentType:
                    applicationautoscaling.AdjustmentType.CHANGE_IN_CAPACITY,
                scalingSteps: [
                    { change: -1, upper: -50 },
                    { change: -1, lower: -50, upper: 0 },
                ],
                cooldown: cdk.Duration.seconds(600),
            },
        );

        // ------------------------------------------------------------
        // Amazon ECS Cron Service Configuration
        // ------------------------------------------------------------
        const ecsCronServiceConfiguration = new ecs.FargateService(
            this,
            "ecsCronServiceConfiguration",
            {
                cluster: ecsProps.ecsCluster,
                taskDefinition: ecsCronTaskDefinition,
                desiredCount: 1,
                minHealthyPercent: 100,
                maxHealthyPercent: 200,
                platformVersion: ecs.FargatePlatformVersion.VERSION1_4,
                capacityProviderStrategies: [
                    {
                        capacityProvider: "FARGATE",
                        base: 1,
                        weight: 1,
                    },
                ],
                availabilityZoneRebalancing:
                    ecs.AvailabilityZoneRebalancing.ENABLED,
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
            },
        );

        cdk.Tags.of(ecsCronServiceConfiguration).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-ecs-cron-service`,
        );
        cdk.Tags.of(ecsCronServiceConfiguration).add("ProvisionedBy", "AWS");

        // ------------------------------------------------------------
        // Amazon ECS Queue Service Configuration
        // ------------------------------------------------------------
        const ecsQueueServiceConfiguration = new ecs.FargateService(
            this,
            "ecsQueueServiceConfiguration",
            {
                cluster: ecsProps.ecsCluster,
                taskDefinition: ecsQueueTaskDefinition,
                desiredCount: 1,
                minHealthyPercent: 100,
                maxHealthyPercent: 200,
                platformVersion: ecs.FargatePlatformVersion.VERSION1_4,
                capacityProviderStrategies: [
                    {
                        capacityProvider: "FARGATE",
                        base: 1,
                        weight: 1,
                    },
                ],
                availabilityZoneRebalancing:
                    ecs.AvailabilityZoneRebalancing.ENABLED,
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
            },
        );

        cdk.Tags.of(ecsQueueServiceConfiguration).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-ecs-queue-service`,
        );
        cdk.Tags.of(ecsQueueServiceConfiguration).add("ProvisionedBy", "AWS");

        // ------------------------------------------------------------
        // AWS SSM Parameter Store for Application Configuration
        // ------------------------------------------------------------
        this.ssmParameterStoreAppKey = new ssm.StringParameter(
            this,
            "ssmParameterStoreAppKey",
            {
                parameterName: `/${commonProps.projectName}/${envProps.envName}/app-key`,
                description: `The parameter for ${commonProps.projectName}-${envProps.envName} app key`,
                stringValue: "PleaseChangeMe",
            },
        );

        cdk.Tags.of(this.ssmParameterStoreAppKey).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-app-key`,
        );
        cdk.Tags.of(this.ssmParameterStoreAppKey).add("ProvisionedBy", "AWS");

        this.ssmParamenterStoreJwtSecret = new ssm.StringParameter(
            this,
            "ssmParamenterStoreJwtSecret",
            {
                parameterName: `/${commonProps.projectName}/${envProps.envName}/jwt-secret`,
                description: `The parameter for ${commonProps.projectName}-${envProps.envName} jwt secret`,
                stringValue: "PleaseChangeMe",
            },
        );

        cdk.Tags.of(this.ssmParamenterStoreJwtSecret).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-jwt-secret`,
        );
        cdk.Tags.of(this.ssmParamenterStoreJwtSecret).add(
            "ProvisionedBy",
            "AWS",
        );

        this.ssmParameterStoreAuroraWriterEndPoint = new ssm.StringParameter(
            this,
            "ssmParameterStoreAuroraWriterEndPoint",
            {
                parameterName: `/${commonProps.projectName}/${envProps.envName}/aurora-writer-endpoint`,
                description: `The parameter for ${commonProps.projectName}-${envProps.envName} aurora writer endpoint`,
                stringValue: "PleaseChangeMe",
            },
        );

        cdk.Tags.of(this.ssmParameterStoreAuroraWriterEndPoint).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-aurora-writer-endpoint`,
        );
        cdk.Tags.of(this.ssmParameterStoreAuroraWriterEndPoint).add(
            "ProvisionedBy",
            "AWS",
        );

        this.ssmParameterStoreAuroraReaderEndPoint = new ssm.StringParameter(
            this,
            "ssmParameterStoreAuroraReaderEndPoint",
            {
                parameterName: `/${commonProps.projectName}/${envProps.envName}/aurora-reader-endpoint`,
                description: `The parameter for ${commonProps.projectName}-${envProps.envName} aurora reader endpoint`,
                stringValue: "PleaseChangeMe",
            },
        );

        cdk.Tags.of(this.ssmParameterStoreAuroraReaderEndPoint).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-aurora-reader-endpoint`,
        );
        cdk.Tags.of(this.ssmParameterStoreAuroraReaderEndPoint).add(
            "ProvisionedBy",
            "AWS",
        );

        this.ssmParameterStoreElastiCacheWriterEndPoint =
            new ssm.StringParameter(
                this,
                "ssmParameterStoreElastiCacheWriterEndPoint",
                {
                    parameterName: `/${commonProps.projectName}/${envProps.envName}/elasticache-writer-endpoint`,
                    description: `The parameter for ${commonProps.projectName}-${envProps.envName} elasticache writer endpoint`,
                    stringValue: "PleaseChangeMe",
                },
            );

        cdk.Tags.of(this.ssmParameterStoreElastiCacheWriterEndPoint).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-elasticache-writer-endpoint`,
        );
        cdk.Tags.of(this.ssmParameterStoreElastiCacheWriterEndPoint).add(
            "ProvisionedBy",
            "AWS",
        );

        this.ssmParameterStoreElastiCacheReaderEndPoint =
            new ssm.StringParameter(
                this,
                "ssmParameterStoreElastiCacheReaderEndPoint",
                {
                    parameterName: `/${commonProps.projectName}/${envProps.envName}/elasticache-reader-endpoint`,
                    description: `The parameter for ${commonProps.projectName}-${envProps.envName} elasticache reader endpoint`,
                    stringValue: "PleaseChangeMe",
                },
            );

        cdk.Tags.of(this.ssmParameterStoreElastiCacheReaderEndPoint).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-elasticache-reader-endpoint`,
        );
        cdk.Tags.of(this.ssmParameterStoreElastiCacheReaderEndPoint).add(
            "ProvisionedBy",
            "AWS",
        );
    }
}
