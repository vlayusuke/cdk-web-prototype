import * as cdk from "aws-cdk-lib";
import {
    aws_iam as iam,
    aws_kms as kms,
    aws_secretsmanager as secretsmanager,
} from "aws-cdk-lib";
import { Construct } from "constructs";

export interface commonProps {
    projectName: string;
    envName: string;
}

export interface pocProps {
    vpcCidr: string;
    defaultGatewayCidr: string;
}

// ------------------------------------------------------------
// [01] - Security Configuration Stack
// ------------------------------------------------------------
export class cfSecurityConfigStack extends Construct {
    public readonly applicationKey: kms.IKey;
    public readonly bastionKey: kms.IKey;
    public readonly s3Key: kms.IKey;
    public readonly ecrKey: kms.IKey;
    public readonly auroraKey: kms.IKey;
    public readonly elasticacheKey: kms.IKey;
    public readonly ebsKey: kms.IKey;
    public readonly lambdaKey: kms.IKey;
    public readonly eventBridgeKey: kms.IKey;
    public readonly snsKey: kms.IKey;
    public readonly postgresqlSecret: secretsmanager.ISecret;

    constructor(scope: Construct, id: string, props: commonProps) {
        super(scope, id);

        // ------------------------------------------------------------
        // AWS KMS Key for application encryption Configuration
        // ------------------------------------------------------------
        this.applicationKey = new kms.Key(this, "applicationKey", {
            description: "KMS key for application encryption",
            enableKeyRotation: true,
            keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
            pendingWindow: cdk.Duration.days(7),
        });

        cdk.Tags.of(this.applicationKey).add(
            "Name",
            `${props.projectName}-${props.envName}-kms-application-key`,
        );
        cdk.Tags.of(this.applicationKey).add("ProvisionedBy", "AWS");

        this.bastionKey = new kms.Key(this, "bastionKey", {
            description: "KMS key for bastion and administration access",
            enableKeyRotation: true,
            keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
            pendingWindow: cdk.Duration.days(7),
        });

        cdk.Tags.of(this.bastionKey).add(
            "Name",
            `${props.projectName}-${props.envName}-kms-bastion-key`,
        );
        cdk.Tags.of(this.bastionKey).add("ProvisionedBy", "AWS");

        // AWS KMS Key policy for application encryption
        const kmsApplicationKeyPolicy = new iam.PolicyStatement({
            sid: "ApplicationKMS",
            effect: iam.Effect.ALLOW,
            actions: [
                "kms:Encrypt",
                "kms:Decrypt",
                "kms:GenerateDataKey",
                "kms:DescribeKey",
            ],
            resources: [this.applicationKey.keyArn],
            principals: [
                new iam.ServicePrincipal("ecs.amazonaws.com"),
                new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
                new iam.ServicePrincipal("ec2.amazonaws.com"),
                new iam.ServicePrincipal("secretsmanager.amazonaws.com"),
            ],
        });

        const kmsBastionKeyPolicy = new iam.PolicyStatement({
            sid: "BastionKMS",
            effect: iam.Effect.ALLOW,
            actions: [
                "kms:Encrypt",
                "kms:Decrypt",
                "kms:GenerateDataKey",
                "kms:DescribeKey",
            ],
            resources: [this.bastionKey.keyArn],
            principals: [new iam.ServicePrincipal("ec2.amazonaws.com")],
        });

        const kmsAccountAccessPolicy = new iam.PolicyStatement({
            sid: "AllowAccountAccess",
            effect: iam.Effect.ALLOW,
            actions: ["kms:*"],
            resources: [this.applicationKey.keyArn],
            principals: [new iam.AccountRootPrincipal()],
        });

        this.applicationKey.addToResourcePolicy(kmsApplicationKeyPolicy);
        this.applicationKey.addToResourcePolicy(kmsAccountAccessPolicy);
        this.bastionKey.addToResourcePolicy(kmsBastionKeyPolicy);
        this.bastionKey.addToResourcePolicy(kmsAccountAccessPolicy);

        // ------------------------------------------------------------
        // AWS KMS Key for Amazon ECR encryption Configuration
        // ------------------------------------------------------------
        this.ecrKey = new kms.Key(this, "ECRKey", {
            description: "KMS key for ECR encryption",
            enableKeyRotation: true,
            keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
            pendingWindow: cdk.Duration.days(7),
        });

        cdk.Tags.of(this.ecrKey).add(
            "Name",
            `${props.projectName}-${props.envName}-kms-ecr-key`,
        );
        cdk.Tags.of(this.ecrKey).add("ProvisionedBy", "AWS");

        // AWS KMS Key policy for Amazon ECR encryption
        const kmsEcrKeyPolicy = new iam.PolicyStatement({
            sid: "ECRKMS",
            effect: iam.Effect.ALLOW,
            actions: [
                "kms:Encrypt",
                "kms:Decrypt",
                "kms:GenerateDataKey",
                "kms:DescribeKey",
            ],
            resources: [this.ecrKey.keyArn],
            principals: [new iam.ServicePrincipal("ecr.amazonaws.com")],
        });

        const kmsAccountEcrAccessPolicy = new iam.PolicyStatement({
            sid: "AllowAccountECRAccess",
            effect: iam.Effect.ALLOW,
            actions: ["kms:*"],
            resources: [this.ecrKey.keyArn],
            principals: [new iam.AccountRootPrincipal()],
        });

        this.ecrKey.addToResourcePolicy(kmsEcrKeyPolicy);
        this.ecrKey.addToResourcePolicy(kmsAccountEcrAccessPolicy);

        // ------------------------------------------------------------
        // AWS KMS Key for Amazon Aurora encryption Configuration
        // ------------------------------------------------------------
        this.auroraKey = new kms.Key(this, "AuroraKey", {
            description: "KMS key for Aurora encryption",
            enableKeyRotation: true,
            keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
            pendingWindow: cdk.Duration.days(7),
        });

        cdk.Tags.of(this.auroraKey).add(
            "Name",
            `${props.projectName}-${props.envName}-kms-aurora-key`,
        );
        cdk.Tags.of(this.auroraKey).add("ProvisionedBy", "AWS");

        // AWS KMS Key policy for Amazon Aurora encryption
        const kmsAuroraKeyPolicy = new iam.PolicyStatement({
            sid: "AuroraKMS",
            effect: iam.Effect.ALLOW,
            actions: [
                "kms:Encrypt",
                "kms:Decrypt",
                "kms:GenerateDataKey",
                "kms:DescribeKey",
            ],
            resources: [this.auroraKey.keyArn],
            principals: [new iam.ServicePrincipal("rds.amazonaws.com")],
        });

        const kmsAccountAuroraAccessPolicy = new iam.PolicyStatement({
            sid: "AllowAccountAuroraAccess",
            effect: iam.Effect.ALLOW,
            actions: ["kms:*"],
            resources: [this.auroraKey.keyArn],
            principals: [new iam.AccountRootPrincipal()],
        });

        this.auroraKey.addToResourcePolicy(kmsAuroraKeyPolicy);
        this.auroraKey.addToResourcePolicy(kmsAccountAuroraAccessPolicy);

        // ------------------------------------------------------------
        // AWS KMS Key for Amazon ElastiCache encryption Configuration
        // ------------------------------------------------------------
        this.elasticacheKey = new kms.Key(this, "ElasticacheKey", {
            description: "KMS key for ElastiCache encryption",
            enableKeyRotation: true,
            keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
            pendingWindow: cdk.Duration.days(7),
        });

        cdk.Tags.of(this.elasticacheKey).add(
            "Name",
            `${props.projectName}-${props.envName}-kms-elasticache-key`,
        );
        cdk.Tags.of(this.elasticacheKey).add("ProvisionedBy", "AWS");

        // AWS KMS Key policy for Amazon ElastiCache encryption
        const kmsElasticacheKeyPolicy = new iam.PolicyStatement({
            sid: "ElasticacheKMS",
            effect: iam.Effect.ALLOW,
            actions: [
                "kms:Encrypt",
                "kms:Decrypt",
                "kms:GenerateDataKey",
                "kms:DescribeKey",
            ],
            resources: [this.elasticacheKey.keyArn],
            principals: [new iam.ServicePrincipal("elasticache.amazonaws.com")],
        });

        const kmsAccountElasticacheAccessPolicy = new iam.PolicyStatement({
            sid: "AllowAccountElasticacheAccess",
            effect: iam.Effect.ALLOW,
            actions: ["kms:*"],
            resources: [this.elasticacheKey.keyArn],
            principals: [new iam.AccountRootPrincipal()],
        });

        this.elasticacheKey.addToResourcePolicy(kmsElasticacheKeyPolicy);
        this.elasticacheKey.addToResourcePolicy(
            kmsAccountElasticacheAccessPolicy,
        );

        // ------------------------------------------------------------
        // AWS KMS Key for Amazon S3 encryption Configuration
        // ------------------------------------------------------------
        this.s3Key = new kms.Key(this, "S3Key", {
            description: "KMS key for S3 encryption",
            enableKeyRotation: true,
            keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
            pendingWindow: cdk.Duration.days(7),
        });

        cdk.Tags.of(this.s3Key).add(
            "Name",
            `${props.projectName}-${props.envName}-kms-s3-key`,
        );
        cdk.Tags.of(this.s3Key).add("ProvisionedBy", "AWS");

        // AWS KMS Key policy for Amazon S3 encryption
        const kmsS3KeyPolicy = new iam.PolicyStatement({
            sid: "S3KMS",
            effect: iam.Effect.ALLOW,
            actions: [
                "kms:Encrypt",
                "kms:Decrypt",
                "kms:GenerateDataKey",
                "kms:DescribeKey",
            ],
            resources: [this.s3Key.keyArn],
            principals: [new iam.ServicePrincipal("s3.amazonaws.com")],
        });

        const kmsAccountS3AccessPolicy = new iam.PolicyStatement({
            sid: "AllowAccountS3Access",
            effect: iam.Effect.ALLOW,
            actions: ["kms:*"],
            resources: [this.s3Key.keyArn],
            principals: [new iam.AccountRootPrincipal()],
        });

        this.s3Key.addToResourcePolicy(kmsS3KeyPolicy);
        this.s3Key.addToResourcePolicy(kmsAccountS3AccessPolicy);

        // ------------------------------------------------------------
        // AWS KMS Key for Amazon EBS encryption Configuration
        // ------------------------------------------------------------
        this.ebsKey = new kms.Key(this, "EBSKey", {
            description: "KMS key for EBS encryption",
            enableKeyRotation: true,
            keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
            pendingWindow: cdk.Duration.days(7),
        });

        cdk.Tags.of(this.ebsKey).add(
            "Name",
            `${props.projectName}-${props.envName}-kms-ebs-key`,
        );
        cdk.Tags.of(this.ebsKey).add("ProvisionedBy", "AWS");

        // AWS KMS Key policy for Amazon EBS encryption
        const kmsEbsKeyPolicy = new iam.PolicyStatement({
            sid: "EBSKMS",
            effect: iam.Effect.ALLOW,
            actions: [
                "kms:Encrypt",
                "kms:Decrypt",
                "kms:GenerateDataKey",
                "kms:DescribeKey",
            ],
            resources: [this.ebsKey.keyArn],
            principals: [new iam.ServicePrincipal("ec2.amazonaws.com")],
        });

        const kmsAccountEbsAccessPolicy = new iam.PolicyStatement({
            sid: "AllowAccountEbsAccess",
            effect: iam.Effect.ALLOW,
            actions: ["kms:*"],
            resources: [this.ebsKey.keyArn],
            principals: [new iam.AccountRootPrincipal()],
        });

        this.ebsKey.addToResourcePolicy(kmsEbsKeyPolicy);
        this.ebsKey.addToResourcePolicy(kmsAccountEbsAccessPolicy);

        // ------------------------------------------------------------
        // AWS KMS Key for AWS Lambda encryption Configuration
        // ------------------------------------------------------------
        this.lambdaKey = new kms.Key(this, "LambdaKey", {
            description: "KMS key for Lambda encryption",
            enableKeyRotation: true,
            keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
            pendingWindow: cdk.Duration.days(7),
        });

        cdk.Tags.of(this.lambdaKey).add(
            "Name",
            `${props.projectName}-${props.envName}-kms-lambda-key`,
        );
        cdk.Tags.of(this.lambdaKey).add("ProvisionedBy", "AWS");

        // AWS KMS Key policy for AWS Lambda encryption
        const kmsLambdaKeyPolicy = new iam.PolicyStatement({
            sid: "LambdaKMS",
            effect: iam.Effect.ALLOW,
            actions: [
                "kms:Encrypt",
                "kms:Decrypt",
                "kms:GenerateDataKey",
                "kms:DescribeKey",
            ],
            resources: [this.lambdaKey.keyArn],
            principals: [new iam.ServicePrincipal("lambda.amazonaws.com")],
        });

        const kmsAccountLambdaAccessPolicy = new iam.PolicyStatement({
            sid: "AllowAccountLambdaAccess",
            effect: iam.Effect.ALLOW,
            actions: ["kms:*"],
            resources: [this.lambdaKey.keyArn],
            principals: [new iam.AccountRootPrincipal()],
        });

        this.lambdaKey.addToResourcePolicy(kmsLambdaKeyPolicy);
        this.lambdaKey.addToResourcePolicy(kmsAccountLambdaAccessPolicy);

        // ------------------------------------------------------------
        // AWS KMS Key for Amazon EventBridge Configuration
        // ------------------------------------------------------------
        this.eventBridgeKey = new kms.Key(this, "EventBridgeKey", {
            description: "KMS key for Amazon EventBridge encryption",
            enableKeyRotation: true,
            keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
            pendingWindow: cdk.Duration.days(7),
        });

        cdk.Tags.of(this.eventBridgeKey).add(
            "Name",
            `${props.projectName}-${props.envName}-kms-event-bridge-key`,
        );
        cdk.Tags.of(this.eventBridgeKey).add("ProvisionedBy", "AWS");

        // AWS KMS Key policy for Amazon EventBridge encryption
        const kmsEventBridgeKeyPolicy = new iam.PolicyStatement({
            sid: "EventBridgeKMS",
            effect: iam.Effect.ALLOW,
            actions: [
                "kms:Encrypt",
                "kms:Decrypt",
                "kms:GenerateDataKey",
                "kms:DescribeKey",
            ],
            resources: [this.eventBridgeKey.keyArn],
            principals: [new iam.ServicePrincipal("events.amazonaws.com")],
        });

        const kmsAccountEventBridgeAccessPolicy = new iam.PolicyStatement({
            sid: "AllowAccountEventBridgeAccess",
            effect: iam.Effect.ALLOW,
            actions: ["kms:*"],
            resources: [this.eventBridgeKey.keyArn],
            principals: [new iam.AccountRootPrincipal()],
        });

        this.eventBridgeKey.addToResourcePolicy(kmsEventBridgeKeyPolicy);
        this.eventBridgeKey.addToResourcePolicy(
            kmsAccountEventBridgeAccessPolicy,
        );

        // ------------------------------------------------------------
        // AWS KMS Key for Amazon SNS Configuration
        // ------------------------------------------------------------
        this.snsKey = new kms.Key(this, "SnsKey", {
            description: "KMS key for Amazon SNS encryption",
            enableKeyRotation: true,
            keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
            pendingWindow: cdk.Duration.days(7),
        });

        cdk.Tags.of(this.snsKey).add(
            "Name",
            `${props.projectName}-${props.envName}-kms-sns-key`,
        );
        cdk.Tags.of(this.snsKey).add("ProvisionedBy", "AWS");

        // AWS KMS Key policy for Amazon SNS encryption
        const kmsSnsKeyPolicy = new iam.PolicyStatement({
            sid: "SnsKMS",
            effect: iam.Effect.ALLOW,
            actions: [
                "kms:Encrypt",
                "kms:Decrypt",
                "kms:GenerateDataKey",
                "kms:DescribeKey",
            ],
            resources: [this.snsKey.keyArn],
            principals: [new iam.ServicePrincipal("sns.amazonaws.com")],
        });

        const kmsAccountSnsAccessPolicy = new iam.PolicyStatement({
            sid: "AllowAccountSnsAccess",
            effect: iam.Effect.ALLOW,
            actions: ["kms:*"],
            resources: [this.snsKey.keyArn],
            principals: [new iam.AccountRootPrincipal()],
        });

        this.snsKey.addToResourcePolicy(kmsSnsKeyPolicy);
        this.snsKey.addToResourcePolicy(kmsAccountSnsAccessPolicy);

        // ------------------------------------------------------------
        // AWS Secrets Manager for PostgreSQL Credentials
        // ------------------------------------------------------------
        const postgresqlUsername = new cdk.CfnParameter(
            this,
            "PostgreSQLUsername",
            {
                type: "String",
                noEcho: true,
            },
        );

        const postgresqlPassword = new cdk.CfnParameter(
            this,
            "PostgreSQLPassword",
            {
                type: "String",
                noEcho: true,
            },
        );

        this.postgresqlSecret = new secretsmanager.Secret(
            this,
            "PostgreSQLSecret",
            {
                description: "Secret for PostgreSQL credentials",
                encryptionKey: this.applicationKey,
                secretObjectValue: {
                    username: cdk.SecretValue.cfnParameter(postgresqlUsername),
                    password: cdk.SecretValue.cfnParameter(postgresqlPassword),
                },
            },
        );

        cdk.Tags.of(this.postgresqlSecret).add(
            "Name",
            `${props.projectName}-${props.envName}-smg-postgresql-secret`,
        );
        cdk.Tags.of(this.postgresqlSecret).add("ProvisionedBy", "AWS");
    }
}
