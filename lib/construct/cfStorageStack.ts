import { readFileSync } from 'node:fs';
import * as cdk from 'aws-cdk-lib';
import { aws_ec2 as ec2, aws_ecr as ecr, aws_s3 as s3 } from 'aws-cdk-lib';
import type * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';

export interface networkingProps {
    vpcId: string;
    privateSubnetA: string;
    privateSubnetC: string;
}

export interface sgProps {
        vpcEndPointS3SecurityGroup: ec2.SecurityGroup;
        vpcEndPointECRSecurityGroup: ec2.SecurityGroup;
        vpcEndPointSSMSecurityGroup: ec2.SecurityGroup;
        vpcEndPointSSMEC2SecurityGroup: ec2.SecurityGroup;
        vpcEndPointSSMEC2MessagesSecurityGroup: ec2.SecurityGroup;
        vpcEndPointKMSSecurityGroup: ec2.SecurityGroup;
        vpcEndPointCloudWatchLogsSecurityGroup: ec2.SecurityGroup;
}

export interface kmsProps {
    ecrKey: kms.Key;
    s3Key: kms.Key;
}

export interface CfStorageStackProps extends networkingProps, kmsProps {}


// ------------------------------------------------------------
// [06] - Storage Stack
// ------------------------------------------------------------
export class cfStorageStack extends Construct {
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
    public readonly s3BucketDeploymentCode: s3.Bucket;

