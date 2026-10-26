import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { aws_ecr as ecr, aws_kms as kms, aws_s3 as s3 } from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib";
import {
    aws_applicationautoscaling as applicationautoscaling,
    aws_cloudwatch as cloudwatch,
    type aws_ec2 as ec2,
    aws_ecs as ecs,
    aws_iam as iam,
    aws_ssm as ssm,
} from "aws-cdk-lib";
import type * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Construct } from "constructs";

const loadContainerDefinitions = (
    fileName: string,
    replacements: Record<string, string>,
): ecs.CfnTaskDefinition.ContainerDefinitionProperty[] => {
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
    ) as ecs.CfnTaskDefinition.ContainerDefinitionProperty[];
};

export interface CommonProps {
    projectName: string;
    dashboardName: string;
}

export interface EnvProps {
    envName: string;
    vpcCidr: string;
    defaultGatewayCidr: string;
}

export interface KmsProps {
    applicationKey: kms.IKey;
}

export interface NetworkingProps {
    vpcId: string;
    publicSubnetIds: string[];
    privateSubnetIds: string[];
}

export interface SgProps {
    ecsSecurityGroup: ec2.ISecurityGroup;
}

export interface EcrProps {
    ecrRepositoryWebBaseImage: ecr.CfnRepository;
    ecrRepositoryAppBaseImage: ecr.CfnRepository;
    ecrRepositoryWeb: ecr.CfnRepository;
    ecrRepositoryApp: ecr.CfnRepository;
}

export interface EcsProps {
    ecsCluster: ecs.CfnCluster;
}

export interface AlbProps {
    targetGroup: elbv2.IApplicationTargetGroup;
}

export interface DatabaseProps {
    auroraClusterArn: string;
    auroraWriterInstanceArn: string;
    auroraReaderInstanceArn: string;
    elastiCacheReplicationGroupArn: string;
}

export interface S3Props {
    s3BucketEcsLogs: s3.IBucket;
}

// ------------------------------------------------------------
// [11] - Compute Definition Stack
// ------------------------------------------------------------
export class CfComputeDefinitionStack extends Construct {
    public readonly ecsAppScalableTarget: applicationautoscaling.ScalableTarget;
    public readonly ssmParameterStoreAppKey: ssm.CfnParameter;
    public readonly ssmParamenterStoreJwtSecret: ssm.CfnParameter;
    public readonly ssmParameterStoreAuroraWriterEndPoint: ssm.CfnParameter;
    public readonly ssmParameterStoreAuroraReaderEndPoint: ssm.CfnParameter;
    public readonly ssmParameterStoreElastiCacheWriterEndPoint: ssm.CfnParameter;
    public readonly ssmParameterStoreElastiCacheReaderEndPoint: ssm.CfnParameter;

    constructor(
        scope: Construct,
        id: string,
        networkingProps: NetworkingProps,
        sgProps: SgProps,
        albProps: AlbProps,
        ecrProps: EcrProps,
        ecsProps: EcsProps,
        kmsProps: KmsProps,
        databaseProps: DatabaseProps,
        s3Props: S3Props,
        commonProps: CommonProps,
        envProps: EnvProps,
    ) {
        super(scope, id);

        const stack = cdk.Stack.of(this);
        const prefix = `${commonProps.projectName}-${envProps.envName}`;
        const arnPrefix = `arn:aws:ecs:${stack.region}:${stack.account}`;

        // Each L1 resource lives under a wrapper scope with the id "Resource"
        // so that construct paths (and logical IDs) match the former L2 constructs.
        const wrap = (wrapperId: string, name: string): Construct => {
            const wrapper = new Construct(this, wrapperId);
            cdk.Tags.of(wrapper).add("Name", name);
            cdk.Tags.of(wrapper).add("ProvisionedBy", "AWS");
            cdk.Tags.of(wrapper).add("ProjectCode", "1234567890");
            return wrapper;
        };

        const allow = (
            sid: string,
            actions: string[],
            resources: string[],
            condition?: Record<string, unknown>,
        ) => ({
            Sid: sid,
            Effect: "Allow",
            Action: actions,
            Resource: resources,
            ...(condition ? { Condition: condition } : {}),
        });

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
            region: stack.region,
            log_group_prefix: `/ecs/${commonProps.projectName}/${envProps.envName}`,
        };

