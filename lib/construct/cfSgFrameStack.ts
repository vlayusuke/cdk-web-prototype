import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';


// ------------------------------------------------------------
// 03 Security group Frame Stack
// ------------------------------------------------------------
export class CfSgFrameStack extends Construct {
        public readonly vpc: ec2.IVpc;
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

    constructor(scope: Construct, id: string) {
        super(scope, id);

        // ------------------------------------------------------------
        // Security group for ALB Configuration (Frame Only)
        // ------------------------------------------------------------
        this.albSecurityGroup = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
            vpc: this.vpc,
            description: 'Security group for ALB',
            securityGroupName: 'AlbSecurityGroup',
        });

        cdk.Tags.of(this.albSecurityGroup).add('Name', 'albSecurityGroup');
        cdk.Tags.of(this.albSecurityGroup).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // Security group for Amazon EC2 Bastion (Frame Only)
        // ------------------------------------------------------------
        this.bastionSecurityGroup = new ec2.SecurityGroup(this, 'BastionSecurityGroup', {
            vpc: this.vpc,
            description: 'Security group for Amazon EC2 Bastion',
            securityGroupName: 'BastionSecurityGroup',
        });

        cdk.Tags.of(this.bastionSecurityGroup).add('Name', 'bastionSecurityGroup');
        cdk.Tags.of(this.bastionSecurityGroup).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // Security group for Amazon EC2 Batch (Frame Only)
        // ------------------------------------------------------------
        this.batchSecurityGroup = new ec2.SecurityGroup(this, 'BatchSecurityGroup', {
            vpc: this.vpc,
            description: 'Security group for Amazon EC2 Batch',
            securityGroupName: 'BatchSecurityGroup',
        });

        cdk.Tags.of(this.batchSecurityGroup).add('Name', 'batchSecurityGroup');
        cdk.Tags.of(this.batchSecurityGroup).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // Security group for Amazon ECS (Frame Only)
        // ------------------------------------------------------------
        this.ecsSecurityGroup = new ec2.SecurityGroup(this, 'EcsSecurityGroup', {
            vpc: this.vpc,
            description: 'Security group for Amazon ECS',
            securityGroupName: 'EcsSecurityGroup',
        });

        cdk.Tags.of(this.ecsSecurityGroup).add('Name', 'ecsSecurityGroup');
        cdk.Tags.of(this.ecsSecurityGroup).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // Security group for Amazon Aurora (Frame Only)
        // ------------------------------------------------------------
        this.auroraSecurityGroup = new ec2.SecurityGroup(this, 'AuroraSecurityGroup', {
            vpc: this.vpc,
            description: 'Security group for Amazon Aurora',
            securityGroupName: 'AuroraSecurityGroup',
        });

        cdk.Tags.of(this.auroraSecurityGroup).add('Name', 'auroraSecurityGroup');
        cdk.Tags.of(this.auroraSecurityGroup).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // Security group for AWS Lambda (Frame Only)
        // ------------------------------------------------------------
        this.lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
            vpc: this.vpc,
            description: 'Security group for AWS Lambda',
            securityGroupName: 'LambdaSecurityGroup',
        });

        cdk.Tags.of(this.lambdaSecurityGroup).add('Name', 'lambdaSecurityGroup');
        cdk.Tags.of(this.lambdaSecurityGroup).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // Security group for VPC Endpoint of Amazon S3 Interface (Frame Only)
        // ------------------------------------------------------------
        this.vpcEndPointS3SecurityGroup = new ec2.SecurityGroup(this, 'vpcEndPointS3SecurityGroup', {
            vpc: this.vpc,
            description: 'Security group for Amazon S3',
            securityGroupName: 'vpcEndPointS3SecurityGroup',
        });

        cdk.Tags.of(this.vpcEndPointS3SecurityGroup).add('Name', 'vpcEndPointS3SecurityGroup');
        cdk.Tags.of(this.vpcEndPointS3SecurityGroup).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // Security group for VPC Endpoint of Amazon ECR Interface (Frame Only)
        // ------------------------------------------------------------
        this.vpcEndPointECRSecurityGroup = new ec2.SecurityGroup(this, 'vpcEndPointECRSecurityGroup', {
            vpc: this.vpc,
            description: 'Security group for Amazon ECR',
            securityGroupName: 'vpcEndPointECRSecurityGroup',
        });

        cdk.Tags.of(this.vpcEndPointECRSecurityGroup).add('Name', 'vpcEndPointECRSecurityGroup');
        cdk.Tags.of(this.vpcEndPointECRSecurityGroup).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // Security group for VPC Endpoint of AWS Systems Manager Interface (Frame Only)
        // ------------------------------------------------------------
        this.vpcEndPointSSMSecurityGroup = new ec2.SecurityGroup(this, 'vpcEndPointSSMSecurityGroup', {
            vpc: this.vpc,
            description: 'Security group for AWS Systems Manager',
            securityGroupName: 'vpcEndPointSSMSecurityGroup',
        });

        cdk.Tags.of(this.vpcEndPointSSMSecurityGroup).add('Name', 'vpcEndPointSSMSecurityGroup');
        cdk.Tags.of(this.vpcEndPointSSMSecurityGroup).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // Security group for VPC Endpoint of AWS KMS Interface (Frame Only)
        // ------------------------------------------------------------
        this.vpcEndPointKMSSecurityGroup = new ec2.SecurityGroup(this, 'vpcEndPointKMSSecurityGroup', {
            vpc: this.vpc,
            description: 'Security group for AWS KMS',
            securityGroupName: 'vpcEndPointKMSSecurityGroup',
        });

        cdk.Tags.of(this.vpcEndPointKMSSecurityGroup).add('Name', 'vpcEndPointKMSSecurityGroup');
        cdk.Tags.of(this.vpcEndPointKMSSecurityGroup).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // Security group for VPC Endpoint of Amazon CloudWatch Logs Interface (Frame Only)
        // ------------------------------------------------------------
        this.vpcEndPointCloudWatchLogsSecurityGroup = new ec2.SecurityGroup(this, 'vpcEndPointCloudWatchLogsSecurityGroup', {
            vpc: this.vpc,
            description: 'Security group for Amazon CloudWatch Logs',
            securityGroupName: 'vpcEndPointCloudWatchLogsSecurityGroup',
        });

        cdk.Tags.of(this.vpcEndPointCloudWatchLogsSecurityGroup).add('Name', 'vpcEndPointCloudWatchLogsSecurityGroup');
        cdk.Tags.of(this.vpcEndPointCloudWatchLogsSecurityGroup).add('ProvisionedBy', 'AWS');
    }
}