    constructor(scope: Construct, id: string, props: CfStorageStackProps, sgProps: sgProps) {
        super(scope, id);

        // ------------------------------------------------------------
        // VPC Endpoint for Amazon ECR Docker Interface Configuration
        // ------------------------------------------------------------
        this.vpcEndpointECRDocker = new ec2.CfnVPCEndpoint(this, 'vpcEndpointECRDocker', {
            vpcId: props.vpcId,
            serviceName: `com.amazonaws.${cdk.Aws.REGION}.ecr.dkr`,
            vpcEndpointType: 'Interface',
            securityGroupIds: [sgProps.vpcEndPointECRSecurityGroup.securityGroupId],
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
        this.vpcEndpointECRAPI = new ec2.CfnVPCEndpoint(this, 'vpcEndpointECRAPI', {
            vpcId: props.vpcId,
            serviceName: `com.amazonaws.${cdk.Aws.REGION}.ecr.api`,
            vpcEndpointType: 'Interface',
            securityGroupIds: [sgProps.vpcEndPointECRSecurityGroup.securityGroupId],
            subnetIds: [props.privateSubnetA, props.privateSubnetC],
            ipAddressType: 'ipv4',
            privateDnsEnabled: true,
            dnsOptions: {
                dnsRecordIpType: 'IPv4'
            }
        });

        cdk.Tags.of(this.vpcEndpointECRAPI).add('Name', 'vpcEndpointECRAPI');
        cdk.Tags.of(this.vpcEndpointECRAPI).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // VPC Endpoint for AWS KMS Interface Configuration
        // ------------------------------------------------------------
        this.vpcEndpointKMS = new ec2.CfnVPCEndpoint(this, 'vpcEndpointKMS', {
            vpcId: props.vpcId,
            serviceName: `com.amazonaws.${cdk.Aws.REGION}.kms`,
            vpcEndpointType: 'Interface',
            securityGroupIds: [sgProps.vpcEndPointKMSSecurityGroup.securityGroupId],
            subnetIds: [props.privateSubnetA, props.privateSubnetC],
            ipAddressType: 'ipv4',
            privateDnsEnabled: true,
            dnsOptions: {
                dnsRecordIpType: 'IPv4'
            }
        });

        cdk.Tags.of(this.vpcEndpointKMS).add('Name', 'vpcEndpointKMS');
        cdk.Tags.of(this.vpcEndpointKMS).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // VPC Endpoint for AWS Systems Manager Interface Configuration
        // ------------------------------------------------------------
        this.vpcEndpointSSM = new ec2.CfnVPCEndpoint(this, 'vpcEndpointSSM', {
            vpcId: props.vpcId,
            serviceName: `com.amazonaws.${cdk.Aws.REGION}.ssm`,
            vpcEndpointType: 'Interface',
            securityGroupIds: [sgProps.vpcEndPointKMSSecurityGroup.securityGroupId],
            subnetIds: [props.privateSubnetA, props.privateSubnetC],
            ipAddressType: 'ipv4',
            privateDnsEnabled: true,
            dnsOptions: {
                dnsRecordIpType: 'IPv4'
            }
        });

        cdk.Tags.of(this.vpcEndpointSSM).add('Name', 'vpcEndpointSSM');
        cdk.Tags.of(this.vpcEndpointSSM).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // VPC Endpoint for AWS Systems Manager EC2 Interface Configuration
        // ------------------------------------------------------------
        this.vpcEndpointSSMEC2 = new ec2.CfnVPCEndpoint(this, 'vpcEndpointSSMEC2', {
            vpcId: props.vpcId,
            serviceName: `com.amazonaws.${cdk.Aws.REGION}.ssm.ec2`,
            vpcEndpointType: 'Interface',
            securityGroupIds: [sgProps.vpcEndPointSSMEC2SecurityGroup.securityGroupId],
            subnetIds: [props.privateSubnetA, props.privateSubnetC],
            ipAddressType: 'ipv4',
            privateDnsEnabled: true,
            dnsOptions: {
                dnsRecordIpType: 'IPv4'
            }
        });

        cdk.Tags.of(this.vpcEndpointSSMEC2).add('Name', 'vpcEndpointSSMEC2');
        cdk.Tags.of(this.vpcEndpointSSMEC2).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // VPC Endpoint for AWS Systems Manager EC2 Messages Interface Configuration
        // ------------------------------------------------------------
        this.vpcEndpointSSMEC2Messages = new ec2.CfnVPCEndpoint(this, 'vpcEndpointSSMEC2Messages', {
            vpcId: props.vpcId,
            serviceName: `com.amazonaws.${cdk.Aws.REGION}.ec2messages`,
            vpcEndpointType: 'Interface',
            securityGroupIds: [sgProps.vpcEndPointSSMEC2MessagesSecurityGroup.securityGroupId],
            subnetIds: [props.privateSubnetA, props.privateSubnetC],
            ipAddressType: 'ipv4',
            privateDnsEnabled: true,
            dnsOptions: {
                dnsRecordIpType: 'IPv4'
            }
        });

        cdk.Tags.of(this.vpcEndpointSSMEC2Messages).add('Name', 'vpcEndpointSSMEC2Messages');
        cdk.Tags.of(this.vpcEndpointSSMEC2Messages).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // VPC Endpoint for Amazon CloudWatch Logs Interface Configuration
        // ------------------------------------------------------------
        this.vpcEndpointCloudWatchLogs = new ec2.CfnVPCEndpoint(this, 'vpcEndpointCloudWatchLogs', {
            vpcId: props.vpcId,
            serviceName: `com.amazonaws.${cdk.Aws.REGION}.logs`,
            vpcEndpointType: 'Interface',
            securityGroupIds: [sgProps.vpcEndPointCloudWatchLogsSecurityGroup.securityGroupId],
            subnetIds: [props.privateSubnetA, props.privateSubnetC],
            ipAddressType: 'ipv4',
            privateDnsEnabled: true,
            dnsOptions: {
                dnsRecordIpType: 'IPv4'
            }
        });

        cdk.Tags.of(this.vpcEndpointCloudWatchLogs).add('Name', 'vpcEndpointCloudWatchLogs');
        cdk.Tags.of(this.vpcEndpointCloudWatchLogs).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // VPC Endpoint for Amazon S3 Gateway Configuration
        // ------------------------------------------------------------
        this.vpcEndpointS3 = new ec2.CfnVPCEndpoint(this, 'vpcEndpointS3', {
            vpcId: props.vpcId,
            serviceName: `com.amazonaws.${cdk.Aws.REGION}.s3`,
            vpcEndpointType: 'Gateway',
        });

        cdk.Tags.of(this.vpcEndpointS3).add('Name', 'vpcEndpointS3');
        cdk.Tags.of(this.vpcEndpointS3).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // Amazon ECR Repository for Web BaseImage Configuration
        // ------------------------------------------------------------
        this.ecrRepositoryWebBaseImage = new ecr.Repository(this, 'ecrRepositoryWebBaseImage', {
            repositoryName: 'web-baseimage',
            imageTagMutability: ecr.TagMutability.IMMUTABLE,
            imageScanOnPush: true,
            encryption: ecr.RepositoryEncryption.KMS,
            encryptionKey: props.ecrKey
        });

        cdk.Tags.of(this.ecrRepositoryWebBaseImage).add('Name', 'ecrRepositoryWebBaseImage');
        cdk.Tags.of(this.ecrRepositoryWebBaseImage).add('ProvisionedBy', 'AWS');

        const lifecyclePolicyText = readFileSync('json/amazon-ecr-lifecycle-policy.json', 'utf8');
        const cfnRepositoryWebBaseImage = this.ecrRepositoryWebBaseImage.node.defaultChild as ecr.CfnRepository;
        cfnRepositoryWebBaseImage.lifecyclePolicy = {
            lifecyclePolicyText: lifecyclePolicyText
        };


        // ------------------------------------------------------------
        // Amazon ECR Repository for Application BaseImage Configuration
        // ------------------------------------------------------------
        this.ecrRepositoryAppBaseImage = new ecr.Repository(this, 'ecrRepositoryAppBaseImage', {
            repositoryName: 'app-baseimage',
            imageTagMutability: ecr.TagMutability.IMMUTABLE,
            imageScanOnPush: true,
            encryption: ecr.RepositoryEncryption.KMS,
            encryptionKey: props.ecrKey
        });

        cdk.Tags.of(this.ecrRepositoryAppBaseImage).add('Name', 'ecrRepositoryAppBaseImage');
        cdk.Tags.of(this.ecrRepositoryAppBaseImage).add('ProvisionedBy', 'AWS');

        const lifecyclePolicyTextApp = readFileSync('json/amazon-ecr-lifecycle-policy.json', 'utf8');
        const cfnRepositoryAppBaseImage = this.ecrRepositoryAppBaseImage.node.defaultChild as ecr.CfnRepository;
        cfnRepositoryAppBaseImage.lifecyclePolicy = {
            lifecyclePolicyText: lifecyclePolicyTextApp
        };


        // ------------------------------------------------------------
        // Amazon ECR Repository for Web Configuration
        // ------------------------------------------------------------
        this.ecrRepositoryWeb = new ecr.Repository(this, 'ecrRepositoryWeb', {
            repositoryName: 'web',
            imageTagMutability: ecr.TagMutability.IMMUTABLE,
            imageScanOnPush: true,
            encryption: ecr.RepositoryEncryption.KMS,
            encryptionKey: props.ecrKey
        });

        cdk.Tags.of(this.ecrRepositoryWeb).add('Name', 'ecrRepositoryWeb');
        cdk.Tags.of(this.ecrRepositoryWeb).add('ProvisionedBy', 'AWS');

        const lifecyclePolicyTextWeb = readFileSync('json/amazon-ecr-lifecycle-policy.json', 'utf8');
        const cfnRepositoryWeb = this.ecrRepositoryWeb.node.defaultChild as ecr.CfnRepository;
        cfnRepositoryWeb.lifecyclePolicy = {
            lifecyclePolicyText: lifecyclePolicyTextWeb
        };


        // ------------------------------------------------------------
        // Amazon ECR Repository for Application Configuration
        // ------------------------------------------------------------
        this.ecrRepositoryApp = new ecr.Repository(this, 'ecrRepositoryApp', {
            repositoryName: 'app',
            imageTagMutability: ecr.TagMutability.IMMUTABLE,
            imageScanOnPush: true,
            encryption: ecr.RepositoryEncryption.KMS,
            encryptionKey: props.ecrKey
        });

        cdk.Tags.of(this.ecrRepositoryApp).add('Name', 'ecrRepositoryApp');
        cdk.Tags.of(this.ecrRepositoryApp).add('ProvisionedBy', 'AWS');

        const lifecyclePolicyTextAppConfig = readFileSync('json/amazon-ecr-lifecycle-policy.json', 'utf8');
        const cfnRepositoryApp = this.ecrRepositoryApp.node.defaultChild as ecr.CfnRepository;
        cfnRepositoryApp.lifecyclePolicy = {
            lifecyclePolicyText: lifecyclePolicyTextAppConfig
        };


        // ------------------------------------------------------------
        // Amazon S3 Bucket for ALB Logs Configuration
        // ------------------------------------------------------------
        this.s3BucketAlbLogs = new s3.Bucket(this, 's3BucketAlbLogs', {
            bucketName: `${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}-alb-logs`,
            versioned: true,
            accessControl: s3.BucketAccessControl.PRIVATE,
            encryptionKey: props.s3Key,
            encryption: s3.BucketEncryption.KMS,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            enforceSSL: true,
        });

        cdk.Tags.of(this.s3BucketAlbLogs).add('Name', 's3BucketAlbLogs');
        cdk.Tags.of(this.s3BucketAlbLogs).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // Amazon S3 Bucket for NginX Logs Configuration
        // ------------------------------------------------------------
        this.s3BucketNginxLogs = new s3.Bucket(this, 's3BucketNginxLogs', {
            bucketName: `${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}-nginx-logs`,
            versioned: true,
            accessControl: s3.BucketAccessControl.PRIVATE,
            encryptionKey: props.s3Key,
            encryption: s3.BucketEncryption.KMS,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            enforceSSL: true,
        });

        cdk.Tags.of(this.s3BucketNginxLogs).add('Name', 's3BucketNginxLogs');
        cdk.Tags.of(this.s3BucketNginxLogs).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // Amazon S3 Bucket for Application Logs Configuration
        // ------------------------------------------------------------
        this.s3BucketAppLogs = new s3.Bucket(this, 's3BucketAppLogs', {
            bucketName: `${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}-app-logs`,
            versioned: true,
            accessControl: s3.BucketAccessControl.PRIVATE,
            encryptionKey: props.s3Key,
            encryption: s3.BucketEncryption.KMS,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            enforceSSL: true,
        });

        cdk.Tags.of(this.s3BucketAppLogs).add('Name', 's3BucketAppLogs');
        cdk.Tags.of(this.s3BucketAppLogs).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // Amazon S3 Bucket for Deployment Code Configuration
        // ------------------------------------------------------------
        this.s3BucketDeploymentCode = new s3.Bucket(this, 's3BucketDeploymentCode', {
            bucketName: `${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}-deployment-code`,
            versioned: true,
            accessControl: s3.BucketAccessControl.PRIVATE,
            encryptionKey: props.s3Key,
            encryption: s3.BucketEncryption.KMS,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            enforceSSL: true,
        });

        cdk.Tags.of(this.s3BucketDeploymentCode).add('Name', 's3BucketDeploymentCode');
        cdk.Tags.of(this.s3BucketDeploymentCode).add('ProvisionedBy', 'AWS');
    }
}
