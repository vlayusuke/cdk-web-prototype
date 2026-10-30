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

// ************************************************************
// [03] - Security group Frame Stack
// ************************************************************
export class CfSgFrameStack extends Construct {
    public readonly vpc: ec2.IVpc;
    public readonly albSecurityGroupFrame: ec2.ISecurityGroup;
    public readonly bastionSecurityGroupFrame: ec2.ISecurityGroup;
    public readonly batchSecurityGroupFrame: ec2.ISecurityGroup;
    public readonly ecsSecurityGroupFrame: ec2.ISecurityGroup;
    public readonly auroraSecurityGroupFrame: ec2.ISecurityGroup;
    public readonly elasticacheSecurityGroupFrame: ec2.ISecurityGroup;
    public readonly lambdaSecurityGroupFrame: ec2.ISecurityGroup;
    public readonly vpcEndPointS3SecurityGroupFrame: ec2.ISecurityGroup;
    public readonly vpcEndPointECRSecurityGroupFrame: ec2.ISecurityGroup;
    public readonly vpcEndPointSSMSecurityGroupFrame: ec2.ISecurityGroup;
    public readonly vpcEndPointKMSSecurityGroupFrame: ec2.ISecurityGroup;
    public readonly vpcEndPointCloudWatchLogsSecurityGroupFrame: ec2.ISecurityGroup;

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
        // Security Group Frame Creation
        // ------------------------------------------------------------
        const createSecurityGroup = (
            logicalId: string,
            description: string,
            suffix: string,
        ): ec2.ISecurityGroup => {
            const name = `${commonProps.projectName}-${envProps.envName}-sg-${suffix}`;
            const wrapper = new Construct(this, logicalId);

            const securityGroup = new ec2.CfnSecurityGroup(
                wrapper,
                "Resource",
                {
                    vpcId: this.vpc.vpcId,
                    groupDescription: description,
                    groupName: name,
                    securityGroupEgress: [
                        {
                            cidrIp: "255.255.255.255/32",
                            description: "Disallow all traffic",
                            ipProtocol: "icmp",
                            fromPort: 252,
                            toPort: 86,
                        },
                    ],
                },
            );

            cdk.Tags.of(wrapper).add("Name", name);
            cdk.Tags.of(wrapper).add("ProvisionedBy", "AWS");
            cdk.Tags.of(wrapper).add("ProjectCode", "1234567890");

            return ec2.SecurityGroup.fromSecurityGroupId(
                this,
                `${logicalId}Imported`,
                securityGroup.attrGroupId,
                { allowAllOutbound: false },
            );
        };

        this.albSecurityGroupFrame = createSecurityGroup(
            "AlbSecurityGroupFrame",
            `Security group for ALB - ${commonProps.projectName}-${envProps.envName}`,
            "alb",
        );

        this.bastionSecurityGroupFrame = createSecurityGroup(
            "BastionSecurityGroupFrame",
            `Security group for Amazon EC2 Bastion - ${commonProps.projectName}-${envProps.envName}`,
            "bastion",
        );

        this.batchSecurityGroupFrame = createSecurityGroup(
            "BatchSecurityGroupFrame",
            `Security group for Amazon EC2 Batch - ${commonProps.projectName}-${envProps.envName}`,
            "batch",
        );

        this.ecsSecurityGroupFrame = createSecurityGroup(
            "EcsSecurityGroupFrame",
            `Security group for Amazon ECS - ${commonProps.projectName}-${envProps.envName}`,
            "ecs",
        );

        this.auroraSecurityGroupFrame = createSecurityGroup(
            "AuroraSecurityGroupFrame",
            `Security group for Amazon Aurora - ${commonProps.projectName}-${envProps.envName}`,
            "aurora",
        );

        this.elasticacheSecurityGroupFrame = createSecurityGroup(
            "ElasticacheSecurityGroupFrame",
            `Security group for Amazon ElastiCache - ${commonProps.projectName}-${envProps.envName}`,
            "elasticache",
        );

        this.lambdaSecurityGroupFrame = createSecurityGroup(
            "LambdaSecurityGroupFrame",
            `Security group for AWS Lambda - ${commonProps.projectName}-${envProps.envName}`,
            "lambda",
        );

        this.vpcEndPointS3SecurityGroupFrame = createSecurityGroup(
            "vpcEndPointS3SecurityGroupFrame",
            "Security group for Amazon S3",
            "vpc-endpoint-s3",
        );

        this.vpcEndPointECRSecurityGroupFrame = createSecurityGroup(
            "vpcEndPointECRSecurityGroupFrame",
            "Security group for Amazon ECR",
            "vpc-endpoint-ecr",
        );

        this.vpcEndPointSSMSecurityGroupFrame = createSecurityGroup(
            "vpcEndPointSSMSecurityGroupFrame",
            "Security group for AWS Systems Manager",
            "vpc-endpoint-ssm",
        );

        this.vpcEndPointKMSSecurityGroupFrame = createSecurityGroup(
            "vpcEndPointKMSSecurityGroupFrame",
            "Security group for AWS KMS",
            "vpc-endpoint-kms",
        );

        this.vpcEndPointCloudWatchLogsSecurityGroupFrame = createSecurityGroup(
            "vpcEndPointCloudWatchLogsSecurityGroupFrame",
            "Security group for Amazon CloudWatch Logs",
            "vpc-endpoint-cloudwatch-logs",
        );
    }
}