        const appContainers = loadContainerDefinitions(
            "amazon-ecs-task-definition-app.json",
            containerDefinitionReplacements,
        );

        const cronContainers = loadContainerDefinitions(
            "amazon-ecs-task-definition-cron.json",
            containerDefinitionReplacements,
        );

        const queueContainers = loadContainerDefinitions(
            "amazon-ecs-task-definition-queue.json",
            containerDefinitionReplacements,
        );

        const registryCredentialArns = [
            ...new Set(
                [...appContainers, ...cronContainers, ...queueContainers]
                    .map(
                        (container) =>
                            (
                                container.repositoryCredentials as
                                    | ecs.CfnTaskDefinition.RepositoryCredentialsProperty
                                    | undefined
                            )?.credentialsParameter,
                    )
                    .filter((arn): arn is string => arn !== undefined),
            ),
        ];

        // ------------------------------------------------------------
        // OpenID Connect Provider for GitHub Actions Configuration
        // ------------------------------------------------------------
        const oidcProviderScope = wrap(
            "oidcProvider",
            `${prefix}-oidc-provider`,
        );

        const oidcProvider = new iam.CfnOIDCProvider(
            oidcProviderScope,
            "Resource",
            {
                url: "https://token.actions.githubusercontent.com",
                clientIdList: ["sts.amazonaws.com"],
            },
        );

        // ------------------------------------------------------------
        // AWS IAM for Amazon ECS Service Configuration
        // ------------------------------------------------------------
        const iamEcsTaskExecutionRoleScope = wrap(
            "iamEcsTaskExecutionRole",
            `${prefix}-iam-ecs-task-execution-role`,
        );

        const iamEcsTaskExecutionRole = new iam.CfnRole(
            iamEcsTaskExecutionRoleScope,
            "Resource",
            {
                roleName: `${prefix}-iam-ecs-task-execution-role`,
                description: "IAM role for ECS task execution",
                assumeRolePolicyDocument: {
                    Version: "2012-10-17",
                    Statement: [
                        {
                            Effect: "Allow",
                            Principal: {
                                Service: [
                                    "ecs.amazonaws.com",
                                    "ecs-tasks.amazonaws.com",
                                ],
                            },
                            Action: "sts:AssumeRole",
                        },
                    ],
                },
                managedPolicyArns: [
                    `arn:${stack.partition}:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy`,
                ],
            },
        );

        const iamEcsTaskExectionPolicyScope = wrap(
            "iamEcsTaskExectionPolicy",
            `${prefix}-iam-ecs-task-execution-policy`,
        );

        const iamEcsTaskExectionPolicy = new iam.CfnPolicy(
            iamEcsTaskExectionPolicyScope,
            "Resource",
            {
                policyName: `${prefix}-iam-ecs-task-execution-policy`,
                roles: [iamEcsTaskExecutionRole.ref],
                policyDocument: {
                    Version: "2012-10-17",
                    Statement: [
                        allow(
                            "PassRole",
                            ["iam:PassRole"],
                            [iamEcsTaskExecutionRole.attrArn],
                        ),
                        allow(
                            "GetKeyAndSecrets",
                            [
                                "kms:Decrypt",
                                "ssm:GetParameters",
                                "ssm:GetParameter",
                                "secretsmanager:GetSecretValue",
                            ],
                            [kmsProps.applicationKey.keyArn],
                        ),
                        allow(
                            "GetRegistryCredentials",
                            [
                                "secretsmanager:GetSecretValue",
                                "secretsmanager:DescribeSecret",
                            ],
                            registryCredentialArns,
                        ),
                    ],
                },
            },
        );

        // ------------------------------------------------------------
        // AWS IAM for Amazon ECS Task Configuration
        // ------------------------------------------------------------
        const iamEcsTaskRoleScope = wrap(
            "iamEcsTaskRole",
            `${prefix}-iam-ecs-task-role`,
        );

        const iamEcsTaskRole = new iam.CfnRole(
            iamEcsTaskRoleScope,
            "Resource",
            {
                roleName: `${prefix}-iam-ecs-task-role`,
                description: "IAM role for ECS task",
                assumeRolePolicyDocument: {
                    Version: "2012-10-17",
                    Statement: [
                        {
                            Effect: "Allow",
                            Principal: {
                                Service: [
                                    "ecs.amazonaws.com",
                                    "ecs-tasks.amazonaws.com",
                                    "delivery.logs.amazonaws.com",
                                ],
                            },
                            Action: "sts:AssumeRole",
                        },
                    ],
                },
            },
        );

