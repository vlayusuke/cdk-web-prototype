import * as cdk from "aws-cdk-lib";
import { aws_ec2 as ec2 } from "aws-cdk-lib";
import type * as kms from "aws-cdk-lib/aws-kms";
import { Construct } from "constructs";

export interface NetworkProps {
    vpcId: string;
    privateSubnetIds: string[];
    privateSubnetRouteTableIds: string[];
}

export interface SgProps {
    vpcEndPointS3SecurityGroup: ec2.ISecurityGroup;
    vpcEndPointECRSecurityGroup: ec2.ISecurityGroup;
    vpcEndPointSSMSecurityGroup: ec2.ISecurityGroup;
    vpcEndPointKMSSecurityGroup: ec2.ISecurityGroup;
    vpcEndPointCloudWatchLogsSecurityGroup: ec2.ISecurityGroup;
}

export interface KmsProps {
    applicationKey: kms.IKey;
}

export interface CommonProps {
    projectName: string;
}

export interface EnvProps {
    envName: string;
}

// ************************************************************
// [06] - VPC Endpoint Stack
// ************************************************************
export class CfVPCEndpointStack extends Construct {
    public readonly vpcEndpointECRDocker: ec2.CfnVPCEndpoint;
    public readonly vpcEndpointECRAPI: ec2.CfnVPCEndpoint;
    public readonly vpcEndpointKMS: ec2.CfnVPCEndpoint;
    public readonly vpcEndpointSSM: ec2.CfnVPCEndpoint;
    public readonly vpcEndpointSSMEC2: ec2.CfnVPCEndpoint;
    public readonly vpcEndpointSSMEC2Messages: ec2.CfnVPCEndpoint;
    public readonly vpcEndpointCloudWatchLogs: ec2.CfnVPCEndpoint;
    public readonly vpcEndpointS3: ec2.CfnVPCEndpoint;

