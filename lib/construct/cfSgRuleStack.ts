import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface sgProps {
    albSecurityGroupFrame: ec2.SecurityGroup;
    batchSecurityGroupFrame: ec2.SecurityGroup;
    bastionSecurityGroupFrame: ec2.SecurityGroup;
    ecsSecurityGroupFrame: ec2.SecurityGroup;
    auroraSecurityGroupFrame: ec2.SecurityGroup;
    lambdaSecurityGroupFrame: ec2.SecurityGroup;
    vpcEndPointS3SecurityGroupFrame: ec2.SecurityGroup;
    vpcEndPointECRSecurityGroupFrame: ec2.SecurityGroup;
    vpcEndPointSSMSecurityGroupFrame: ec2.SecurityGroup;
    vpcEndPointKMSSecurityGroupFrame: ec2.SecurityGroup;
    vpcEndPointCloudWatchLogsSecurityGroupFrame: ec2.SecurityGroup;
}


// ------------------------------------------------------------
// [09] - Security group Rule Stack
// ------------------------------------------------------------
export class CfSgRuleStack extends Construct {
        public readonly albSecurityGroup: ec2.SecurityGroup;
        public readonly batchSecurityGroup: ec2.SecurityGroup;
        public readonly bastionSecurityGroup: ec2.SecurityGroup;
        public readonly ecsSecurityGroup: ec2.SecurityGroup;
        public readonly auroraSecurityGroup: ec2.SecurityGroup;
        public readonly lambdaSecurityGroup: ec2.SecurityGroup;
        public readonly vpcEndPointS3SecurityGroup: ec2.SecurityGroup;
        public readonly vpcEndPointECRSecurityGroup: ec2.SecurityGroup;
        public readonly vpcEndPointSSMSecurityGroup: ec2.SecurityGroup;
        public readonly vpcEndPointKMSSecurityGroup: ec2.SecurityGroup;
        public readonly vpcEndPointCloudWatchLogsSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: sgProps) {
    super(scope, id);

    // Assign security group frames to the actual security groups
    this.albSecurityGroup = props.albSecurityGroupFrame;
    this.batchSecurityGroup = props.batchSecurityGroupFrame;
    this.bastionSecurityGroup = props.bastionSecurityGroupFrame;
    this.ecsSecurityGroup = props.ecsSecurityGroupFrame;
    this.auroraSecurityGroup = props.auroraSecurityGroupFrame;
    this.lambdaSecurityGroup = props.lambdaSecurityGroupFrame;
    this.vpcEndPointS3SecurityGroup = props.vpcEndPointS3SecurityGroupFrame;
    this.vpcEndPointECRSecurityGroup = props.vpcEndPointECRSecurityGroupFrame;
    this.vpcEndPointSSMSecurityGroup = props.vpcEndPointSSMSecurityGroupFrame;
    this.vpcEndPointKMSSecurityGroup = props.vpcEndPointKMSSecurityGroupFrame;
    this.vpcEndPointCloudWatchLogsSecurityGroup = props.vpcEndPointCloudWatchLogsSecurityGroupFrame;

    // Security group rules for ALB
    this.albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP from the internet');
    this.albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS from the internet');
    this.albSecurityGroup.addEgressRule(this.ecsSecurityGroup, ec2.Port.tcp(80), 'Allow traffic to ECS');

    // Security group rules for ECS
    this.ecsSecurityGroup.addIngressRule(this.albSecurityGroup, ec2.Port.tcp(80), 'Allow traffic from ALB');
    this.ecsSecurityGroup.addEgressRule(this.auroraSecurityGroup, ec2.Port.tcp(5432), 'Allow PostgreSQL to Aurora');
    this.ecsSecurityGroup.addEgressRule(this.vpcEndPointECRSecurityGroup, ec2.Port.tcp(443), 'Allow access to ECR');
    this.ecsSecurityGroup.addEgressRule(this.vpcEndPointSSMSecurityGroup, ec2.Port.tcp(443), 'Allow access to SSM');
    this.ecsSecurityGroup.addEgressRule(this.vpcEndPointKMSSecurityGroup, ec2.Port.tcp(443), 'Allow access to KMS');
    this.ecsSecurityGroup.addEgressRule(this.vpcEndPointCloudWatchLogsSecurityGroup, ec2.Port.tcp(443), 'Allow access to CloudWatch Logs');

    // Security group rules for Aurora
    this.auroraSecurityGroup.addIngressRule(this.ecsSecurityGroup, ec2.Port.tcp(5432), 'Allow PostgreSQL from ECS');
    this.auroraSecurityGroup.addIngressRule(this.batchSecurityGroup, ec2.Port.tcp(5432), 'Allow PostgreSQL from Batch');
    this.auroraSecurityGroup.addIngressRule(this.lambdaSecurityGroup, ec2.Port.tcp(5432), 'Allow PostgreSQL from Lambda');
    this.auroraSecurityGroup.addIngressRule(this.bastionSecurityGroup, ec2.Port.tcp(5432), 'Allow PostgreSQL from Bastion');


    // Security group rules for Bastion, Batch, and Lambda
    for (const sourceSecurityGroup of [
      this.bastionSecurityGroup,
      this.batchSecurityGroup,
      this.lambdaSecurityGroup,
    ]) {
      sourceSecurityGroup.addEgressRule(this.auroraSecurityGroup, ec2.Port.tcp(5432), 'Allow PostgreSQL to Aurora');
      sourceSecurityGroup.addEgressRule(this.vpcEndPointECRSecurityGroup, ec2.Port.tcp(443), 'Allow access to ECR');
      sourceSecurityGroup.addEgressRule(this.vpcEndPointSSMSecurityGroup, ec2.Port.tcp(443), 'Allow access to SSM');
      sourceSecurityGroup.addEgressRule(this.vpcEndPointKMSSecurityGroup, ec2.Port.tcp(443), 'Allow access to KMS');
      sourceSecurityGroup.addEgressRule(this.vpcEndPointCloudWatchLogsSecurityGroup, ec2.Port.tcp(443), 'Allow access to CloudWatch Logs');
    }

    // Security group rules for VPC Endpoints
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
        endpointSecurityGroup.addIngressRule(sourceSecurityGroup, ec2.Port.tcp(443), 'Allow HTTPS from workload');
      }
    }
  }
}