        const logGroupArn = `arn:aws:logs:${stack.region}:${stack.account}:log-group:*`;

        const iamEcsTaskPolicyScope = wrap(
            "iamEcsTaskPolicy",
            `${prefix}-iam-ecs-task-policy`,
        );

        const iamEcsTaskPolicy = new iam.CfnPolicy(
            iamEcsTaskPolicyScope,
            "Resource",
            {
                policyName: `${prefix}-iam-ecs-task-policy`,
                roles: [iamEcsTaskRole.ref],
                policyDocument: {
                    Version: "2012-10-17",
                    Statement: [
                        allow(
                            "PassRole",
                            ["iam:PassRole"],
                            [
                                iamEcsTaskRole.attrArn,
                                iamEcsTaskExecutionRole.attrArn,
                            ],
                        ),
                        allow(
                            "ECSAccess",
                            [
                                "ecs:RunTask",
                                "ecs:ListTaskDefinitions",
                                "ecs:DescribeServices",
                            ],
                            [`${arnPrefix}:task/*`],
                        ),
                        allow(
                            "S3ListAllBuckets",
                            ["s3:ListAllMyBuckets"],
                            ["*"],
                        ),
                        allow(
                            "S3Access",
                            [
                                "s3:ListBucket",
                                "s3:GetObject",
                                "s3:PutObject",
                                "s3:DeleteObject",
                            ],
                            [
                                s3Props.s3BucketEcsLogs.bucketArn,
                                `${s3Props.s3BucketEcsLogs.bucketArn}/*`,
                            ],
                        ),
                        allow(
                            "AuroraAccess",
                            ["rds-db:connect", "rds-data:ExecuteStatement"],
                            [
                                databaseProps.auroraClusterArn,
                                databaseProps.auroraWriterInstanceArn,
                                databaseProps.auroraReaderInstanceArn,
                            ],
                        ),
                        allow(
                            "ElastiCacheConnect",
                            ["elasticache:Connect"],
                            [databaseProps.elastiCacheReplicationGroupArn],
                        ),
                        allow(
                            "CloudWatchLogsAccess",
                            [
                                "logs:CreateLogDelivery",
                                "logs:GetLogDelivery",
                                "logs:UpdateLogDelivery",
                                "logs:DeleteLogDelivery",
                                "logs:ListLogDeliveries",
                                "logs:PutResourcePolicy",
                                "logs:DescribeResourcePolicies",
                                "logs:DescribeLogGroups",
                            ],
                            [logGroupArn],
                        ),
                        allow(
                            "LogDeliveryWrite",
                            ["logs:CreateLogStream", "logs:PutLogEvents"],
                            [logGroupArn],
                        ),
                        allow(
                            "PutLogDestination",
                            [
                                "logs:PutDestination",
                                "logs:PutDestinationPolicy",
                            ],
                            [logGroupArn],
                        ),
                        allow(
                            "ADFAccess",
                            ["firehose:PutRecord", "firehose:PutRecordBatch"],
                            [
                                `arn:aws:firehose:${stack.region}:${stack.account}:deliverystream/*`,
                            ],
                        ),
                        allow(
                            "AllowECSExec",
                            [
                                "ssmmessages:CreateControlChannel",
                                "ssmmessages:CreateDataChannel",
                                "ssmmessages:OpenControlChannel",
                                "ssmmessages:OpenDataChannel",
                            ],
                            ["*"],
                        ),
                    ],
                },
            },
        );

        // ------------------------------------------------------------
        // AWS IAM for GitHub Actions Deployment Configuration
        // ------------------------------------------------------------
        const githubSubjectCondition = {
            StringLike: {
                "token.actions.githubusercontent.com:sub": [
                    `repo:${commonProps.dashboardName}:ref:refs/heads/main`,
                    `repo:${commonProps.dashboardName}:ref:refs/heads/*`,
                ],
            },
        };

        const iamGithubActionsRoleScope = wrap(
            "iamGithubActionsRole",
            `${prefix}-iam-github-actions-role`,
        );

