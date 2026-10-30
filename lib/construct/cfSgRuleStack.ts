import { aws_ec2 as ec2 } from "aws-cdk-lib";
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

export interface SgProps {
    albSecurityGroupFrame: ec2.ISecurityGroup;
    batchSecurityGroupFrame: ec2.ISecurityGroup;
    bastionSecurityGroupFrame: ec2.ISecurityGroup;
    ecsSecurityGroupFrame: ec2.ISecurityGroup;
    elasticacheSecurityGroupFrame: ec2.ISecurityGroup;
    auroraSecurityGroupFrame: ec2.ISecurityGroup;
    lambdaSecurityGroupFrame: ec2.ISecurityGroup;
    vpcEndPointS3SecurityGroupFrame: ec2.ISecurityGroup;
    vpcEndPointECRSecurityGroupFrame: ec2.ISecurityGroup;
    vpcEndPointSSMSecurityGroupFrame: ec2.ISecurityGroup;
    vpcEndPointKMSSecurityGroupFrame: ec2.ISecurityGroup;
    vpcEndPointCloudWatchLogsSecurityGroupFrame: ec2.ISecurityGroup;
}

// ************************************************************
// [09] - Security group Rule Stack
// ************************************************************
export class CfSgRuleStack extends Construct {
    public readonly albSecurityGroup: ec2.ISecurityGroup;
    public readonly batchSecurityGroup: ec2.ISecurityGroup;
    public readonly bastionSecurityGroup: ec2.ISecurityGroup;
    public readonly ecsSecurityGroup: ec2.ISecurityGroup;
    public readonly elasticacheSecurityGroup: ec2.ISecurityGroup;
    public readonly auroraSecurityGroup: ec2.ISecurityGroup;
    public readonly lambdaSecurityGroup: ec2.ISecurityGroup;
    public readonly vpcEndPointS3SecurityGroup: ec2.ISecurityGroup;
    public readonly vpcEndPointECRSecurityGroup: ec2.ISecurityGroup;
    public readonly vpcEndPointSSMSecurityGroup: ec2.ISecurityGroup;
    public readonly vpcEndPointKMSSecurityGroup: ec2.ISecurityGroup;
    public readonly vpcEndPointCloudWatchLogsSecurityGroup: ec2.ISecurityGroup;

