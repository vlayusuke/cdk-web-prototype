import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as cdk from "aws-cdk-lib";
import { aws_ec2 as ec2, aws_ecr as ecr, aws_s3 as s3 } from "aws-cdk-lib";
import type * as kms from "aws-cdk-lib/aws-kms";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";

export interface commonProps {
    projectName: string;
    envName: string;
    nakedDomainName: string;
}

export interface envProps {
    vpcCidr: string;
    defaultGatewayCidr: string;
}

export interface networkingProps {
    vpcId: string;
    privateSubnetIds: string[];
    privateSubnetRouteTableIds: string[];
}

export interface sgProps {
    vpcEndPointS3SecurityGroup: ec2.SecurityGroup;
    vpcEndPointECRSecurityGroup: ec2.SecurityGroup;
    vpcEndPointSSMSecurityGroup: ec2.SecurityGroup;
    vpcEndPointKMSSecurityGroup: ec2.SecurityGroup;
    vpcEndPointCloudWatchLogsSecurityGroup: ec2.SecurityGroup;
}

export interface kmsProps {
    applicationKey: kms.IKey;
    ecrKey: kms.IKey;
    s3Key: kms.IKey;
}

export interface CfStorageStackProps extends networkingProps, kmsProps {}

// ------------------------------------------------------------
// [06] - Storage Stack
// ------------------------------------------------------------
export class cfStorageStack extends Construct {
    public readonly vpcEndpointECRDocker: ec2.CfnVPCEndpoint;
    public readonly vpcEndpointECRAPI: ec2.CfnVPCEndpoint;
    public readonly vpcEndpointKMS: ec2.CfnVPCEndpoint;
    public readonly vpcEndpointSSM: ec2.CfnVPCEndpoint;
    public readonly vpcEndpointSSMEC2: ec2.CfnVPCEndpoint;
    public readonly vpcEndpointSSMEC2Messages: ec2.CfnVPCEndpoint;
    public readonly vpcEndpointCloudWatchLogs: ec2.CfnVPCEndpoint;
    public readonly vpcEndpointS3: ec2.CfnVPCEndpoint;
    public readonly ecrRepositoryWebBaseImage: ecr.Repository;
    public readonly ecrRepositoryAppBaseImage: ecr.Repository;
    public readonly ecrRepositoryWeb: ecr.Repository;
    public readonly ecrRepositoryApp: ecr.Repository;
    public readonly s3BucketAlbLogs: s3.Bucket;
    public readonly s3BucketAuroraLogs: s3.Bucket;
    public readonly s3BucketEcsLogs: s3.Bucket;
    public readonly s3BucketEc2Logs: s3.Bucket;
    public readonly s3BucketElastiCacheLogs: s3.Bucket;
    public readonly s3BucketLambdaLogs: s3.Bucket;
    public readonly s3BucketSnsLogs: s3.Bucket;
    public readonly s3BucketAssets: s3.Bucket;
    public readonly s3BucketUploads: s3.Bucket;