        const iamGithubActionsRole = new iam.CfnRole(
            iamGithubActionsRoleScope,
            "Resource",
            {
                roleName: `${prefix}-iam-github-actions-role`,
                description: "IAM role for GitHub Actions deployment",
                assumeRolePolicyDocument: {
                    Version: "2012-10-17",
                    Statement: [
                        {
                            Effect: "Allow",
                            Principal: { Federated: oidcProvider.attrArn },
                            Action: "sts:AssumeRoleWithWebIdentity",
                            Condition: githubSubjectCondition,
                        },
                        {
                            Sid: "OIDCFederateRef",
                            Effect: "Allow",
                            Principal: { Federated: oidcProvider.attrArn },
                            Action: "sts:AssumeRoleWithWebIdentity",
                            Condition: githubSubjectCondition,
                        },
                    ],
                },
            },
        );

        const taskDefinitionArns = ["app", "cron", "queue"].map(
            (family) => `${arnPrefix}:task-definition/${prefix}-${family}:*`,
        );

        const iamGithubActionsPolicyScope = wrap(
            "iamGithubActionsPolicy",
            `${prefix}-iam-github-actions-policy`,
        );

        new iam.CfnPolicy(iamGithubActionsPolicyScope, "Resource", {
            policyName: `${prefix}-iam-github-actions-policy`,
            roles: [iamGithubActionsRole.ref],
            policyDocument: {
                Version: "2012-10-17",
                Statement: [
                    allow(
                        "GetAuthenticationToken",
                        ["ecr:GetAuthorizationToken"],
                        ["*"],
                    ),
                    allow(
                        "PushImageOnly",
                        [
                            "ecr:GetDownloadUrlForLayer",
                            "ecr:BatchCheckLayerAvailability",
                            "ecr:InitiateLayerUpload",
                            "ecr:UploadLayerPart",
                            "ecr:CompleteLayerUpload",
                            "ecr:BatchGetImage",
                            "ecr:PutImage",
                        ],
                        [
                            ecrProps.ecrRepositoryWebBaseImage.attrArn,
                            ecrProps.ecrRepositoryAppBaseImage.attrArn,
                            ecrProps.ecrRepositoryWeb.attrArn,
                            ecrProps.ecrRepositoryApp.attrArn,
                        ],
                    ),
                    allow(
                        "RegisterTaskDefinition",
                        [
                            "iam:GetRole",
                            "events:PutTargets",
                            "ecs:RunTask",
                            "ecs:RegisterTaskDefinition",
                            "ecs:DescribeTaskDefinition",
                            "ec2:DescribeSubnets",
                            "ec2:DescribeSecurityGroups",
                        ],
                        [
                            iamEcsTaskRole.attrArn,
                            ...taskDefinitionArns,
                            networkingProps.privateSubnetIds[0],
                            networkingProps.privateSubnetIds[1],
                            sgProps.ecsSecurityGroup.securityGroupId,
                        ],
                    ),
                    allow(
                        "UpdateService",
                        [
                            "ecs:DescribeClusters",
                            "ecs:DescribeServices",
                            "ecs:DescribeTasks",
                            "ecs:UpdateServicePrimaryTaskSet",
                            "ecs:UpdateService",
                        ],
                        [
                            ecsProps.ecsCluster.attrArn,
                            `${arnPrefix}:service/${prefix}-app`,
                            `${arnPrefix}:service/${prefix}-cron`,
                            `${arnPrefix}:service/${prefix}-queue`,
                            ...taskDefinitionArns,
                        ],
                    ),
                    allow(
                        "S3Access",
                        ["s3:GetObject", "s3:PutObject", "s3:ListBucket"],
                        [
                            `arn:aws:s3:::${prefix}-*`,
                            `arn:aws:s3:::${prefix}-*/*`,
                        ],
                    ),
                    allow(
                        "IAMPassRole",
                        ["iam:PassRole"],
                        [
                            iamEcsTaskRole.attrArn,
                            iamEcsTaskExecutionRole.attrArn,
                        ],
                        {
                            StringEquals: {
                                "iam:PassedToService": [
                                    "ecs-tasks.amazonaws.com",
                                    "ecs.amazonaws.com",
                                ],
                            },
                        },
                    ),
                    allow(
                        "GlobalServiceCheck",
                        ["acm:DescribeCertificate", "wafv2:GetWebACL"],
                        ["*"],
                    ),
                ],
            },
        });

