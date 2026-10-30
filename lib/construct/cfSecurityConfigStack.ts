import * as cdk from "aws-cdk-lib";
import {
    aws_kms as kms,
    aws_secretsmanager as secretsmanager,
} from "aws-cdk-lib";
import { Construct } from "constructs";

export interface CommonProps {
    projectName: string;
    dashboardName: string;
}

export interface EnvProps {
    envName: string;
    vpcCidr: string;
    defaultGatewayCidr: string;
}

// ************************************************************
// [01] - Security Configuration Stack
// ************************************************************
export class CfSecurityConfigStack extends Construct {
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
    public readonly codeCommitKey: kms.IKey;
    public readonly postgresqlSecret: secretsmanager.CfnSecret;

    constructor(
        scope: Construct,
        id: string,
        commonProps: CommonProps,
        envProps: EnvProps,
    ) {
        super(scope, id);

        const prefix = `${commonProps.projectName}-${envProps.envName}`;
        const stack = cdk.Stack.of(this);

        const accountRoot = {
            AWS: `arn:${stack.partition}:iam::${stack.account}:root`,
        };

        const keyActions = [
            "kms:Encrypt",
            "kms:Decrypt",
            "kms:GenerateDataKey",
            "kms:DescribeKey",
        ];

        // ------------------------------------------------------------
        // Helper function to create KMS keys with a consistent policy and tags
        // ------------------------------------------------------------
        const createKey = (
            keyId: string,
            nameSuffix: string,
            description: string,
            servicePrincipals: string[],
            sids: { service: string; account: string },
        ): kms.IKey => {
            const wrapper = new Construct(this, keyId);

            const cfnKey = new kms.CfnKey(wrapper, "Resource", {
                description,
                enableKeyRotation: true,
                keyUsage: "ENCRYPT_DECRYPT",
                pendingWindowInDays: 7,
                keyPolicy: {
                    Version: "2012-10-17",
                    Statement: [
                        {
                            Sid: sids.service,
                            Effect: "Allow",
                            Principal: { Service: servicePrincipals },
                            Action: keyActions,
                            Resource: "*",
                        },
                        {
                            Sid: sids.account,
                            Effect: "Allow",
                            Principal: accountRoot,
                            Action: "kms:*",
                            Resource: "*",
                        },
                    ],
                },
            });

            cfnKey.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);

            cdk.Tags.of(wrapper).add("Name", `${prefix}-kms-${nameSuffix}`);
            cdk.Tags.of(wrapper).add("ProvisionedBy", "AWS");
            cdk.Tags.of(wrapper).add("ProjectCode", "1234567890");

            return kms.Key.fromCfnKey(cfnKey);
        };

        // ------------------------------------------------------------
        // AWS KMS Keys Configuration
        // ------------------------------------------------------------
        this.applicationKey = createKey(
            "applicationKey",
            "application-key",
            "KMS key for application encryption",
            [
                "ecs.amazonaws.com",
                "ecs-tasks.amazonaws.com",
                "ec2.amazonaws.com",
                "secretsmanager.amazonaws.com",
            ],
            { service: "ApplicationKMS", account: "AllowAccountAccess" },
        );

        this.bastionKey = createKey(
            "bastionKey",
            "bastion-key",
            "KMS key for bastion and administration access",
            ["ec2.amazonaws.com"],
            { service: "BastionKMS", account: "AllowAccountAccess" },
        );

        this.ecrKey = createKey(
            "ECRKey",
            "ecr-key",
            "KMS key for ECR encryption",
            ["ecr.amazonaws.com"],
            { service: "ECRKMS", account: "AllowAccountECRAccess" },
        );

        this.auroraKey = createKey(
            "AuroraKey",
            "aurora-key",
            "KMS key for Aurora encryption",
            ["rds.amazonaws.com"],
            { service: "AuroraKMS", account: "AllowAccountAuroraAccess" },
        );

        this.elasticacheKey = createKey(
            "ElasticacheKey",
            "elasticache-key",
            "KMS key for ElastiCache encryption",
            ["elasticache.amazonaws.com"],
            {
                service: "ElasticacheKMS",
                account: "AllowAccountElasticacheAccess",
            },
        );

        this.s3Key = createKey(
            "S3Key",
            "s3-key",
            "KMS key for S3 encryption",
            ["s3.amazonaws.com"],
            { service: "S3KMS", account: "AllowAccountS3Access" },
        );

        this.ebsKey = createKey(
            "EBSKey",
            "ebs-key",
            "KMS key for EBS encryption",
            ["ec2.amazonaws.com"],
            { service: "EBSKMS", account: "AllowAccountEbsAccess" },
        );

        this.lambdaKey = createKey(
            "LambdaKey",
            "lambda-key",
            "KMS key for Lambda encryption",
            ["lambda.amazonaws.com"],
            { service: "LambdaKMS", account: "AllowAccountLambdaAccess" },
        );

        this.eventBridgeKey = createKey(
            "EventBridgeKey",
            "event-bridge-key",
            "KMS key for Amazon EventBridge encryption",
            ["events.amazonaws.com"],
            {
                service: "EventBridgeKMS",
                account: "AllowAccountEventBridgeAccess",
            },
        );

        this.snsKey = createKey(
            "SnsKey",
            "sns-key",
            "KMS key for Amazon SNS encryption",
            ["sns.amazonaws.com"],
            { service: "SnsKMS", account: "AllowAccountSnsAccess" },
        );

        this.codeCommitKey = createKey(
            "CodeCommitKey",
            "codecommit-key",
            "KMS key for AWS CodeCommit encryption",
            ["codecommit.amazonaws.com"],
            {
                service: "CodeCommitKMS",
                account: "AllowAccountCodeCommitAccess",
            },
        );

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

        const postgresqlSecretScope = new Construct(this, "PostgreSQLSecret");

        this.postgresqlSecret = new secretsmanager.CfnSecret(
            postgresqlSecretScope,
            "Resource",
            {
                description: "Secret for PostgreSQL credentials",
                kmsKeyId: this.applicationKey.keyArn,
                secretString: stack.toJsonString({
                    username: postgresqlUsername.valueAsString,
                    password: postgresqlPassword.valueAsString,
                }),
            },
        );

        cdk.Tags.of(postgresqlSecretScope).add(
            "Name",
            `${prefix}-smg-postgresql-secret`,
        );
        cdk.Tags.of(postgresqlSecretScope).add("ProvisionedBy", "AWS");
        cdk.Tags.of(postgresqlSecretScope).add("ProjectCode", "1234567890");
    }
}
