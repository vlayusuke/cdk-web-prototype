import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as cdk from "aws-cdk-lib";
import { aws_ecr as ecr, aws_s3 as s3 } from "aws-cdk-lib";
import type * as kms from "aws-cdk-lib/aws-kms";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";

export interface CommonProps {
    projectName: string;
    dashboardName: string;
    nakedDomainName: string;
}

export interface EnvProps {
    envName: string;
    vpcCidr: string;
    defaultGatewayCidr: string;
}

export interface KmsProps {
    ecrKey: kms.IKey;
    s3Key: kms.IKey;
}

// ************************************************************
// [07] - Storage Stack
// ************************************************************
export class CfStorageStack extends Construct {
    public readonly ecrRepositoryWebBaseImage: ecr.CfnRepository;
    public readonly ecrRepositoryAppBaseImage: ecr.CfnRepository;
    public readonly ecrRepositoryWeb: ecr.CfnRepository;
    public readonly ecrRepositoryApp: ecr.CfnRepository;
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
        kmsProps: KmsProps,
        commonProps: CommonProps,
        envProps: EnvProps,
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
        // Amazon ECR Repository for Web BaseImage Configuration
        // ------------------------------------------------------------
        const lifecyclePolicyText = readFileSync(
            join(__dirname, "../json/amazon-ecr-lifecycle-policy.json"),
            "utf8",
        );

        this.ecrRepositoryWebBaseImage = new ecr.CfnRepository(
            this,
            "ecrRepositoryWebBaseImage",
            {
                repositoryName: "web-baseimage",
                imageTagMutability: "IMMUTABLE",
                imageScanningConfiguration: { scanOnPush: true },
                encryptionConfiguration: {
                    encryptionType: "KMS",
                    kmsKey: kmsProps.ecrKey.keyArn,
                },
                lifecyclePolicy: { lifecyclePolicyText },
            },
        );

        this.ecrRepositoryWebBaseImage.applyRemovalPolicy(
            cdk.RemovalPolicy.RETAIN,
        );

        this.ecrRepositoryWebBaseImage.overrideLogicalId(
            "CfStorageStackecrRepositoryWebBaseImageB4974E01",
        );