        // ------------------------------------------------------------
        // Amazon ECS Task Definition Configuration (app / cron / queue)
        // ------------------------------------------------------------
        const createTaskDefinition = (
            wrapperId: string,
            family: "app" | "cron" | "queue",
            containers: ecs.CfnTaskDefinition.ContainerDefinitionProperty[],
            size: { cpu: string; memory: string },
        ) => {
            const taskDefinitionScope = wrap(
                wrapperId,
                `${prefix}-ecs-${family}-task-definition`,
            );

            return new ecs.CfnTaskDefinition(taskDefinitionScope, "Resource", {
                family,
                cpu: size.cpu,
                memory: size.memory,
                networkMode: "awsvpc",
                requiresCompatibilities: ["FARGATE"],
                taskRoleArn: iamEcsTaskRole.attrArn,
                executionRoleArn: iamEcsTaskExecutionRole.attrArn,
                runtimePlatform: {
                    operatingSystemFamily: "LINUX",
                    cpuArchitecture: "ARM64",
                },
                containerDefinitions: containers,
            });
        };

        const ecsAppTaskDefinition = createTaskDefinition(
            "ecsAppTaskDefinition",
            "app",
            appContainers,
            { cpu: "512", memory: "1024" },
        );

        const ecsCronTaskDefinition = createTaskDefinition(
            "ecsCronTaskDefinition",
            "cron",
            cronContainers,
            { cpu: "256", memory: "512" },
        );

        const ecsQueueTaskDefinition = createTaskDefinition(
            "ecsQueueTaskDefinition",
            "queue",
            queueContainers,
            { cpu: "256", memory: "512" },
        );

        // ------------------------------------------------------------
        // Amazon ECS Service Configuration (app / cron / queue)
        // ------------------------------------------------------------
        const createService = (
            wrapperId: string,
            name: "app" | "cron" | "queue",
            taskDefinition: ecs.CfnTaskDefinition,
            options: {
                serviceName?: string;
                desiredCount: number;
                capacityProviderStrategy: ecs.CfnService.CapacityProviderStrategyItemProperty[];
                loadBalancers?: ecs.CfnService.LoadBalancerProperty[];
            },
        ) => {
            const serviceScope = wrap(
                wrapperId,
                `${prefix}-ecs-${name}-service`,
            );

            const service = new ecs.CfnService(serviceScope, "Service", {
                cluster: ecsProps.ecsCluster.ref,
                serviceName: options.serviceName,
                taskDefinition: taskDefinition.ref,
                desiredCount: options.desiredCount,
                platformVersion: "1.4.0",
                capacityProviderStrategy: options.capacityProviderStrategy,
                availabilityZoneRebalancing: "ENABLED",
                deploymentConfiguration: {
                    maximumPercent: 200,
                    minimumHealthyPercent: options.serviceName ? 50 : 100,
                    deploymentCircuitBreaker: { enable: true, rollback: true },
                    strategy: "ROLLING",
                },
                deploymentController: { type: "ECS" },
                enableExecuteCommand: true,
                forceNewDeployment: { enableForceNewDeployment: true },
                loadBalancers: options.loadBalancers,
                networkConfiguration: {
                    awsvpcConfiguration: {
                        assignPublicIp: "DISABLED",
                        subnets: networkingProps.privateSubnetIds,
                        securityGroups: [
                            sgProps.ecsSecurityGroup.securityGroupId,
                        ],
                    },
                },
            });

            // The task roles must have their policies attached before tasks start.
            service.node.addDependency(
                iamEcsTaskExectionPolicy,
                iamEcsTaskPolicy,
            );

            return { service, serviceScope };
        };

        // Register the first essential container (and its first port) with the ALB target group.
        const albContainer =
            appContainers.find((container) => container.essential) ??
            appContainers[0];

        const albContainerPort = (
            albContainer.portMappings as
                | ecs.CfnTaskDefinition.PortMappingProperty[]
                | undefined
        )?.[0]?.containerPort;

        const { service: ecsAppService, serviceScope: ecsAppServiceScope } =
            createService(
                "ecsAppServiceConfiguration",
                "app",
                ecsAppTaskDefinition,
                {
                    serviceName: "ecsAppService",
                    desiredCount: 2,
                    capacityProviderStrategy: [
                        { capacityProvider: "FARGATE", base: 1, weight: 0 },
                        {
                            capacityProvider: "FARGATE_SPOT",
                            base: 0,
                            weight: 1,
                        },
                    ],
                    loadBalancers: [
                        {
                            containerName: albContainer.name,
                            containerPort: albContainerPort,
                            targetGroupArn: albProps.targetGroup.targetGroupArn,
                        },
                    ],
                },
            );