    constructor(scope: Construct, id: string, sgProps: SgProps) {
        super(scope, id);

        // ------------------------------------------------------------
        // Assign security group frames to the actual security groups
        // ------------------------------------------------------------
        this.albSecurityGroup = sgProps.albSecurityGroupFrame;
        this.batchSecurityGroup = sgProps.batchSecurityGroupFrame;
        this.bastionSecurityGroup = sgProps.bastionSecurityGroupFrame;
        this.ecsSecurityGroup = sgProps.ecsSecurityGroupFrame;
        this.elasticacheSecurityGroup = sgProps.elasticacheSecurityGroupFrame;
        this.auroraSecurityGroup = sgProps.auroraSecurityGroupFrame;
        this.lambdaSecurityGroup = sgProps.lambdaSecurityGroupFrame;
        this.vpcEndPointS3SecurityGroup =
            sgProps.vpcEndPointS3SecurityGroupFrame;
        this.vpcEndPointECRSecurityGroup =
            sgProps.vpcEndPointECRSecurityGroupFrame;
        this.vpcEndPointSSMSecurityGroup =
            sgProps.vpcEndPointSSMSecurityGroupFrame;
        this.vpcEndPointKMSSecurityGroup =
            sgProps.vpcEndPointKMSSecurityGroupFrame;
        this.vpcEndPointCloudWatchLogsSecurityGroup =
            sgProps.vpcEndPointCloudWatchLogsSecurityGroupFrame;

        // ------------------------------------------------------------
        // Security group rules for Application Load Balancer (ALB)
        // ------------------------------------------------------------
        this.albSecurityGroup.addIngressRule(
            ec2.Peer.anyIpv4(),
            ec2.Port.tcp(80),
            "Allow HTTP from the internet",
        );
        this.albSecurityGroup.addIngressRule(
            ec2.Peer.anyIpv4(),
            ec2.Port.tcp(443),
            "Allow HTTPS from the internet",
        );
        this.albSecurityGroup.addEgressRule(
            this.ecsSecurityGroup,
            ec2.Port.tcp(80),
            "Allow traffic to ECS",
        );

        // ------------------------------------------------------------
        // Security group rules for ECS
        // ------------------------------------------------------------
        this.ecsSecurityGroup.addIngressRule(
            this.albSecurityGroup,
            ec2.Port.tcp(80),
            "Allow traffic from ALB",
        );
        this.ecsSecurityGroup.addEgressRule(
            this.auroraSecurityGroup,
            ec2.Port.tcp(5432),
            "Allow PostgreSQL to Aurora",
        );
        this.ecsSecurityGroup.addEgressRule(
            this.vpcEndPointECRSecurityGroup,
            ec2.Port.tcp(443),
            "Allow access to ECR",
        );
        this.ecsSecurityGroup.addEgressRule(
            this.vpcEndPointSSMSecurityGroup,
            ec2.Port.tcp(443),
            "Allow access to SSM",
        );
        this.ecsSecurityGroup.addEgressRule(
            this.vpcEndPointKMSSecurityGroup,
            ec2.Port.tcp(443),
            "Allow access to KMS",
        );
        this.ecsSecurityGroup.addEgressRule(
            this.vpcEndPointCloudWatchLogsSecurityGroup,
            ec2.Port.tcp(443),
            "Allow access to CloudWatch Logs",
        );

        // ------------------------------------------------------------
        // Security group rules for Amazon Aurora
        // ------------------------------------------------------------
        this.auroraSecurityGroup.addIngressRule(
            this.ecsSecurityGroup,
            ec2.Port.tcp(5432),
            "Allow PostgreSQL from ECS",
        );
        this.auroraSecurityGroup.addIngressRule(
            this.batchSecurityGroup,
            ec2.Port.tcp(5432),
            "Allow PostgreSQL from Batch",
        );
        this.auroraSecurityGroup.addIngressRule(
            this.lambdaSecurityGroup,
            ec2.Port.tcp(5432),
            "Allow PostgreSQL from Lambda",
        );
        this.auroraSecurityGroup.addIngressRule(
            this.bastionSecurityGroup,
            ec2.Port.tcp(5432),
            "Allow PostgreSQL from Bastion",
        );

        // ------------------------------------------------------------
        // Security group rules for Amazon ElastiCache
        // ------------------------------------------------------------
        this.elasticacheSecurityGroup.addIngressRule(
            this.ecsSecurityGroup,
            ec2.Port.tcp(6379),
            "Allow Redis from ECS",
        );
        this.elasticacheSecurityGroup.addIngressRule(
            this.batchSecurityGroup,
            ec2.Port.tcp(6379),
            "Allow Redis from Batch",
        );
        this.elasticacheSecurityGroup.addIngressRule(
            this.bastionSecurityGroup,
            ec2.Port.tcp(6379),
            "Allow Redis from Bastion",
        );

        // ------------------------------------------------------------
        // Security group rules for Amazon EC2 for Bastion, Batch, and AWS Lambda
        // ------------------------------------------------------------
        for (const sourceSecurityGroup of [
            this.bastionSecurityGroup,
            this.batchSecurityGroup,
            this.lambdaSecurityGroup,
        ]) {
            sourceSecurityGroup.addEgressRule(
                this.auroraSecurityGroup,
                ec2.Port.tcp(5432),
                "Allow PostgreSQL to Aurora",
            );
            sourceSecurityGroup.addEgressRule(
                this.vpcEndPointECRSecurityGroup,
                ec2.Port.tcp(443),
                "Allow access to ECR",
            );
            sourceSecurityGroup.addEgressRule(
                this.vpcEndPointSSMSecurityGroup,
                ec2.Port.tcp(443),
                "Allow access to SSM",
            );
            sourceSecurityGroup.addEgressRule(
                this.vpcEndPointKMSSecurityGroup,
                ec2.Port.tcp(443),
                "Allow access to KMS",
            );
            sourceSecurityGroup.addEgressRule(
                this.vpcEndPointCloudWatchLogsSecurityGroup,
                ec2.Port.tcp(443),
                "Allow access to CloudWatch Logs",
            );
        }

        // ------------------------------------------------------------
        // Security group rules for Amazon VPC Endpoints
        // ------------------------------------------------------------
        for (const endpointSecurityGroup of [
            this.vpcEndPointECRSecurityGroup,
            this.vpcEndPointSSMSecurityGroup,
            this.vpcEndPointKMSSecurityGroup,
            this.vpcEndPointCloudWatchLogsSecurityGroup,
        ]) {
            for (const sourceSecurityGroup of [
                this.ecsSecurityGroup,
                this.bastionSecurityGroup,
                this.batchSecurityGroup,
                this.lambdaSecurityGroup,
            ]) {
                endpointSecurityGroup.addIngressRule(
                    sourceSecurityGroup,
                    ec2.Port.tcp(443),
                    "Allow HTTPS from workload",
                );
            }
        }
    }
}