        cdk.Tags.of(this.ecrRepositoryWebBaseImage).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-ecr-repository-web-baseimage`,
        );
        cdk.Tags.of(this.ecrRepositoryWebBaseImage).add("ProvisionedBy", "AWS");
        cdk.Tags.of(this.ecrRepositoryWebBaseImage).add(
            "ProjectCode",
            "1234567890",
        );

        // ------------------------------------------------------------
        // Amazon ECR Repository for Application BaseImage Configuration
        // ------------------------------------------------------------
        this.ecrRepositoryAppBaseImage = new ecr.CfnRepository(
            this,
            "ecrRepositoryAppBaseImage",
            {
                repositoryName: "app-baseimage",
                imageTagMutability: "IMMUTABLE",
                imageScanningConfiguration: { scanOnPush: true },
                encryptionConfiguration: {
                    encryptionType: "KMS",
                    kmsKey: kmsProps.ecrKey.keyArn,
                },
                lifecyclePolicy: { lifecyclePolicyText },
            },
        );

        this.ecrRepositoryAppBaseImage.applyRemovalPolicy(
            cdk.RemovalPolicy.RETAIN,
        );

        this.ecrRepositoryAppBaseImage.overrideLogicalId(
            "CfStorageStackecrRepositoryAppBaseImageEF26B016",
        );

        cdk.Tags.of(this.ecrRepositoryAppBaseImage).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-ecr-repository-app-baseimage`,
        );
        cdk.Tags.of(this.ecrRepositoryAppBaseImage).add("ProvisionedBy", "AWS");
        cdk.Tags.of(this.ecrRepositoryAppBaseImage).add(
            "ProjectCode",
            "1234567890",
        );

        // ------------------------------------------------------------
        // Amazon ECR Repository for Web Configuration
        // ------------------------------------------------------------
        this.ecrRepositoryWeb = new ecr.CfnRepository(
            this,
            "ecrRepositoryWeb",
            {
                repositoryName: "web",
                imageTagMutability: "IMMUTABLE",
                imageScanningConfiguration: { scanOnPush: true },
                encryptionConfiguration: {
                    encryptionType: "KMS",
                    kmsKey: kmsProps.ecrKey.keyArn,
                },
                lifecyclePolicy: { lifecyclePolicyText },
            },
        );

        this.ecrRepositoryWeb.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);

        this.ecrRepositoryWeb.overrideLogicalId(
            "CfStorageStackecrRepositoryWebB412D58E",
        );

        cdk.Tags.of(this.ecrRepositoryWeb).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-ecr-repository-web`,
        );
        cdk.Tags.of(this.ecrRepositoryWeb).add("ProvisionedBy", "AWS");
        cdk.Tags.of(this.ecrRepositoryWeb).add("ProjectCode", "1234567890");

        // ------------------------------------------------------------
        // Amazon ECR Repository for Application Configuration
        // ------------------------------------------------------------
        this.ecrRepositoryApp = new ecr.CfnRepository(
            this,
            "ecrRepositoryApp",
            {
                repositoryName: "app",
                imageTagMutability: "IMMUTABLE",
                imageScanningConfiguration: { scanOnPush: true },
                encryptionConfiguration: {
                    encryptionType: "KMS",
                    kmsKey: kmsProps.ecrKey.keyArn,
                },
                lifecyclePolicy: { lifecyclePolicyText },
            },
        );

        this.ecrRepositoryApp.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);

        this.ecrRepositoryApp.overrideLogicalId(
            "CfStorageStackecrRepositoryApp23FE683C",
        );

        cdk.Tags.of(this.ecrRepositoryApp).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-ecr-repository-app`,
        );
        cdk.Tags.of(this.ecrRepositoryApp).add("ProvisionedBy", "AWS");
        cdk.Tags.of(this.ecrRepositoryApp).add("ProjectCode", "1234567890");

        // ------------------------------------------------------------
        // Amazon S3 Bucket for ALB Logs Configuration
        // ------------------------------------------------------------
        this.s3BucketAlbLogs = new s3.Bucket(this, "s3BucketAlbLogs", {
            bucketName: `${commonProps.projectName}-${envProps.envName}-alb-logs`,
            versioned: true,
            accessControl: s3.BucketAccessControl.PRIVATE,
            encryptionKey: kmsProps.s3Key,
            encryption: s3.BucketEncryption.KMS,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            enforceSSL: true,
            blockedEncryptionTypes: [s3.BlockedEncryptionType.SSE_C],
        });

        cdk.Tags.of(this.s3BucketAlbLogs).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-s3-bucket-alb-logs`,
        );
        cdk.Tags.of(this.s3BucketAlbLogs).add("ProvisionedBy", "AWS");
        cdk.Tags.of(this.s3BucketAlbLogs).add("ProjectCode", "1234567890");

        // ------------------------------------------------------------
        // Amazon S3 Bucket for Amazon ECS Logs Configuration
        // ------------------------------------------------------------
        this.s3BucketEcsLogs = new s3.Bucket(this, "s3BucketEcsLogs", {
            bucketName: `${commonProps.projectName}-${envProps.envName}-ecs-logs`,
            versioned: true,
            accessControl: s3.BucketAccessControl.PRIVATE,
            encryptionKey: kmsProps.s3Key,
            encryption: s3.BucketEncryption.KMS,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            enforceSSL: true,
            blockedEncryptionTypes: [s3.BlockedEncryptionType.SSE_C],
        });

        cdk.Tags.of(this.s3BucketEcsLogs).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-s3-bucket-ecs-logs`,
        );
        cdk.Tags.of(this.s3BucketEcsLogs).add("ProvisionedBy", "AWS");
        cdk.Tags.of(this.s3BucketEcsLogs).add("ProjectCode", "1234567890");

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
            bucketName: `${commonProps.projectName}-${envProps.envName}-ec2-logs`,
            versioned: true,
            accessControl: s3.BucketAccessControl.PRIVATE,
            encryptionKey: kmsProps.s3Key,
            encryption: s3.BucketEncryption.KMS,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            enforceSSL: true,
            blockedEncryptionTypes: [s3.BlockedEncryptionType.SSE_C],
        });

        cdk.Tags.of(this.s3BucketEc2Logs).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-s3-bucket-ec2-logs`,
        );
        cdk.Tags.of(this.s3BucketEc2Logs).add("ProvisionedBy", "AWS");
        cdk.Tags.of(this.s3BucketEc2Logs).add("ProjectCode", "1234567890");

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
            bucketName: `${commonProps.projectName}-${envProps.envName}-lambda-logs`,
            versioned: true,
            accessControl: s3.BucketAccessControl.PRIVATE,
            encryptionKey: kmsProps.s3Key,
            encryption: s3.BucketEncryption.KMS,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            enforceSSL: true,
            blockedEncryptionTypes: [s3.BlockedEncryptionType.SSE_C],
        });

        cdk.Tags.of(this.s3BucketLambdaLogs).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-s3-bucket-lambda-logs`,
        );
        cdk.Tags.of(this.s3BucketLambdaLogs).add("ProvisionedBy", "AWS");
        cdk.Tags.of(this.s3BucketLambdaLogs).add("ProjectCode", "1234567890");

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
            bucketName: `${commonProps.projectName}-${envProps.envName}-aurora-logs`,
            versioned: true,
            accessControl: s3.BucketAccessControl.PRIVATE,
            encryptionKey: kmsProps.s3Key,
            encryption: s3.BucketEncryption.KMS,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            enforceSSL: true,
            blockedEncryptionTypes: [s3.BlockedEncryptionType.SSE_C],
        });

        cdk.Tags.of(this.s3BucketAuroraLogs).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-s3-bucket-aurora-logs`,
        );
        cdk.Tags.of(this.s3BucketAuroraLogs).add("ProvisionedBy", "AWS");
        cdk.Tags.of(this.s3BucketAuroraLogs).add("ProjectCode", "1234567890");

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
                bucketName: `${commonProps.projectName}-${envProps.envName}-elasticache-logs`,
                versioned: true,
                accessControl: s3.BucketAccessControl.PRIVATE,
                encryptionKey: kmsProps.s3Key,
                encryption: s3.BucketEncryption.KMS,
                blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
                removalPolicy: cdk.RemovalPolicy.RETAIN,
                enforceSSL: true,
                blockedEncryptionTypes: [s3.BlockedEncryptionType.SSE_C],
            },
        );

        cdk.Tags.of(this.s3BucketElastiCacheLogs).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-s3-bucket-elasticache-logs`,
        );
        cdk.Tags.of(this.s3BucketElastiCacheLogs).add("ProvisionedBy", "AWS");
        cdk.Tags.of(this.s3BucketElastiCacheLogs).add(
            "ProjectCode",
            "1234567890",
        );

        // ------------------------------------------------------------
        // Amazon S3 Bucket for Amazon SNS Logs Configuration
        // ------------------------------------------------------------
        this.s3BucketSnsLogs = new s3.Bucket(this, "s3BucketSnsLogs", {
            bucketName: `${commonProps.projectName}-${envProps.envName}-sns-logs`,
            versioned: true,
            accessControl: s3.BucketAccessControl.PRIVATE,
            encryptionKey: kmsProps.s3Key,
            encryption: s3.BucketEncryption.KMS,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            enforceSSL: true,
            blockedEncryptionTypes: [s3.BlockedEncryptionType.SSE_C],
        });

        cdk.Tags.of(this.s3BucketSnsLogs).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-s3-bucket-sns-logs`,
        );
        cdk.Tags.of(this.s3BucketSnsLogs).add("ProvisionedBy", "AWS");
        cdk.Tags.of(this.s3BucketSnsLogs).add("ProjectCode", "1234567890");

        // ------------------------------------------------------------
        // Amazon S3 Bucket for Assets Configuration
        // ------------------------------------------------------------
        this.s3BucketAssets = new s3.Bucket(this, "s3BucketAssets", {
            bucketName: `${commonProps.projectName}-${envProps.envName}-assets`,
            versioned: true,
            accessControl: s3.BucketAccessControl.PRIVATE,
            encryptionKey: kmsProps.s3Key,
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
                        `https://${envProps.envName}.${commonProps.nakedDomainName}`,
                    ],
                    allowedHeaders: ["*"],
                    maxAge: 3600, // Cache for 1 hour
                },
            ],
        });

        cdk.Tags.of(this.s3BucketAssets).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-s3-bucket-assets`,
        );
        cdk.Tags.of(this.s3BucketAssets).add("ProvisionedBy", "AWS");
        cdk.Tags.of(this.s3BucketAssets).add("ProjectCode", "1234567890");

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