        ecsAppService.node.addDependency(
            albProps.targetGroup.loadBalancerAttached,
        );

        const fargateOnly = [
            { capacityProvider: "FARGATE", base: 1, weight: 1 },
        ];

        createService(
            "ecsCronServiceConfiguration",
            "cron",
            ecsCronTaskDefinition,
            { desiredCount: 1, capacityProviderStrategy: fargateOnly },
        );

        createService(
            "ecsQueueServiceConfiguration",
            "queue",
            ecsQueueTaskDefinition,
            { desiredCount: 1, capacityProviderStrategy: fargateOnly },
        );

        // ------------------------------------------------------------
        // Application Auto Scaling for Amazon ECS App Service
        // L2 is kept here because the monitoring stack consumes the scalable
        // target through the L2 StepScalingAction / StepScalingPolicy APIs.
        // ------------------------------------------------------------
        const ecsAppTaskCountScope = new Construct(
            ecsAppServiceScope,
            "TaskCount",
        );

        this.ecsAppScalableTarget = new applicationautoscaling.ScalableTarget(
            ecsAppTaskCountScope,
            "Target",
            {
                serviceNamespace: applicationautoscaling.ServiceNamespace.ECS,
                scalableDimension: "ecs:service:DesiredCount",
                resourceId: `service/${ecsProps.ecsCluster.ref}/${ecsAppService.attrName}`,
                minCapacity: 2,
                maxCapacity: 4,
            },
        );

        cdk.Tags.of(this.ecsAppScalableTarget).add(
            "Name",
            `${prefix}-ecs-app-autoscaling-target`,
        );
        cdk.Tags.of(this.ecsAppScalableTarget).add("ProvisionedBy", "AWS");
        cdk.Tags.of(this.ecsAppScalableTarget).add("ProjectCode", "1234567890");

        const cpuMetric = new cloudwatch.Metric({
            namespace: "AWS/ECS",
            metricName: "CPUUtilization",
            dimensionsMap: { TaskDefinitionFamily: "app" },
            statistic: "Average",
            period: cdk.Duration.seconds(60),
        });

        new applicationautoscaling.StepScalingPolicy(
            this,
            "AutoScaleOutEcsApp",
            {
                scalingTarget: this.ecsAppScalableTarget,
                metric: cpuMetric,
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
                metric: cpuMetric,
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
        // AWS SSM Parameter Store Configuration
        // ------------------------------------------------------------
        const createParameter = (
            wrapperId: string,
            key: string,
            label: string,
        ) => {
            const parameterScope = wrap(wrapperId, `${prefix}-${key}`);

            return new ssm.CfnParameter(parameterScope, "Resource", {
                name: `/${commonProps.projectName}/${envProps.envName}/${key}`,
                description: `The parameter for ${prefix} ${label}`,
                type: "String",
                value: "PleaseChangeMe",
            });
        };

        this.ssmParameterStoreAppKey = createParameter(
            "ssmParameterStoreAppKey",
            "app-key",
            "app key",
        );

        this.ssmParamenterStoreJwtSecret = createParameter(
            "ssmParamenterStoreJwtSecret",
            "jwt-secret",
            "jwt secret",
        );

        this.ssmParameterStoreAuroraWriterEndPoint = createParameter(
            "ssmParameterStoreAuroraWriterEndPoint",
            "aurora-writer-endpoint",
            "aurora writer endpoint",
        );

        this.ssmParameterStoreAuroraReaderEndPoint = createParameter(
            "ssmParameterStoreAuroraReaderEndPoint",
            "aurora-reader-endpoint",
            "aurora reader endpoint",
        );

        this.ssmParameterStoreElastiCacheWriterEndPoint = createParameter(
            "ssmParameterStoreElastiCacheWriterEndPoint",
            "elasticache-writer-endpoint",
            "elasticache writer endpoint",
        );

        this.ssmParameterStoreElastiCacheReaderEndPoint = createParameter(
            "ssmParameterStoreElastiCacheReaderEndPoint",
            "elasticache-reader-endpoint",
            "elasticache reader endpoint",
        );
    }
}