    constructor(
        scope: Construct,
        id: string,
        networkProps: NetworkProps,
        kmsProps: KmsProps,
        sgProps: SgProps,
        commonProps: CommonProps,
        envProps: EnvProps,
    ) {
        super(scope, id);

        // ------------------------------------------------------------
        // Declaring VPC Endpoint Policy Configuration
        // ------------------------------------------------------------
        const ecrRepositoryArns = [
            "web-baseimage",
            "app-baseimage",
            "web",
            "app",
        ].map(
            (repositoryName) =>
                `arn:aws:ecr:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:repository/${repositoryName}`,
        );

        const ecrEndpointPolicy = {
            Version: "2012-10-17",
            Statement: [
                {
                    Effect: "Allow",
                    Principal: "*",
                    Action: "ecr:GetAuthorizationToken",
                    Resource: "*",
                },
                {
                    Effect: "Allow",
                    Principal: "*",
                    Action: [
                        "ecr:BatchCheckLayerAvailability",
                        "ecr:BatchGetImage",
                        "ecr:GetDownloadUrlForLayer",
                    ],
                    Resource: ecrRepositoryArns,
                },
            ],
        };

        const applicationBucketArns = [
            "alb-logs",
            "aurora-logs",
            "ecs-logs",
            "ec2-logs",
            "elasticache-logs",
            "lambda-logs",
            "sns-logs",
            "assets",
            "uploads",
        ].map(
            (suffix) =>
                `arn:aws:s3:::${commonProps.projectName}-${envProps.envName}-${suffix}`,
        );

        const s3EndpointPolicy = {
            Version: "2012-10-17",
            Statement: [
                {
                    Sid: "AllowEcrImageLayerDownloads",
                    Effect: "Allow",
                    Principal: "*",
                    Action: "s3:GetObject",
                    Resource: `arn:aws:s3:::${commonProps.projectName}-${envProps.envName}-starport-layer-bucket/*`,
                },
                {
                    Sid: "AllowProjectBucketListing",
                    Effect: "Allow",
                    Principal: "*",
                    Action: ["s3:ListBucket", "s3:ListBucketMultipartUploads"],
                    Resource: applicationBucketArns,
                },
                {
                    Sid: "AllowProjectBucketObjectAccess",
                    Effect: "Allow",
                    Principal: "*",
                    Action: [
                        "s3:AbortMultipartUpload",
                        "s3:GetObject",
                        "s3:ListMultipartUploadParts",
                        "s3:PutObject",
                    ],
                    Resource: applicationBucketArns.map(
                        (bucketArn) => `${bucketArn}/*`,
                    ),
                },
            ],
        };

        const kmsEndpointPolicy = {
            Version: "2012-10-17",
            Statement: [
                {
                    Effect: "Allow",
                    Principal: "*",
                    Action: [
                        "kms:Decrypt",
                        "kms:DescribeKey",
                        "kms:Encrypt",
                        "kms:GenerateDataKey",
                    ],
                    Resource: kmsProps.applicationKey.keyArn,
                },
            ],
        };

        const ssmEndpointPolicy = {
            Version: "2012-10-17",
            Statement: [
                {
                    Effect: "Allow",
                    Principal: "*",
                    Action: [
                        "ssm:DescribeAssociation",
                        "ssm:DescribeDocument",
                        "ssm:DescribeInstanceInformation",
                        "ssm:GetDeployablePatchSnapshotForInstance",
                        "ssm:GetDocument",
                        "ssm:GetManifest",
                        "ssm:GetParameter",
                        "ssm:GetParameters",
                        "ssm:GetParametersByPath",
                        "ssm:ListAssociations",
                        "ssm:ListInstanceAssociations",
                        "ssm:PutComplianceItems",
                        "ssm:PutInventory",
                        "ssm:PutConfigurePackageResult",
                        "ssm:SendCommand",
                        "ssm:StartSession",
                        "ssm:TerminateSession",
                        "ssm:ResumeSession",
                        "ssm:UpdateAssociationStatus",
                        "ssm:UpdateInstanceAssociationStatus",
                        "ssm:UpdateInstanceInformation",
                    ],
                    Resource: "*",
                },
            ],
        };

        const ssmMessagesEndpointPolicy = {
            Version: "2012-10-17",
            Statement: [
                {
                    Effect: "Allow",
                    Principal: "*",
                    Action: [
                        "ssmmessages:CreateControlChannel",
                        "ssmmessages:CreateDataChannel",
                        "ssmmessages:OpenControlChannel",
                        "ssmmessages:OpenDataChannel",
                    ],
                    Resource: "*",
                },
            ],
        };

        const ec2MessagesEndpointPolicy = {
            Version: "2012-10-17",
            Statement: [
                {
                    Effect: "Allow",
                    Principal: "*",
                    Action: [
                        "ec2messages:AcknowledgeMessage",
                        "ec2messages:DeleteMessage",
                        "ec2messages:FailMessage",
                        "ec2messages:GetEndpoint",
                        "ec2messages:GetMessages",
                        "ec2messages:SendReply",
                    ],
                    Resource: "*",
                },
            ],
        };

        const cloudWatchLogsEndpointPolicy = {
            Version: "2012-10-17",
            Statement: [
                {
                    Effect: "Allow",
                    Principal: "*",
                    Action: ["logs:CreateLogStream", "logs:PutLogEvents"],
                    Resource: `arn:aws:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:/ecs/${commonProps.projectName}/${envProps.envName}*:*`,
                },
            ],
        };

        // ------------------------------------------------------------
        // VPC Endpoint for Amazon ECR Docker Interface Configuration
        // ------------------------------------------------------------
        this.vpcEndpointECRDocker = new ec2.CfnVPCEndpoint(
            this,
            "vpcEndpointECRDocker",
            {
                vpcId: networkProps.vpcId,
                serviceName: `com.amazonaws.${cdk.Aws.REGION}.ecr.dkr`,
                vpcEndpointType: "Interface",
                policyDocument: ecrEndpointPolicy,
                securityGroupIds: [
                    sgProps.vpcEndPointECRSecurityGroup.securityGroupId,
                ],
                subnetIds: networkProps.privateSubnetIds,
                ipAddressType: "ipv4",
                privateDnsEnabled: true,
                dnsOptions: {
                    dnsRecordIpType: "ipv4",
                },
            },
        );

        cdk.Tags.of(this.vpcEndpointECRDocker).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-vpcendpoint-ecr-docker`,
        );
        cdk.Tags.of(this.vpcEndpointECRDocker).add("ProvisionedBy", "AWS");
        cdk.Tags.of(this.vpcEndpointECRDocker).add("ProjectCode", "1234567890");

        // ------------------------------------------------------------
        // VPC Endpoint for Amazon ECR API Interface Configuration
        // ------------------------------------------------------------
        this.vpcEndpointECRAPI = new ec2.CfnVPCEndpoint(
            this,
            "vpcEndpointECRAPI",
            {
                vpcId: networkProps.vpcId,
                serviceName: `com.amazonaws.${cdk.Aws.REGION}.ecr.api`,
                vpcEndpointType: "Interface",
                policyDocument: ecrEndpointPolicy,
                securityGroupIds: [
                    sgProps.vpcEndPointECRSecurityGroup.securityGroupId,
                ],
                subnetIds: networkProps.privateSubnetIds,
                ipAddressType: "ipv4",
                privateDnsEnabled: true,
                dnsOptions: {
                    dnsRecordIpType: "ipv4",
                },
            },
        );

        cdk.Tags.of(this.vpcEndpointECRAPI).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-vpcendpoint-ecr-api`,
        );
        cdk.Tags.of(this.vpcEndpointECRAPI).add("ProvisionedBy", "AWS");
        cdk.Tags.of(this.vpcEndpointECRAPI).add("ProjectCode", "1234567890");