    constructor(
        scope: Construct,
        id: string,
        props: CfStorageStackProps,
        sgProps: sgProps,
        commonProps: commonProps,
    ) {
        super(scope, id);

        // ------------------------------------------------------------
        // Declaring Amazon ECR Repositories Assets Configuration
        // ------------------------------------------------------------
        const repositoryAsset = s3deploy.Source.asset("./", {
            exclude: [
                ".cdk.staging",
                ".cdk.staging/**",
                "cdk.out",
                "cdk.out/**",
                ".git",
                ".git/**",
                "cdk.context.json",
                "node_modules",
                "node_modules/**",
            ],
        });

        // ------------------------------------------------------------
        // Declaring VPC Endpoint Policy Configuration
        // ------------------------------------------------------------
        const ecrRepositoryArns = [
            "web-baseimage",
            "app-baseimage",
            "web",
            "app",
        ].map(
            (repositoryName) =>
                `arn:aws:ecr:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:repository/${repositoryName}`,
        );

        const ecrEndpointPolicy = {
            Version: "2012-10-17",
            Statement: [
                {
                    Effect: "Allow",
                    Principal: "*",
                    Action: "ecr:GetAuthorizationToken",
                    Resource: "*",
                },
                {
                    Effect: "Allow",
                    Principal: "*",
                    Action: [
                        "ecr:BatchCheckLayerAvailability",
                        "ecr:BatchGetImage",
                        "ecr:GetDownloadUrlForLayer",
                    ],
                    Resource: ecrRepositoryArns,
                },
            ],
        };

        const applicationBucketArns = [
            "alb-logs",
            "aurora-logs",
            "ecs-logs",
            "ec2-logs",
            "elasticache-logs",
            "lambda-logs",
            "sns-logs",
            "assets",
            "uploads",
        ].map(
            (suffix) =>
                `arn:aws:s3:::${commonProps.projectName}-${commonProps.envName}-${suffix}`,
        );

        const s3EndpointPolicy = {
            Version: "2012-10-17",
            Statement: [
                {
                    Sid: "AllowEcrImageLayerDownloads",
                    Effect: "Allow",
                    Principal: "*",
                    Action: "s3:GetObject",
                    Resource: `arn:aws:s3:::prod-${cdk.Aws.REGION}-starport-layer-bucket/*`,
                },
                {
                    Sid: "AllowProjectBucketListing",
                    Effect: "Allow",
                    Principal: "*",
                    Action: ["s3:ListBucket", "s3:ListBucketMultipartUploads"],
                    Resource: applicationBucketArns,
                },
                {
                    Sid: "AllowProjectBucketObjectAccess",
                    Effect: "Allow",
                    Principal: "*",
                    Action: [
                        "s3:AbortMultipartUpload",
                        "s3:GetObject",
                        "s3:ListMultipartUploadParts",
                        "s3:PutObject",
                    ],
                    Resource: applicationBucketArns.map(
                        (bucketArn) => `${bucketArn}/*`,
                    ),
                },
            ],
        };

        const kmsEndpointPolicy = {
            Version: "2012-10-17",
            Statement: [
                {
                    Effect: "Allow",
                    Principal: "*",
                    Action: [
                        "kms:Decrypt",
                        "kms:DescribeKey",
                        "kms:Encrypt",
                        "kms:GenerateDataKey",
                    ],
                    Resource: props.applicationKey.keyArn,
                },
            ],
        };

        const ssmEndpointPolicy = {
            Version: "2012-10-17",
            Statement: [
                {
                    Effect: "Allow",
                    Principal: "*",
                    Action: [
                        "ssm:DescribeAssociation",
                        "ssm:DescribeDocument",
                        "ssm:DescribeInstanceInformation",
                        "ssm:GetDeployablePatchSnapshotForInstance",
                        "ssm:GetDocument",
                        "ssm:GetManifest",
                        "ssm:GetParameter",
                        "ssm:GetParameters",
                        "ssm:GetParametersByPath",
                        "ssm:ListAssociations",
                        "ssm:ListInstanceAssociations",
                        "ssm:PutComplianceItems",
                        "ssm:PutInventory",
                        "ssm:PutConfigurePackageResult",
                        "ssm:SendCommand",
                        "ssm:StartSession",
                        "ssm:TerminateSession",
                        "ssm:ResumeSession",
                        "ssm:UpdateAssociationStatus",
                        "ssm:UpdateInstanceAssociationStatus",
                        "ssm:UpdateInstanceInformation",
                    ],
                    Resource: "*",
                },
            ],
        };

        const ssmMessagesEndpointPolicy = {
            Version: "2012-10-17",
            Statement: [
                {
                    Effect: "Allow",
                    Principal: "*",
                    Action: [
                        "ssmmessages:CreateControlChannel",
                        "ssmmessages:CreateDataChannel",
                        "ssmmessages:OpenControlChannel",
                        "ssmmessages:OpenDataChannel",
                    ],
                    Resource: "*",
                },
            ],
        };

        const ec2MessagesEndpointPolicy = {
            Version: "2012-10-17",
            Statement: [
                {
                    Effect: "Allow",
                    Principal: "*",
                    Action: [
                        "ec2messages:AcknowledgeMessage",
                        "ec2messages:DeleteMessage",
                        "ec2messages:FailMessage",
                        "ec2messages:GetEndpoint",
                        "ec2messages:GetMessages",
                        "ec2messages:SendReply",
                    ],
                    Resource: "*",
                },
            ],
        };

        const cloudWatchLogsEndpointPolicy = {
            Version: "2012-10-17",
            Statement: [
                {
                    Effect: "Allow",
                    Principal: "*",
                    Action: ["logs:CreateLogStream", "logs:PutLogEvents"],
                    Resource: `arn:aws:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:/ecs/${commonProps.projectName}/${commonProps.envName}*:*`,
                },
            ],
        };

        // ------------------------------------------------------------
        // VPC Endpoint for Amazon ECR Docker Interface Configuration
        // ------------------------------------------------------------
        this.vpcEndpointECRDocker = new ec2.CfnVPCEndpoint(
            this,
            "vpcEndpointECRDocker",
            {
                vpcId: props.vpcId,
                serviceName: `com.amazonaws.${cdk.Aws.REGION}.ecr.dkr`,
                vpcEndpointType: "Interface",
                policyDocument: ecrEndpointPolicy,
                securityGroupIds: [
                    sgProps.vpcEndPointECRSecurityGroup.securityGroupId,
                ],
                subnetIds: props.privateSubnetIds,
                ipAddressType: "ipv4",
                privateDnsEnabled: true,
                dnsOptions: {
                    dnsRecordIpType: "ipv4",
                },
            },
        );

        cdk.Tags.of(this.vpcEndpointECRDocker).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-vpcendpoint-ecr-docker`,
        );
        cdk.Tags.of(this.vpcEndpointECRDocker).add("ProvisionedBy", "AWS");

        // ------------------------------------------------------------
        // VPC Endpoint for Amazon ECR API Interface Configuration
        // ------------------------------------------------------------
        this.vpcEndpointECRAPI = new ec2.CfnVPCEndpoint(
            this,
            "vpcEndpointECRAPI",
            {
                vpcId: props.vpcId,
                serviceName: `com.amazonaws.${cdk.Aws.REGION}.ecr.api`,
                vpcEndpointType: "Interface",
                policyDocument: ecrEndpointPolicy,
                securityGroupIds: [
                    sgProps.vpcEndPointECRSecurityGroup.securityGroupId,
                ],
                subnetIds: props.privateSubnetIds,
                ipAddressType: "ipv4",
                privateDnsEnabled: true,
                dnsOptions: {
                    dnsRecordIpType: "ipv4",
                },
            },
        );

        cdk.Tags.of(this.vpcEndpointECRAPI).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-vpcendpoint-ecr-api`,
        );
        cdk.Tags.of(this.vpcEndpointECRAPI).add("ProvisionedBy", "AWS");

