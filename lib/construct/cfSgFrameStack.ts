import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
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

export interface NetworkProps {
    vpc: ec2.IVpc;
}

// ------------------------------------------------------------
// [03] - Security group Frame Stack
// ------------------------------------------------------------
export class CfSgFrameStack extends Construct {
    public readonly vpc: ec2.IVpc;
    public readonly albSecurityGroupFrame: ec2.SecurityGroup;
    public readonly batchSecurityGroupFrame: ec2.SecurityGroup;
    public readonly bastionSecurityGroupFrame: ec2.SecurityGroup;
    public readonly ecsSecurityGroupFrame: ec2.SecurityGroup;
    public readonly elasticacheSecurityGroupFrame: ec2.SecurityGroup;
    public readonly auroraSecurityGroupFrame: ec2.SecurityGroup;
    public readonly lambdaSecurityGroupFrame: ec2.SecurityGroup;
    public readonly vpcEndPointS3SecurityGroupFrame: ec2.SecurityGroup;
    public readonly vpcEndPointECRSecurityGroupFrame: ec2.SecurityGroup;
    public readonly vpcEndPointSSMSecurityGroupFrame: ec2.SecurityGroup;
    public readonly vpcEndPointKMSSecurityGroupFrame: ec2.SecurityGroup;
    public readonly vpcEndPointCloudWatchLogsSecurityGroupFrame: ec2.SecurityGroup;

    constructor(
        scope: Construct,
        id: string,
        networkProps: NetworkProps,
        commonProps: CommonProps,
        envProps: EnvProps,
    ) {
        super(scope, id);

        this.vpc = networkProps.vpc;

        // ------------------------------------------------------------
        // Security group for ALB Configuration (Frame Only)
        // ------------------------------------------------------------
        this.albSecurityGroupFrame = new ec2.SecurityGroup(
            this,
            "AlbSecurityGroupFrame",
            {
                vpc: this.vpc,
                description: `Security group for ALB - ${commonProps.projectName}-${envProps.envName}`,
                securityGroupName: `${commonProps.projectName}-${envProps.envName}-sg-alb`,
                allowAllOutbound: false,
            },
        );

        cdk.Tags.of(this.albSecurityGroupFrame).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-sg-alb`,
        );
        cdk.Tags.of(this.albSecurityGroupFrame).add("ProvisionedBy", "AWS");

        // ------------------------------------------------------------
        // Security group for Amazon EC2 Bastion (Frame Only)
        // ------------------------------------------------------------
        this.bastionSecurityGroupFrame = new ec2.SecurityGroup(
            this,
            "BastionSecurityGroupFrame",
            {
                vpc: this.vpc,
                description: `Security group for Amazon EC2 Bastion - ${commonProps.projectName}-${envProps.envName}`,
                securityGroupName: `${commonProps.projectName}-${envProps.envName}-sg-bastion`,
                allowAllOutbound: false,
            },
        );

        cdk.Tags.of(this.bastionSecurityGroupFrame).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-sg-bastion`,
        );
        cdk.Tags.of(this.bastionSecurityGroupFrame).add("ProvisionedBy", "AWS");

        // ------------------------------------------------------------
        // Security group for Amazon EC2 Batch (Frame Only)
        // ------------------------------------------------------------
        this.batchSecurityGroupFrame = new ec2.SecurityGroup(
            this,
            "BatchSecurityGroupFrame",
            {
                vpc: this.vpc,
                description: `Security group for Amazon EC2 Batch - ${commonProps.projectName}-${envProps.envName}`,
                securityGroupName: `${commonProps.projectName}-${envProps.envName}-sg-batch`,
                allowAllOutbound: false,
            },
        );

