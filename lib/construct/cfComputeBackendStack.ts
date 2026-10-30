import * as cdk from "aws-cdk-lib";
import { aws_ec2 as ec2, aws_iam as iam } from "aws-cdk-lib";
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

export interface NetworkingProps {
    vpcId: string;
    privateSubnetIds: string[];
    privateSubnetRouteTableIds: string[];
    availabilityZones: [string, string];
}

export interface SgProps {
    batchSecurityGroup: ec2.ISecurityGroup;
}

export interface DatabaseProps {
    auroraClusterArn: string;
    auroraWriterInstanceArn: string;
    auroraReaderInstanceArn: string;
    elastiCacheReplicationGroupArn: string;
}

// ************************************************************
// [08] - Compute Backend Stack
// ************************************************************
export class CfComputeBackendStack extends Construct {
    constructor(
        scope: Construct,
        id: string,
        networkingProps: NetworkingProps,
        sgProps: SgProps,
        databaseProps: DatabaseProps,
        commonProps: CommonProps,
        envProps: EnvProps,
    ) {
        super(scope, id);

        // ------------------------------------------------------------
        // Applies the common Name / ProvisionedBy / ProjectCode tags to a construct.
        // ------------------------------------------------------------
        const tagAll = (target: Construct, name: string) => {
            cdk.Tags.of(target).add("Name", name);
            cdk.Tags.of(target).add("ProvisionedBy", "AWS");
            cdk.Tags.of(target).add("ProjectCode", "1234567890");
        };

        // ------------------------------------------------------------
        // Prefix for resource names
        // ------------------------------------------------------------
        const prefix = `${commonProps.projectName}-${envProps.envName}`;

        // ------------------------------------------------------------
        // AWS IAM EC2 Instance Profile for Batch Configuration
        // ------------------------------------------------------------
        const ec2IamRoleForBatchScope = new Construct(
            this,
            "ec2IamRoleForBatch",
        );

        const ec2IamRoleForBatch = new iam.CfnRole(
            ec2IamRoleForBatchScope,
            "Resource",
            {
                roleName: `${prefix}-iam-role-for-batch`,
                description: "IAM EC2 instance profile for Batch",
                assumeRolePolicyDocument: {
                    Version: "2012-10-17",
                    Statement: [
                        {
                            Effect: "Allow",
                            Principal: { Service: "ec2.amazonaws.com" },
                            Action: "sts:AssumeRole",
                        },
                    ],
                },
                managedPolicyArns: [
                    `arn:${cdk.Aws.PARTITION}:iam::aws:policy/AmazonSSMManagedInstanceCore`,
                ],
            },
        );

        tagAll(ec2IamRoleForBatchScope, `${prefix}-iam-role-for-batch`);

        const ec2IamPolicyForBatchScope = new Construct(
            this,
            "ec2IamPolicyForBatch",
        );

        new iam.CfnManagedPolicy(ec2IamPolicyForBatchScope, "Resource", {
            managedPolicyName: `${prefix}-iam-policy-for-batch`,
            roles: [ec2IamRoleForBatch.ref],
            policyDocument: {
                Version: "2012-10-17",
                Statement: [
                    {
                        Sid: "SSMAccess",
                        Effect: "Allow",
                        Action: ["ssm:StartSession", "ssm:SendCommand"],
                        Resource: [
                            `arn:aws:ssm:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:document/AWS-StartSession`,
                        ],
                    },
                    {
                        Sid: "AuroraAccess",
                        Effect: "Allow",
                        Action: ["rds:DescribeDBInstances", "rds:Connect"],
                        Resource: [
                            databaseProps.auroraClusterArn,
                            databaseProps.auroraWriterInstanceArn,
                            databaseProps.auroraReaderInstanceArn,
                        ],
                    },
                ],
            },
        });

        tagAll(ec2IamPolicyForBatchScope, `${prefix}-iam-policy-for-batch`);

        const ec2IamInstanceProfileScope = new Construct(
            this,
            "ec2IamInstanceProfileForBatch",
        );

        const ec2IamInstanceProfileForBatch = new iam.CfnInstanceProfile(
            ec2IamInstanceProfileScope,
            "Resource",
            {
                instanceProfileName: `${prefix}-iam-instance-profile-for-batch`,
                roles: [ec2IamRoleForBatch.ref],
            },
        );

        tagAll(
            ec2IamInstanceProfileScope,
            `${prefix}-iam-instance-profile-for-batch`,
        );

        // ------------------------------------------------------------
        // Amazon EC2 Batch Key Pair Configuration
        // ------------------------------------------------------------
        const batchKeyPairScope = new Construct(this, "batchKeyPair");

        const batchKeyPair = new ec2.CfnKeyPair(batchKeyPairScope, "Resource", {
            keyName: `${prefix}-batch-key-pair`,
            keyType: "ed25519",
            keyFormat: "pem",
        });

        tagAll(batchKeyPairScope, `${prefix}-batch-key-pair`);

        // ------------------------------------------------------------
        // Amazon EC2 Batch Configuration (AZ-a / AZ-c)
        // ------------------------------------------------------------
        const createBatchInstance = (
            id: string,
            azSuffix: "a" | "c",
            index: 0 | 1,
        ) => {
            const scope = new Construct(this, id);

            const instance = new ec2.CfnInstance(scope, "Resource", {
                imageId:
                    "{{resolve:ssm:/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64}}",
                instanceType: "t4g.small",
                subnetId: networkingProps.privateSubnetIds[index],
                securityGroupIds: [sgProps.batchSecurityGroup.securityGroupId],
                iamInstanceProfile: ec2IamInstanceProfileForBatch.ref,
                keyName: batchKeyPair.ref,
                disableApiTermination: true,
                monitoring: true,
                // Instance tags are propagated to every EBS block device volume.
                propagateTagsToVolumeOnCreation: true,
                creditSpecification: { cpuCredits: "standard" },
                blockDeviceMappings: [
                    {
                        deviceName: "/dev/xvda",
                        ebs: {
                            volumeType: "gp3",
                            volumeSize: 8,
                            encrypted: true,
                            deleteOnTermination: false,
                        },
                    },
                    {
                        deviceName: "/dev/xvdb",
                        ebs: {
                            volumeType: "gp3",
                            volumeSize: 256,
                            encrypted: true,
                            deleteOnTermination: false,
                        },
                    },
                ],
            });

            tagAll(scope, `${prefix}-ec2-instance-batch-az-${azSuffix}`);

            return instance;
        };

        const ec2InstanceBatchAZa = createBatchInstance(
            "ec2InstanceBatchAZa",
            "a",
            0,
        );

        const ec2InstanceBatchAZc = createBatchInstance(
            "ec2InstanceBatchAZc",
            "c",
            1,
        );

        // ------------------------------------------------------------
        // EIP for Amazon EC2 Batch (AZ-a) Configuration
        // ------------------------------------------------------------
        const batchEipAZa = new ec2.CfnEIP(this, "batchEipAZa", {
            domain: "vpc",
        });

        cdk.Tags.of(batchEipAZa).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-batch-eip-az-a`,
        );
        cdk.Tags.of(batchEipAZa).add("ProvisionedBy", "AWS");
        cdk.Tags.of(batchEipAZa).add("ProjectCode", "1234567890");

        new ec2.CfnEIPAssociation(this, "batchEipAssociationAZa", {
            allocationId: batchEipAZa.attrAllocationId,
            instanceId: ec2InstanceBatchAZa.ref,
        });

        // ------------------------------------------------------------
        // EIP for Amazon EC2 Batch (AZ-c) Configuration
        // ------------------------------------------------------------
        const batchEipAZc = new ec2.CfnEIP(this, "batchEipAZc", {
            domain: "vpc",
        });

        cdk.Tags.of(batchEipAZc).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-batch-eip-az-c`,
        );
        cdk.Tags.of(batchEipAZc).add("ProvisionedBy", "AWS");
        cdk.Tags.of(batchEipAZc).add("ProjectCode", "1234567890");

        new ec2.CfnEIPAssociation(this, "batchEipAssociationAZc", {
            allocationId: batchEipAZc.attrAllocationId,
            instanceId: ec2InstanceBatchAZc.ref,
        });
    }
}