        // ------------------------------------------------------------
        // VPC Endpoint for AWS KMS Interface Configuration
        // ------------------------------------------------------------
        this.vpcEndpointKMS = new ec2.CfnVPCEndpoint(this, "vpcEndpointKMS", {
            vpcId: networkProps.vpcId,
            serviceName: `com.amazonaws.${cdk.Aws.REGION}.kms`,
            vpcEndpointType: "Interface",
            policyDocument: kmsEndpointPolicy,
            securityGroupIds: [
                sgProps.vpcEndPointKMSSecurityGroup.securityGroupId,
            ],
            subnetIds: networkProps.privateSubnetIds,
            ipAddressType: "ipv4",
            privateDnsEnabled: true,
            dnsOptions: {
                dnsRecordIpType: "ipv4",
            },
        });

        cdk.Tags.of(this.vpcEndpointKMS).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-vpcendpoint-kms`,
        );
        cdk.Tags.of(this.vpcEndpointKMS).add("ProvisionedBy", "AWS");
        cdk.Tags.of(this.vpcEndpointKMS).add("ProjectCode", "1234567890");

        // ------------------------------------------------------------
        // VPC Endpoint for AWS Systems Manager Interface Configuration
        // All SSM endpoints share the same HTTPS clients and TCP 443 policy.
        // ------------------------------------------------------------
        this.vpcEndpointSSM = new ec2.CfnVPCEndpoint(this, "vpcEndpointSSM", {
            vpcId: networkProps.vpcId,
            serviceName: `com.amazonaws.${cdk.Aws.REGION}.ssm`,
            vpcEndpointType: "Interface",
            policyDocument: ssmEndpointPolicy,
            securityGroupIds: [
                sgProps.vpcEndPointSSMSecurityGroup.securityGroupId,
            ],
            subnetIds: networkProps.privateSubnetIds,
            ipAddressType: "ipv4",
            privateDnsEnabled: true,
            dnsOptions: {
                dnsRecordIpType: "ipv4",
            },
        });

        cdk.Tags.of(this.vpcEndpointSSM).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-vpcendpoint-ssm`,
        );
        cdk.Tags.of(this.vpcEndpointSSM).add("ProvisionedBy", "AWS");
        cdk.Tags.of(this.vpcEndpointSSM).add("ProjectCode", "1234567890");

        // ------------------------------------------------------------
        // VPC Endpoint for AWS Systems Manager Messages Interface Configuration
        // ------------------------------------------------------------
        this.vpcEndpointSSMEC2 = new ec2.CfnVPCEndpoint(
            this,
            "vpcEndpointSSMEC2",
            {
                vpcId: networkProps.vpcId,
                serviceName: `com.amazonaws.${cdk.Aws.REGION}.ssmmessages`,
                vpcEndpointType: "Interface",
                policyDocument: ssmMessagesEndpointPolicy,
                securityGroupIds: [
                    sgProps.vpcEndPointSSMSecurityGroup.securityGroupId,
                ],
                subnetIds: networkProps.privateSubnetIds,
                ipAddressType: "ipv4",
                privateDnsEnabled: true,
                dnsOptions: {
                    dnsRecordIpType: "ipv4",
                },
            },
        );

        cdk.Tags.of(this.vpcEndpointSSMEC2).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-vpcendpoint-ssm-messages`,
        );
        cdk.Tags.of(this.vpcEndpointSSMEC2).add("ProvisionedBy", "AWS");
        cdk.Tags.of(this.vpcEndpointSSMEC2).add("ProjectCode", "1234567890");

        // ------------------------------------------------------------
        // VPC Endpoint for AWS Systems Manager EC2 Messages Interface Configuration
        // ------------------------------------------------------------
        this.vpcEndpointSSMEC2Messages = new ec2.CfnVPCEndpoint(
            this,
            "vpcEndpointSSMEC2Messages",
            {
                vpcId: networkProps.vpcId,
                serviceName: `com.amazonaws.${cdk.Aws.REGION}.ec2messages`,
                vpcEndpointType: "Interface",
                policyDocument: ec2MessagesEndpointPolicy,
                securityGroupIds: [
                    sgProps.vpcEndPointSSMSecurityGroup.securityGroupId,
                ],
                subnetIds: networkProps.privateSubnetIds,
                ipAddressType: "ipv4",
                privateDnsEnabled: true,
                dnsOptions: {
                    dnsRecordIpType: "ipv4",
                },
            },
        );

        cdk.Tags.of(this.vpcEndpointSSMEC2Messages).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-vpcendpoint-ssm-ec2-messages`,
        );
        cdk.Tags.of(this.vpcEndpointSSMEC2Messages).add("ProvisionedBy", "AWS");
        cdk.Tags.of(this.vpcEndpointSSMEC2Messages).add(
            "ProjectCode",
            "1234567890",
        );

        // ------------------------------------------------------------
        // VPC Endpoint for Amazon CloudWatch Logs Interface Configuration
        // ------------------------------------------------------------
        this.vpcEndpointCloudWatchLogs = new ec2.CfnVPCEndpoint(
            this,
            "vpcEndpointCloudWatchLogs",
            {
                vpcId: networkProps.vpcId,
                serviceName: `com.amazonaws.${cdk.Aws.REGION}.logs`,
                vpcEndpointType: "Interface",
                policyDocument: cloudWatchLogsEndpointPolicy,
                securityGroupIds: [
                    sgProps.vpcEndPointCloudWatchLogsSecurityGroup
                        .securityGroupId,
                ],
                subnetIds: networkProps.privateSubnetIds,
                ipAddressType: "ipv4",
                privateDnsEnabled: true,
                dnsOptions: {
                    dnsRecordIpType: "ipv4",
                },
            },
        );

        cdk.Tags.of(this.vpcEndpointCloudWatchLogs).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-vpcendpoint-cloudwatch-logs`,
        );
        cdk.Tags.of(this.vpcEndpointCloudWatchLogs).add("ProvisionedBy", "AWS");
        cdk.Tags.of(this.vpcEndpointCloudWatchLogs).add(
            "ProjectCode",
            "1234567890",
        );

        // ------------------------------------------------------------
        // VPC Endpoint for Amazon S3 Gateway Configuration
        // ------------------------------------------------------------
        this.vpcEndpointS3 = new ec2.CfnVPCEndpoint(this, "vpcEndpointS3", {
            vpcId: networkProps.vpcId,
            serviceName: `com.amazonaws.${cdk.Aws.REGION}.s3`,
            vpcEndpointType: "Gateway",
            routeTableIds: networkProps.privateSubnetRouteTableIds,
            policyDocument: s3EndpointPolicy,
        });

        cdk.Tags.of(this.vpcEndpointS3).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-vpcendpoint-s3`,
        );
        cdk.Tags.of(this.vpcEndpointS3).add("ProvisionedBy", "AWS");
        cdk.Tags.of(this.vpcEndpointS3).add("ProjectCode", "1234567890");

        const existingLogicalIds: Array<[ec2.CfnVPCEndpoint, string]> = [
            [
                this.vpcEndpointECRDocker,
                "CfStorageStackvpcEndpointECRDocker71DED768",
            ],
            [this.vpcEndpointECRAPI, "CfStorageStackvpcEndpointECRAPI42CB2D4A"],
            [this.vpcEndpointKMS, "CfStorageStackvpcEndpointKMSB3B0C73F"],
            [this.vpcEndpointSSM, "CfStorageStackvpcEndpointSSM19389BD7"],
            [this.vpcEndpointSSMEC2, "CfStorageStackvpcEndpointSSMEC2612AD623"],
            [
                this.vpcEndpointSSMEC2Messages,
                "CfStorageStackvpcEndpointSSMEC2Messages859417F1",
            ],
            [
                this.vpcEndpointCloudWatchLogs,
                "CfStorageStackvpcEndpointCloudWatchLogsF91EF64B",
            ],
            [this.vpcEndpointS3, "CfStorageStackvpcEndpointS3E3B8086C"],
        ];
        for (const [endpoint, logicalId] of existingLogicalIds) {
            endpoint.overrideLogicalId(logicalId);
        }
    }
}