        cdk.Tags.of(this.batchSecurityGroupFrame).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-sg-batch`,
        );
        cdk.Tags.of(this.batchSecurityGroupFrame).add("ProvisionedBy", "AWS");

        // ------------------------------------------------------------
        // Security group for Amazon ECS (Frame Only)
        // ------------------------------------------------------------
        this.ecsSecurityGroupFrame = new ec2.SecurityGroup(
            this,
            "EcsSecurityGroupFrame",
            {
                vpc: this.vpc,
                description: `Security group for Amazon ECS - ${commonProps.projectName}-${envProps.envName}`,
                securityGroupName: `${commonProps.projectName}-${envProps.envName}-sg-ecs`,
                allowAllOutbound: false,
            },
        );

        cdk.Tags.of(this.ecsSecurityGroupFrame).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-sg-ecs`,
        );
        cdk.Tags.of(this.ecsSecurityGroupFrame).add("ProvisionedBy", "AWS");

        // ------------------------------------------------------------
        // Security group for Amazon Aurora (Frame Only)
        // ------------------------------------------------------------
        this.auroraSecurityGroupFrame = new ec2.SecurityGroup(
            this,
            "AuroraSecurityGroupFrame",
            {
                vpc: this.vpc,
                description: `Security group for Amazon Aurora - ${commonProps.projectName}-${envProps.envName}`,
                securityGroupName: `${commonProps.projectName}-${envProps.envName}-sg-aurora`,
                allowAllOutbound: false,
            },
        );

        cdk.Tags.of(this.auroraSecurityGroupFrame).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-sg-aurora`,
        );
        cdk.Tags.of(this.auroraSecurityGroupFrame).add("ProvisionedBy", "AWS");

        // ------------------------------------------------------------
        // Security group for Amazon ElastiCache (Frame Only)
        // ------------------------------------------------------------
        this.elasticacheSecurityGroupFrame = new ec2.SecurityGroup(
            this,
            "ElasticacheSecurityGroupFrame",
            {
                vpc: this.vpc,
                description: `Security group for Amazon ElastiCache - ${commonProps.projectName}-${envProps.envName}`,
                securityGroupName: `${commonProps.projectName}-${envProps.envName}-sg-elasticache`,
                allowAllOutbound: false,
            },
        );

        cdk.Tags.of(this.elasticacheSecurityGroupFrame).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-sg-elasticache`,
        );
        cdk.Tags.of(this.elasticacheSecurityGroupFrame).add(
            "ProvisionedBy",
            "AWS",
        );

        // ------------------------------------------------------------
        // Security group for AWS Lambda (Frame Only)
        // ------------------------------------------------------------
        this.lambdaSecurityGroupFrame = new ec2.SecurityGroup(
            this,
            "LambdaSecurityGroupFrame",
            {
                vpc: this.vpc,
                description: `Security group for AWS Lambda - ${commonProps.projectName}-${envProps.envName}`,
                securityGroupName: `${commonProps.projectName}-${envProps.envName}-sg-lambda`,
                allowAllOutbound: false,
            },
        );

        cdk.Tags.of(this.lambdaSecurityGroupFrame).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-sg-lambda`,
        );
        cdk.Tags.of(this.lambdaSecurityGroupFrame).add("ProvisionedBy", "AWS");

        // ------------------------------------------------------------
        // Security group for VPC Endpoint of Amazon S3 Interface (Frame Only)
        // ------------------------------------------------------------
        this.vpcEndPointS3SecurityGroupFrame = new ec2.SecurityGroup(
            this,
            "vpcEndPointS3SecurityGroupFrame",
            {
                vpc: this.vpc,
                description: "Security group for Amazon S3",
                securityGroupName: `${commonProps.projectName}-${envProps.envName}-sg-vpc-endpoint-s3`,
                allowAllOutbound: false,
            },
        );

        cdk.Tags.of(this.vpcEndPointS3SecurityGroupFrame).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-sg-vpc-endpoint-s3`,
        );
        cdk.Tags.of(this.vpcEndPointS3SecurityGroupFrame).add(
            "ProvisionedBy",
            "AWS",
        );

        // ------------------------------------------------------------
        // Security group for VPC Endpoint of Amazon ECR Interface (Frame Only)
        // ------------------------------------------------------------
        this.vpcEndPointECRSecurityGroupFrame = new ec2.SecurityGroup(
            this,
            "vpcEndPointECRSecurityGroupFrame",
            {
                vpc: this.vpc,
                description: "Security group for Amazon ECR",
                securityGroupName: `${commonProps.projectName}-${envProps.envName}-sg-vpc-endpoint-ecr`,
                allowAllOutbound: false,
            },
        );

        cdk.Tags.of(this.vpcEndPointECRSecurityGroupFrame).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-sg-vpc-endpoint-ecr`,
        );
        cdk.Tags.of(this.vpcEndPointECRSecurityGroupFrame).add(
            "ProvisionedBy",
            "AWS",
        );

        // ------------------------------------------------------------
        // Security group for VPC Endpoint of AWS Systems Manager Interface (Frame Only)
        // ------------------------------------------------------------
        this.vpcEndPointSSMSecurityGroupFrame = new ec2.SecurityGroup(
            this,
            "vpcEndPointSSMSecurityGroupFrame",
            {
                vpc: this.vpc,
                description: "Security group for AWS Systems Manager",
                securityGroupName: `${commonProps.projectName}-${envProps.envName}-sg-vpc-endpoint-ssm`,
                allowAllOutbound: false,
            },
        );

        cdk.Tags.of(this.vpcEndPointSSMSecurityGroupFrame).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-sg-vpc-endpoint-ssm`,
        );
        cdk.Tags.of(this.vpcEndPointSSMSecurityGroupFrame).add(
            "ProvisionedBy",
            "AWS",
        );

        // ------------------------------------------------------------
        // Security group for VPC Endpoint of AWS KMS Interface (Frame Only)
        // ------------------------------------------------------------
        this.vpcEndPointKMSSecurityGroupFrame = new ec2.SecurityGroup(
            this,
            "vpcEndPointKMSSecurityGroupFrame",
            {
                vpc: this.vpc,
                description: "Security group for AWS KMS",
                securityGroupName: `${commonProps.projectName}-${envProps.envName}-sg-vpc-endpoint-kms`,
                allowAllOutbound: false,
            },
        );

        cdk.Tags.of(this.vpcEndPointKMSSecurityGroupFrame).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-sg-vpc-endpoint-kms`,
        );
        cdk.Tags.of(this.vpcEndPointKMSSecurityGroupFrame).add(
            "ProvisionedBy",
            "AWS",
        );

        // ------------------------------------------------------------
        // Security group for VPC Endpoint of Amazon CloudWatch Logs Interface (Frame Only)
        // ------------------------------------------------------------
        this.vpcEndPointCloudWatchLogsSecurityGroupFrame =
            new ec2.SecurityGroup(
                this,
                "vpcEndPointCloudWatchLogsSecurityGroupFrame",
                {
                    vpc: this.vpc,
                    description: "Security group for Amazon CloudWatch Logs",
                    securityGroupName: `${commonProps.projectName}-${envProps.envName}-sg-vpc-endpoint-cloudwatch-logs`,
                    allowAllOutbound: false,
                },
            );

        cdk.Tags.of(this.vpcEndPointCloudWatchLogsSecurityGroupFrame).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-sg-vpc-endpoint-cloudwatch-logs`,
        );
        cdk.Tags.of(this.vpcEndPointCloudWatchLogsSecurityGroupFrame).add(
            "ProvisionedBy",
            "AWS",
        );
    }
}