        // ------------------------------------------------------------
        // VPC Endpoint for AWS KMS Interface Configuration
        // ------------------------------------------------------------
        this.vpcEndpointKMS = new ec2.CfnVPCEndpoint(this, "vpcEndpointKMS", {
            vpcId: props.vpcId,
            serviceName: `com.amazonaws.${cdk.Aws.REGION}.kms`,
            vpcEndpointType: "Interface",
            policyDocument: kmsEndpointPolicy,
            securityGroupIds: [
                sgProps.vpcEndPointKMSSecurityGroup.securityGroupId,
            ],
            subnetIds: props.privateSubnetIds,
            ipAddressType: "ipv4",
            privateDnsEnabled: true,
            dnsOptions: {
                dnsRecordIpType: "ipv4",
            },
        });

        cdk.Tags.of(this.vpcEndpointKMS).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-vpcendpoint-kms`,
        );
        cdk.Tags.of(this.vpcEndpointKMS).add("ProvisionedBy", "AWS");

        // ------------------------------------------------------------
        // VPC Endpoint for AWS Systems Manager Interface Configuration
        // All SSM endpoints share the same HTTPS clients and TCP 443 policy.
        // ------------------------------------------------------------
        this.vpcEndpointSSM = new ec2.CfnVPCEndpoint(this, "vpcEndpointSSM", {
            vpcId: props.vpcId,
            serviceName: `com.amazonaws.${cdk.Aws.REGION}.ssm`,
            vpcEndpointType: "Interface",
            policyDocument: ssmEndpointPolicy,
            securityGroupIds: [
                sgProps.vpcEndPointSSMSecurityGroup.securityGroupId,
            ],
            subnetIds: props.privateSubnetIds,
            ipAddressType: "ipv4",
            privateDnsEnabled: true,
            dnsOptions: {
                dnsRecordIpType: "ipv4",
            },
        });

        cdk.Tags.of(this.vpcEndpointSSM).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-vpcendpoint-ssm`,
        );
        cdk.Tags.of(this.vpcEndpointSSM).add("ProvisionedBy", "AWS");

        // ------------------------------------------------------------
        // VPC Endpoint for AWS Systems Manager Messages Interface Configuration
        // ------------------------------------------------------------
        this.vpcEndpointSSMEC2 = new ec2.CfnVPCEndpoint(
            this,
            "vpcEndpointSSMEC2",
            {
                vpcId: props.vpcId,
                serviceName: `com.amazonaws.${cdk.Aws.REGION}.ssmmessages`,
                vpcEndpointType: "Interface",
                policyDocument: ssmMessagesEndpointPolicy,
                securityGroupIds: [
                    sgProps.vpcEndPointSSMSecurityGroup.securityGroupId,
                ],
                subnetIds: props.privateSubnetIds,
                ipAddressType: "ipv4",
                privateDnsEnabled: true,
                dnsOptions: {
                    dnsRecordIpType: "ipv4",
                },
            },
        );

        cdk.Tags.of(this.vpcEndpointSSMEC2).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-vpcendpoint-ssm-messages`,
        );
        cdk.Tags.of(this.vpcEndpointSSMEC2).add("ProvisionedBy", "AWS");

        // ------------------------------------------------------------
        // VPC Endpoint for AWS Systems Manager EC2 Messages Interface Configuration
        // ------------------------------------------------------------
        this.vpcEndpointSSMEC2Messages = new ec2.CfnVPCEndpoint(
            this,
            "vpcEndpointSSMEC2Messages",
            {
                vpcId: props.vpcId,
                serviceName: `com.amazonaws.${cdk.Aws.REGION}.ec2messages`,
                vpcEndpointType: "Interface",
                policyDocument: ec2MessagesEndpointPolicy,
                securityGroupIds: [
                    sgProps.vpcEndPointSSMSecurityGroup.securityGroupId,
                ],
                subnetIds: props.privateSubnetIds,
                ipAddressType: "ipv4",
                privateDnsEnabled: true,
                dnsOptions: {
                    dnsRecordIpType: "ipv4",
                },
            },
        );

        cdk.Tags.of(this.vpcEndpointSSMEC2Messages).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-vpcendpoint-ssm-ec2-messages`,
        );
        cdk.Tags.of(this.vpcEndpointSSMEC2Messages).add("ProvisionedBy", "AWS");

        // ------------------------------------------------------------
        // VPC Endpoint for Amazon CloudWatch Logs Interface Configuration
        // ------------------------------------------------------------
        this.vpcEndpointCloudWatchLogs = new ec2.CfnVPCEndpoint(
            this,
            "vpcEndpointCloudWatchLogs",
            {
                vpcId: props.vpcId,
                serviceName: `com.amazonaws.${cdk.Aws.REGION}.logs`,
                vpcEndpointType: "Interface",
                policyDocument: cloudWatchLogsEndpointPolicy,
                securityGroupIds: [
                    sgProps.vpcEndPointCloudWatchLogsSecurityGroup
                        .securityGroupId,
                ],
                subnetIds: props.privateSubnetIds,
                ipAddressType: "ipv4",
                privateDnsEnabled: true,
                dnsOptions: {
                    dnsRecordIpType: "ipv4",
                },
            },
        );

        cdk.Tags.of(this.vpcEndpointCloudWatchLogs).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-vpcendpoint-cloudwatch-logs`,
        );
        cdk.Tags.of(this.vpcEndpointCloudWatchLogs).add("ProvisionedBy", "AWS");

        // ------------------------------------------------------------
        // VPC Endpoint for Amazon S3 Gateway Configuration
        // ------------------------------------------------------------
        this.vpcEndpointS3 = new ec2.CfnVPCEndpoint(this, "vpcEndpointS3", {
            vpcId: props.vpcId,
            serviceName: `com.amazonaws.${cdk.Aws.REGION}.s3`,
            vpcEndpointType: "Gateway",
            routeTableIds: props.privateSubnetRouteTableIds,
            policyDocument: s3EndpointPolicy,
        });

        cdk.Tags.of(this.vpcEndpointS3).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-vpcendpoint-s3`,
        );
        cdk.Tags.of(this.vpcEndpointS3).add("ProvisionedBy", "AWS");

        // ------------------------------------------------------------
        // Amazon ECR Repository for Web BaseImage Configuration
        // ------------------------------------------------------------
        const lifecyclePolicyText = readFileSync(
            join(__dirname, "../json/amazon-ecr-lifecycle-policy.json"),
            "utf8",
        );

        this.ecrRepositoryWebBaseImage = new ecr.Repository(
            this,
            "ecrRepositoryWebBaseImage",
            {
                repositoryName: "web-baseimage",
                imageTagMutability: ecr.TagMutability.IMMUTABLE,
                imageScanOnPush: true,
                encryption: ecr.RepositoryEncryption.KMS,
                encryptionKey: props.ecrKey,
            },
        );

        cdk.Tags.of(this.ecrRepositoryWebBaseImage).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-ecr-repository-web-baseimage`,
        );
        cdk.Tags.of(this.ecrRepositoryWebBaseImage).add("ProvisionedBy", "AWS");

        const cfnRepositoryWebBaseImage = this.ecrRepositoryWebBaseImage.node
            .defaultChild as ecr.CfnRepository;
        cfnRepositoryWebBaseImage.lifecyclePolicy = {
            lifecyclePolicyText: lifecyclePolicyText,
        };

        // ------------------------------------------------------------
        // Amazon ECR Repository for Application BaseImage Configuration
        // ------------------------------------------------------------
        this.ecrRepositoryAppBaseImage = new ecr.Repository(
            this,
            "ecrRepositoryAppBaseImage",
            {
                repositoryName: "app-baseimage",
                imageTagMutability: ecr.TagMutability.IMMUTABLE,
                imageScanOnPush: true,
                encryption: ecr.RepositoryEncryption.KMS,
                encryptionKey: props.ecrKey,
            },
        );

        cdk.Tags.of(this.ecrRepositoryAppBaseImage).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-ecr-repository-app-baseimage`,
        );
        cdk.Tags.of(this.ecrRepositoryAppBaseImage).add("ProvisionedBy", "AWS");

        const cfnRepositoryAppBaseImage = this.ecrRepositoryAppBaseImage.node
            .defaultChild as ecr.CfnRepository;
        cfnRepositoryAppBaseImage.lifecyclePolicy = {
            lifecyclePolicyText: lifecyclePolicyText,
        };

        // ------------------------------------------------------------
        // Amazon ECR Repository for Web Configuration
        // ------------------------------------------------------------
        this.ecrRepositoryWeb = new ecr.Repository(this, "ecrRepositoryWeb", {
            repositoryName: "web",
            imageTagMutability: ecr.TagMutability.IMMUTABLE,
            imageScanOnPush: true,
            encryption: ecr.RepositoryEncryption.KMS,
            encryptionKey: props.ecrKey,
        });

        cdk.Tags.of(this.ecrRepositoryWeb).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-ecr-repository-web`,
        );
        cdk.Tags.of(this.ecrRepositoryWeb).add("ProvisionedBy", "AWS");

        const cfnRepositoryWeb = this.ecrRepositoryWeb.node
            .defaultChild as ecr.CfnRepository;
        cfnRepositoryWeb.lifecyclePolicy = {
            lifecyclePolicyText: lifecyclePolicyText,
        };

        // ------------------------------------------------------------
        // Amazon ECR Repository for Application Configuration
        // ------------------------------------------------------------
        this.ecrRepositoryApp = new ecr.Repository(this, "ecrRepositoryApp", {
            repositoryName: "app",
            imageTagMutability: ecr.TagMutability.IMMUTABLE,
            imageScanOnPush: true,
            encryption: ecr.RepositoryEncryption.KMS,
            encryptionKey: props.ecrKey,
        });

        cdk.Tags.of(this.ecrRepositoryApp).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-ecr-repository-app`,
        );
        cdk.Tags.of(this.ecrRepositoryApp).add("ProvisionedBy", "AWS");

        const cfnRepositoryApp = this.ecrRepositoryApp.node
            .defaultChild as ecr.CfnRepository;
        cfnRepositoryApp.lifecyclePolicy = {
            lifecyclePolicyText: lifecyclePolicyText,
        };

        // ------------------------------------------------------------
        // Amazon S3 Bucket for ALB Logs Configuration
        // ------------------------------------------------------------
        this.s3BucketAlbLogs = new s3.Bucket(this, "s3BucketAlbLogs", {
            bucketName: `${commonProps.projectName}-${commonProps.envName}-alb-logs`,
            versioned: true,
            accessControl: s3.BucketAccessControl.PRIVATE,
            encryptionKey: props.s3Key,
            encryption: s3.BucketEncryption.KMS,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            enforceSSL: true,
            blockedEncryptionTypes: [s3.BlockedEncryptionType.SSE_C],
        });

        cdk.Tags.of(this.s3BucketAlbLogs).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-s3-bucket-alb-logs`,
        );
        cdk.Tags.of(this.s3BucketAlbLogs).add("ProvisionedBy", "AWS");

        // ------------------------------------------------------------
        // Amazon S3 Bucket for Amazon ECS Logs Configuration
        // ------------------------------------------------------------
        this.s3BucketEcsLogs = new s3.Bucket(this, "s3BucketEcsLogs", {
            bucketName: `${commonProps.projectName}-${commonProps.envName}-ecs-logs`,
            versioned: true,
            accessControl: s3.BucketAccessControl.PRIVATE,
            encryptionKey: props.s3Key,
            encryption: s3.BucketEncryption.KMS,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            enforceSSL: true,
            blockedEncryptionTypes: [s3.BlockedEncryptionType.SSE_C],
        });

        cdk.Tags.of(this.s3BucketEcsLogs).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-s3-bucket-ecs-logs`,
        );
        cdk.Tags.of(this.s3BucketEcsLogs).add("ProvisionedBy", "AWS");

        new s3deploy.BucketDeployment(this, "deployNginxLogs", {
            sources: [repositoryAsset],
            destinationBucket: this.s3BucketEcsLogs,
            destinationKeyPrefix: "nginx-logs",
        });

        new s3deploy.BucketDeployment(this, "deployAppLogs", {
            sources: [repositoryAsset],
            destinationBucket: this.s3BucketEcsLogs,
            destinationKeyPrefix: "app-logs",
        });

        new s3deploy.BucketDeployment(this, "deployCronLogs", {
            sources: [repositoryAsset],
            destinationBucket: this.s3BucketEcsLogs,
            destinationKeyPrefix: "cron-logs",
        });

        new s3deploy.BucketDeployment(this, "deployQueueLogs", {
            sources: [repositoryAsset],
            destinationBucket: this.s3BucketEcsLogs,
            destinationKeyPrefix: "queue-logs",
        });

        // ------------------------------------------------------------
        // Amazon S3 Bucket for Amazon EC2 Logs Configuration
        // ------------------------------------------------------------
        this.s3BucketEc2Logs = new s3.Bucket(this, "s3BucketEc2Logs", {
            bucketName: `${commonProps.projectName}-${commonProps.envName}-ec2-logs`,
            versioned: true,
            accessControl: s3.BucketAccessControl.PRIVATE,
            encryptionKey: props.s3Key,
            encryption: s3.BucketEncryption.KMS,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            enforceSSL: true,
            blockedEncryptionTypes: [s3.BlockedEncryptionType.SSE_C],
        });

        cdk.Tags.of(this.s3BucketEc2Logs).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-s3-bucket-ec2-logs`,
        );
        cdk.Tags.of(this.s3BucketEc2Logs).add("ProvisionedBy", "AWS");

        new s3deploy.BucketDeployment(this, "deployEc2BastionLogs", {
            sources: [repositoryAsset],
            destinationBucket: this.s3BucketEc2Logs,
            destinationKeyPrefix: "bastion-logs",
        });

        new s3deploy.BucketDeployment(this, "deployEc2BatchALogs", {
            sources: [repositoryAsset],
            destinationBucket: this.s3BucketEc2Logs,
            destinationKeyPrefix: "batch-a-logs",
        });

        new s3deploy.BucketDeployment(this, "deployEc2BatchCLogs", {
            sources: [repositoryAsset],
            destinationBucket: this.s3BucketEc2Logs,
            destinationKeyPrefix: "batch-c-logs",
        });

        // ------------------------------------------------------------
        // Amazon S3 Bucket for AWS Lambda Logs Configuration
        // ------------------------------------------------------------
        this.s3BucketLambdaLogs = new s3.Bucket(this, "s3BucketLambdaLogs", {
            bucketName: `${commonProps.projectName}-${commonProps.envName}-lambda-logs`,
            versioned: true,
            accessControl: s3.BucketAccessControl.PRIVATE,
            encryptionKey: props.s3Key,
            encryption: s3.BucketEncryption.KMS,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            enforceSSL: true,
            blockedEncryptionTypes: [s3.BlockedEncryptionType.SSE_C],
        });

        cdk.Tags.of(this.s3BucketLambdaLogs).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-s3-bucket-lambda-logs`,
        );
        cdk.Tags.of(this.s3BucketLambdaLogs).add("ProvisionedBy", "AWS");

        new s3deploy.BucketDeployment(this, "deployLambdaRdsControlLogs", {
            sources: [repositoryAsset],
            destinationBucket: this.s3BucketLambdaLogs,
            destinationKeyPrefix: "rds-control",
        });

        new s3deploy.BucketDeployment(
            this,
            "deployLambdaCloudWatchLogsAlertLogs",
            {
                sources: [repositoryAsset],
                destinationBucket: this.s3BucketLambdaLogs,
                destinationKeyPrefix: "cloudwatch-logs-alert-logs",
            },
        );

        new s3deploy.BucketDeployment(
            this,
            "deployLambdaCloudWatchMetricsAlertLogs",
            {
                sources: [repositoryAsset],
                destinationBucket: this.s3BucketLambdaLogs,
                destinationKeyPrefix: "cloudwatch-metrics-alert-logs",
            },
        );

        // ------------------------------------------------------------
        // Amazon S3 Bucket for Amazon Aurora Logs Configuration
        // ------------------------------------------------------------
        this.s3BucketAuroraLogs = new s3.Bucket(this, "s3BucketAuroraLogs", {
            bucketName: `${commonProps.projectName}-${commonProps.envName}-aurora-logs`,
            versioned: true,
            accessControl: s3.BucketAccessControl.PRIVATE,
            encryptionKey: props.s3Key,
            encryption: s3.BucketEncryption.KMS,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            enforceSSL: true,
            blockedEncryptionTypes: [s3.BlockedEncryptionType.SSE_C],
        });

        cdk.Tags.of(this.s3BucketAuroraLogs).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-s3-bucket-aurora-logs`,
        );
        cdk.Tags.of(this.s3BucketAuroraLogs).add("ProvisionedBy", "AWS");

        new s3deploy.BucketDeployment(this, "deployAuroraInstanceLogs", {
            sources: [repositoryAsset],
            destinationBucket: this.s3BucketAuroraLogs,
            destinationKeyPrefix: "instance-logs",
        });

        new s3deploy.BucketDeployment(this, "deployAuroraPostgreSqlLogs", {
            sources: [repositoryAsset],
            destinationBucket: this.s3BucketAuroraLogs,
            destinationKeyPrefix: "postgresql-logs",
        });

        new s3deploy.BucketDeployment(this, "deployAuroraIamAuthErrorLogs", {
            sources: [repositoryAsset],
            destinationBucket: this.s3BucketAuroraLogs,
            destinationKeyPrefix: "iam-auth-error-logs",
        });

        // ------------------------------------------------------------
        // Amazon S3 Bucket for Amazon ElastiCache Logs Configuration
        // ------------------------------------------------------------
        this.s3BucketElastiCacheLogs = new s3.Bucket(
            this,
            "s3BucketElastiCacheLogs",
            {
                bucketName: `${commonProps.projectName}-${commonProps.envName}-elasticache-logs`,
                versioned: true,
                accessControl: s3.BucketAccessControl.PRIVATE,
                encryptionKey: props.s3Key,
                encryption: s3.BucketEncryption.KMS,
                blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
                removalPolicy: cdk.RemovalPolicy.RETAIN,
                enforceSSL: true,
                blockedEncryptionTypes: [s3.BlockedEncryptionType.SSE_C],
            },
        );

        cdk.Tags.of(this.s3BucketElastiCacheLogs).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-s3-bucket-elasticache-logs`,
        );
        cdk.Tags.of(this.s3BucketElastiCacheLogs).add("ProvisionedBy", "AWS");

        // ------------------------------------------------------------
        // Amazon S3 Bucket for Amazon SNS Logs Configuration
        // ------------------------------------------------------------
        this.s3BucketSnsLogs = new s3.Bucket(this, "s3BucketSnsLogs", {
            bucketName: `${commonProps.projectName}-${commonProps.envName}-sns-logs`,
            versioned: true,
            accessControl: s3.BucketAccessControl.PRIVATE,
            encryptionKey: props.s3Key,
            encryption: s3.BucketEncryption.KMS,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            enforceSSL: true,
            blockedEncryptionTypes: [s3.BlockedEncryptionType.SSE_C],
        });

        cdk.Tags.of(this.s3BucketSnsLogs).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-s3-bucket-sns-logs`,
        );
        cdk.Tags.of(this.s3BucketSnsLogs).add("ProvisionedBy", "AWS");

        // ------------------------------------------------------------
        // Amazon S3 Bucket for Assets Configuration
        // ------------------------------------------------------------
        this.s3BucketAssets = new s3.Bucket(this, "s3BucketAssets", {
            bucketName: `${commonProps.projectName}-${commonProps.envName}-assets`,
            versioned: true,
            accessControl: s3.BucketAccessControl.PRIVATE,
            encryptionKey: props.s3Key,
            encryption: s3.BucketEncryption.KMS,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            enforceSSL: true,
            blockedEncryptionTypes: [s3.BlockedEncryptionType.SSE_C],
            cors: [
                {
                    allowedMethods: [
                        s3.HttpMethods.HEAD,
                        s3.HttpMethods.POST,
                        s3.HttpMethods.GET,
                    ],
                    allowedOrigins: [
                        `https://${commonProps.envName}.${commonProps.nakedDomainName}`,
                    ],
                    allowedHeaders: ["*"],
                    maxAge: 3600, // Cache for 1 hour
                },
            ],
        });

        cdk.Tags.of(this.s3BucketAssets).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-s3-bucket-assets`,
        );
        cdk.Tags.of(this.s3BucketAssets).add("ProvisionedBy", "AWS");

        new s3deploy.BucketDeployment(this, "deployAssets", {
            sources: [repositoryAsset],
            destinationBucket: this.s3BucketAssets,
            destinationKeyPrefix: "assets",
        });

        new s3deploy.BucketDeployment(this, "deployPictures", {
            sources: [repositoryAsset],
            destinationBucket: this.s3BucketAssets,
            destinationKeyPrefix: "pictures",
        });
    }
}
