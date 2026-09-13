import { readFileSync } from 'node:fs';
import * as cdk from 'aws-cdk-lib';
import { aws_ec2 as ec2, aws_ecr as ecr, type aws_kms as kms, aws_s3 as s3 } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface networkingProps {
    vpcId: string;
    privateSubnetA: string;
    privateSubnetC: string;
}

export interface sgProps {
        vpcEndPointS3SecurityGroup: string;
        vpcEndPointECRSecurityGroup: string;
        vpcEndPointSSMSecurityGroup: string;
        vpcEndPointSSMEC2SecurityGroup: string;
        vpcEndPointSSMEC2MessagesSecurityGroup: string;
        vpcEndPointKMSSecurityGroup: string;
        vpcEndPointCloudWatchLogsSecurityGroup: string;
}

export interface kmsProps {
    ecrKey: kms.IKey;
    s3Key: kms.IKey;
}

export interface CfStorageStackProps extends networkingProps, kmsProps {}


// ------------------------------------------------------------
// [06] - Storage Stack
// ------------------------------------------------------------
export class CfStorageStack extends Construct {
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
    public readonly s3BucketNginxLogs: s3.Bucket;
    public readonly s3BucketAppLogs: s3.Bucket;

    constructor(scope: Construct, id: string, props: CfStorageStackProps, sgProps: sgProps) {
        super(scope, id);

        // ------------------------------------------------------------
        // VPC Endpoint for Amazon ECR Docker Interface Configuration
        // ------------------------------------------------------------
        this.vpcEndpointECRDocker = new ec2.CfnVPCEndpoint(this, 'VpcEndpointECRDocker', {
            vpcId: props.vpcId,
            serviceName: `com.amazonaws.${cdk.Aws.REGION}.ecr.dkr`,
            vpcEndpointType: 'Interface',
            securityGroupIds: [sgProps.vpcEndPointECRSecurityGroup],
            subnetIds: [props.privateSubnetA, props.privateSubnetC],
            ipAddressType: 'ipv4',
            privateDnsEnabled: true,
            dnsOptions: {
                dnsRecordIpType: 'IPv4'
            }
        });

        cdk.Tags.of(this.vpcEndpointECRDocker).add('Name', 'VpcEndpointECRDocker');
        cdk.Tags.of(this.vpcEndpointECRDocker).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // VPC Endpoint for Amazon ECR API Interface Configuration
        // ------------------------------------------------------------
        this.vpcEndpointECRAPI = new ec2.CfnVPCEndpoint(this, 'VpcEndpointECRAPI', {
            vpcId: props.vpcId,
            serviceName: `com.amazonaws.${cdk.Aws.REGION}.ecr.api`,
            vpcEndpointType: 'Interface',
            securityGroupIds: [sgProps.vpcEndPointECRSecurityGroup],
            subnetIds: [props.privateSubnetA, props.privateSubnetC],
            ipAddressType: 'ipv4',
            privateDnsEnabled: true,
            dnsOptions: {
                dnsRecordIpType: 'IPv4'
            }
        });

        cdk.Tags.of(this.vpcEndpointECRAPI).add('Name', 'VpcEndpointECRAPI');
        cdk.Tags.of(this.vpcEndpointECRAPI).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // VPC Endpoint for AWS KMS Interface Configuration
        // ------------------------------------------------------------
        this.vpcEndpointKMS = new ec2.CfnVPCEndpoint(this, 'VpcEndpointKMS', {
            vpcId: props.vpcId,
            serviceName: `com.amazonaws.${cdk.Aws.REGION}.kms`,
            vpcEndpointType: 'Interface',
            securityGroupIds: [sgProps.vpcEndPointKMSSecurityGroup],
            subnetIds: [props.privateSubnetA, props.privateSubnetC],
            ipAddressType: 'ipv4',
            privateDnsEnabled: true,
            dnsOptions: {
                dnsRecordIpType: 'IPv4'
            }
        });

        cdk.Tags.of(this.vpcEndpointKMS).add('Name', 'VpcEndpointKMS');
        cdk.Tags.of(this.vpcEndpointKMS).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // VPC Endpoint for AWS Systems Manager Interface Configuration
        // ------------------------------------------------------------
        this.vpcEndpointSSM = new ec2.CfnVPCEndpoint(this, 'VpcEndpointSSM', {
            vpcId: props.vpcId,
            serviceName: `com.amazonaws.${cdk.Aws.REGION}.ssm`,
            vpcEndpointType: 'Interface',
            securityGroupIds: [sgProps.vpcEndPointKMSSecurityGroup],
            subnetIds: [props.privateSubnetA, props.privateSubnetC],
            ipAddressType: 'ipv4',
            privateDnsEnabled: true,
            dnsOptions: {
                dnsRecordIpType: 'IPv4'
            }
        });

        cdk.Tags.of(this.vpcEndpointSSM).add('Name', 'VpcEndpointSSM');
        cdk.Tags.of(this.vpcEndpointSSM).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // VPC Endpoint for AWS Systems Manager EC2 Interface Configuration
        // ------------------------------------------------------------
        this.vpcEndpointSSMEC2 = new ec2.CfnVPCEndpoint(this, 'VpcEndpointSSMEC2', {
            vpcId: props.vpcId,
            serviceName: `com.amazonaws.${cdk.Aws.REGION}.ssm.ec2`,
            vpcEndpointType: 'Interface',
            securityGroupIds: [sgProps.vpcEndPointSSMEC2SecurityGroup],
            subnetIds: [props.privateSubnetA, props.privateSubnetC],
            ipAddressType: 'ipv4',
            privateDnsEnabled: true,
            dnsOptions: {
                dnsRecordIpType: 'IPv4'
            }
        });

        cdk.Tags.of(this.vpcEndpointSSMEC2).add('Name', 'VpcEndpointSSMEC2');
        cdk.Tags.of(this.vpcEndpointSSMEC2).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // VPC Endpoint for AWS Systems Manager EC2 Messages Interface Configuration
        // ------------------------------------------------------------
        this.vpcEndpointSSMEC2Messages = new ec2.CfnVPCEndpoint(this, 'VpcEndpointSSMEC2Messages', {
            vpcId: props.vpcId,
            serviceName: `com.amazonaws.${cdk.Aws.REGION}.ec2messages`,
            vpcEndpointType: 'Interface',
            securityGroupIds: [sgProps.vpcEndPointSSMEC2MessagesSecurityGroup],
            subnetIds: [props.privateSubnetA, props.privateSubnetC],
            ipAddressType: 'ipv4',
            privateDnsEnabled: true,
            dnsOptions: {
                dnsRecordIpType: 'IPv4'
            }
        });

        cdk.Tags.of(this.vpcEndpointSSMEC2Messages).add('Name', 'VpcEndpointEC2Messages');
        cdk.Tags.of(this.vpcEndpointSSMEC2Messages).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // VPC Endpoint for Amazon CloudWatch Logs Interface Configuration
        // ------------------------------------------------------------
        this.vpcEndpointCloudWatchLogs = new ec2.CfnVPCEndpoint(this, 'VpcEndpointCloudWatchLogs', {
            vpcId: props.vpcId,
            serviceName: `com.amazonaws.${cdk.Aws.REGION}.logs`,
            vpcEndpointType: 'Interface',
            securityGroupIds: [sgProps.vpcEndPointCloudWatchLogsSecurityGroup],
            subnetIds: [props.privateSubnetA, props.privateSubnetC],
            ipAddressType: 'ipv4',
            privateDnsEnabled: true,
            dnsOptions: {
                dnsRecordIpType: 'IPv4'
            }
        });

        cdk.Tags.of(this.vpcEndpointCloudWatchLogs).add('Name', 'VpcEndpointCloudWatchLogs');
        cdk.Tags.of(this.vpcEndpointCloudWatchLogs).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // VPC Endpoint for Amazon S3 Gateway Configuration
        // ------------------------------------------------------------
        this.vpcEndpointS3 = new ec2.CfnVPCEndpoint(this, 'VpcEndpointS3', {
            vpcId: props.vpcId,
            serviceName: `com.amazonaws.${cdk.Aws.REGION}.s3`,
            vpcEndpointType: 'Gateway',
        });

        cdk.Tags.of(this.vpcEndpointS3).add('Name', 'VpcEndpointS3');
        cdk.Tags.of(this.vpcEndpointS3).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // Amazon ECR Repository for Web BaseImage Configuration
        // ------------------------------------------------------------
        this.ecrRepositoryWebBaseImage = new ecr.Repository(this, 'EcrRepositoryWebBaseImage', {
            repositoryName: 'web-baseimage',
            imageTagMutability: ecr.TagMutability.IMMUTABLE,
            imageScanOnPush: true,
            encryption: ecr.RepositoryEncryption.KMS,
            encryptionKey: props.ecrKey
        });

        cdk.Tags.of(this.ecrRepositoryWebBaseImage).add('Name', 'EcrRepositoryWebBaseImage');
        cdk.Tags.of(this.ecrRepositoryWebBaseImage).add('ProvisionedBy', 'AWS');

        const lifecyclePolicyText = readFileSync('json/amazon-ecr-lifecycle-policy.json', 'utf8');
        const cfnRepositoryWebBaseImage = this.ecrRepositoryWebBaseImage.node.defaultChild as ecr.CfnRepository;
        cfnRepositoryWebBaseImage.lifecyclePolicy = {
            lifecyclePolicyText: lifecyclePolicyText
        };


        // ------------------------------------------------------------
        // Amazon ECR Repository for Application BaseImage Configuration
        // ------------------------------------------------------------
        this.ecrRepositoryAppBaseImage = new ecr.Repository(this, 'EcrRepositoryAppBaseImage', {
            repositoryName: 'app-baseimage',
            imageTagMutability: ecr.TagMutability.IMMUTABLE,
            imageScanOnPush: true,
            encryption: ecr.RepositoryEncryption.KMS,
            encryptionKey: props.ecrKey
        });

        cdk.Tags.of(this.ecrRepositoryAppBaseImage).add('Name', 'EcrRepositoryAppBaseImage');
        cdk.Tags.of(this.ecrRepositoryAppBaseImage).add('ProvisionedBy', 'AWS');

        const lifecyclePolicyTextApp = readFileSync('json/amazon-ecr-lifecycle-policy.json', 'utf8');
        const cfnRepositoryAppBaseImage = this.ecrRepositoryAppBaseImage.node.defaultChild as ecr.CfnRepository;
        cfnRepositoryAppBaseImage.lifecyclePolicy = {
            lifecyclePolicyText: lifecyclePolicyTextApp
        };


        // ------------------------------------------------------------
        // Amazon ECR Repository for Web Configuration
        // ------------------------------------------------------------
        this.ecrRepositoryWeb = new ecr.Repository(this, 'EcrRepositoryWeb', {
            repositoryName: 'web',
            imageTagMutability: ecr.TagMutability.IMMUTABLE,
            imageScanOnPush: true,
            encryption: ecr.RepositoryEncryption.KMS,
            encryptionKey: props.ecrKey
        });

        cdk.Tags.of(this.ecrRepositoryWeb).add('Name', 'EcrRepositoryWeb');
        cdk.Tags.of(this.ecrRepositoryWeb).add('ProvisionedBy', 'AWS');

        const lifecyclePolicyTextWeb = readFileSync('json/amazon-ecr-lifecycle-policy.json', 'utf8');
        const cfnRepositoryWeb = this.ecrRepositoryWeb.node.defaultChild as ecr.CfnRepository;
        cfnRepositoryWeb.lifecyclePolicy = {
            lifecyclePolicyText: lifecyclePolicyTextWeb
        };


        // ------------------------------------------------------------
        // Amazon ECR Repository for Application Configuration
        // ------------------------------------------------------------
        this.ecrRepositoryApp = new ecr.Repository(this, 'EcrRepositoryApp', {
            repositoryName: 'app',
            imageTagMutability: ecr.TagMutability.IMMUTABLE,
            imageScanOnPush: true,
            encryption: ecr.RepositoryEncryption.KMS,
            encryptionKey: props.ecrKey
        });

        cdk.Tags.of(this.ecrRepositoryApp).add('Name', 'EcrRepositoryApp');
        cdk.Tags.of(this.ecrRepositoryApp).add('ProvisionedBy', 'AWS');

        const lifecyclePolicyTextAppConfig = readFileSync('json/amazon-ecr-lifecycle-policy.json', 'utf8');
        const cfnRepositoryApp = this.ecrRepositoryApp.node.defaultChild as ecr.CfnRepository;
        cfnRepositoryApp.lifecyclePolicy = {
            lifecyclePolicyText: lifecyclePolicyTextAppConfig
        };


        // ------------------------------------------------------------
        // Amazon S3 Bucket for ALB Logs Configuration
        // ------------------------------------------------------------
        this.s3BucketAlbLogs = new s3.Bucket(this, 'S3BucketAlbLogs', {
            bucketName: `${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}-alb-logs`,
            versioned: true,
            accessControl: s3.BucketAccessControl.PRIVATE,
            encryptionKey: props.s3Key,
            encryption: s3.BucketEncryption.KMS,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            enforceSSL: true,
        });

        cdk.Tags.of(this.s3BucketAlbLogs).add('Name', 'S3BucketAlbLogs');
        cdk.Tags.of(this.s3BucketAlbLogs).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // Amazon S3 Bucket for NginX Logs Configuration
        // ------------------------------------------------------------
        this.s3BucketNginxLogs = new s3.Bucket(this, 'S3BucketNginxLogs', {
            bucketName: `${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}-nginx-logs`,
            versioned: true,
            accessControl: s3.BucketAccessControl.PRIVATE,
            encryptionKey: props.s3Key,
            encryption: s3.BucketEncryption.KMS,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            enforceSSL: true,
        });

        cdk.Tags.of(this.s3BucketNginxLogs).add('Name', 'S3BucketNginxLogs');
        cdk.Tags.of(this.s3BucketNginxLogs).add('ProvisionedBy', 'AWS');

        // ------------------------------------------------------------
        // Amazon S3 Bucket for Application Logs Configuration
        // ------------------------------------------------------------
        this.s3BucketAppLogs = new s3.Bucket(this, 'S3BucketAppLogs', {
            bucketName: `${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}-app-logs`,
            versioned: true,
            accessControl: s3.BucketAccessControl.PRIVATE,
            encryptionKey: props.s3Key,
            encryption: s3.BucketEncryption.KMS,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            enforceSSL: true,
        });

        cdk.Tags.of(this.s3BucketAppLogs).add('Name', 'S3BucketAppLogs');
        cdk.Tags.of(this.s3BucketAppLogs).add('ProvisionedBy', 'AWS');
    }
}
