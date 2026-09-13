import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';


// ------------------------------------------------------------
// [03] - Security group Frame Stack
// ------------------------------------------------------------
export class CfSgFrameStack extends Construct {
        public readonly vpc: ec2.IVpc;
        public readonly albSecurityGroupFrame: ec2.SecurityGroup;
        public readonly batchSecurityGroupFrame: ec2.SecurityGroup;
        public readonly bastionSecurityGroupFrame: ec2.SecurityGroup;
        public readonly ecsSecurityGroupFrame: ec2.SecurityGroup;
        public readonly auroraSecurityGroupFrame: ec2.SecurityGroup;
        public readonly lambdaSecurityGroupFrame: ec2.SecurityGroup;
        public readonly vpcEndPointS3SecurityGroupFrame: ec2.SecurityGroup;
        public readonly vpcEndPointECRSecurityGroupFrame: ec2.SecurityGroup;
        public readonly vpcEndPointSSMSecurityGroupFrame: ec2.SecurityGroup;
        public readonly vpcEndPointKMSSecurityGroupFrame: ec2.SecurityGroup;
        public readonly vpcEndPointCloudWatchLogsSecurityGroupFrame: ec2.SecurityGroup;

    constructor(scope: Construct, id: string) {
        super(scope, id);

        this.vpc = ec2.Vpc.fromLookup(this, 'Vpc', {
            isDefault: true,
        });


        // ------------------------------------------------------------
        // Security group for ALB Configuration (Frame Only)
        // ------------------------------------------------------------
        this.albSecurityGroupFrame = new ec2.SecurityGroup(this, 'AlbSecurityGroupFrame', {
            vpc: this.vpc,
            description: 'Security group for ALB',
            securityGroupName: 'AlbSecurityGroup',
            allowAllOutbound: false,
        });

        cdk.Tags.of(this.albSecurityGroupFrame).add('Name', 'AlbSecurityGroup');
        cdk.Tags.of(this.albSecurityGroupFrame).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // Security group for Amazon EC2 Bastion (Frame Only)
        // ------------------------------------------------------------
        this.bastionSecurityGroupFrame = new ec2.SecurityGroup(this, 'BastionSecurityGroupFrame', {
            vpc: this.vpc,
            description: 'Security group for Amazon EC2 Bastion',
            securityGroupName: 'EC2BastionSecurityGroup',
            allowAllOutbound: false,
        });

        cdk.Tags.of(this.bastionSecurityGroupFrame).add('Name', 'EC2BastionSecurityGroup');
        cdk.Tags.of(this.bastionSecurityGroupFrame).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // Security group for Amazon EC2 Batch (Frame Only)
        // ------------------------------------------------------------
        this.batchSecurityGroupFrame = new ec2.SecurityGroup(this, 'BatchSecurityGroupFrame', {
            vpc: this.vpc,
            description: 'Security group for Amazon EC2 Batch',
            securityGroupName: 'EC2BatchSecurityGroup',
            allowAllOutbound: false,
        });

        cdk.Tags.of(this.batchSecurityGroupFrame).add('Name', 'EC2BatchSecurityGroup');
        cdk.Tags.of(this.batchSecurityGroupFrame).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // Security group for Amazon ECS (Frame Only)
        // ------------------------------------------------------------
        this.ecsSecurityGroupFrame = new ec2.SecurityGroup(this, 'EcsSecurityGroupFrame', {
            vpc: this.vpc,
            description: 'Security group for Amazon ECS',
            securityGroupName: 'EcsSecurityGroup',
            allowAllOutbound: false,
        });

        cdk.Tags.of(this.ecsSecurityGroupFrame).add('Name', 'EcsSecurityGroup');
        cdk.Tags.of(this.ecsSecurityGroupFrame).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // Security group for Amazon Aurora (Frame Only)
        // ------------------------------------------------------------
        this.auroraSecurityGroupFrame = new ec2.SecurityGroup(this, 'AuroraSecurityGroupFrame', {
            vpc: this.vpc,
            description: 'Security group for Amazon Aurora',
            securityGroupName: 'AuroraSecurityGroup',
            allowAllOutbound: false,
        });

        cdk.Tags.of(this.auroraSecurityGroupFrame).add('Name', 'AuroraSecurityGroup');
        cdk.Tags.of(this.auroraSecurityGroupFrame).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // Security group for AWS Lambda (Frame Only)
        // ------------------------------------------------------------
        this.lambdaSecurityGroupFrame = new ec2.SecurityGroup(this, 'LambdaSecurityGroupFrame', {
            vpc: this.vpc,
            description: 'Security group for AWS Lambda',
            securityGroupName: 'LambdaSecurityGroup',
            allowAllOutbound: false,
        });

        cdk.Tags.of(this.lambdaSecurityGroupFrame).add('Name', 'LambdaSecurityGroup');
        cdk.Tags.of(this.lambdaSecurityGroupFrame).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // Security group for VPC Endpoint of Amazon S3 Interface (Frame Only)
        // ------------------------------------------------------------
        this.vpcEndPointS3SecurityGroupFrame = new ec2.SecurityGroup(this, 'vpcEndPointS3SecurityGroupFrame', {
            vpc: this.vpc,
            description: 'Security group for Amazon S3',
            securityGroupName: 'vpcEndPointS3SecurityGroup',
            allowAllOutbound: false,
        });

        cdk.Tags.of(this.vpcEndPointS3SecurityGroupFrame).add('Name', 'vpcEndPointS3SecurityGroup');
        cdk.Tags.of(this.vpcEndPointS3SecurityGroupFrame).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // Security group for VPC Endpoint of Amazon ECR Interface (Frame Only)
        // ------------------------------------------------------------
        this.vpcEndPointECRSecurityGroupFrame = new ec2.SecurityGroup(this, 'vpcEndPointECRSecurityGroupFrame', {
            vpc: this.vpc,
            description: 'Security group for Amazon ECR',
            securityGroupName: 'vpcEndPointECRSecurityGroup',
            allowAllOutbound: false,
        });

        cdk.Tags.of(this.vpcEndPointECRSecurityGroupFrame).add('Name', 'vpcEndPointECRSecurityGroup');
        cdk.Tags.of(this.vpcEndPointECRSecurityGroupFrame).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // Security group for VPC Endpoint of AWS Systems Manager Interface (Frame Only)
        // ------------------------------------------------------------
        this.vpcEndPointSSMSecurityGroupFrame = new ec2.SecurityGroup(this, 'vpcEndPointSSMSecurityGroupFrame', {
            vpc: this.vpc,
            description: 'Security group for AWS Systems Manager',
            securityGroupName: 'vpcEndPointSSMSecurityGroup',
            allowAllOutbound: false,
        });

        cdk.Tags.of(this.vpcEndPointSSMSecurityGroupFrame).add('Name', 'vpcEndPointSSMSecurityGroup');
        cdk.Tags.of(this.vpcEndPointSSMSecurityGroupFrame).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // Security group for VPC Endpoint of AWS KMS Interface (Frame Only)
        // ------------------------------------------------------------
        this.vpcEndPointKMSSecurityGroupFrame = new ec2.SecurityGroup(this, 'vpcEndPointKMSSecurityGroupFrame', {
            vpc: this.vpc,
            description: 'Security group for AWS KMS',
            securityGroupName: 'vpcEndPointKMSSecurityGroup',
            allowAllOutbound: false,
        });

        cdk.Tags.of(this.vpcEndPointKMSSecurityGroupFrame).add('Name', 'vpcEndPointKMSSecurityGroup');
        cdk.Tags.of(this.vpcEndPointKMSSecurityGroupFrame).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // Security group for VPC Endpoint of Amazon CloudWatch Logs Interface (Frame Only)
        // ------------------------------------------------------------
        this.vpcEndPointCloudWatchLogsSecurityGroupFrame = new ec2.SecurityGroup(this, 'vpcEndPointCloudWatchLogsSecurityGroupFrame', {
            vpc: this.vpc,
            description: 'Security group for Amazon CloudWatch Logs',
            securityGroupName: 'vpcEndPointCloudWatchLogsSecurityGroup',
            allowAllOutbound: false,
        });

        cdk.Tags.of(this.vpcEndPointCloudWatchLogsSecurityGroupFrame).add('Name', 'vpcEndPointCloudWatchLogsSecurityGroup');
        cdk.Tags.of(this.vpcEndPointCloudWatchLogsSecurityGroupFrame).add('ProvisionedBy', 'AWS');
    }
}
