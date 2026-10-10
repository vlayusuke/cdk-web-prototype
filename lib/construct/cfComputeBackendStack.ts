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
    publicSubnetIds: string[];
    publicSubnetRouteTableIds: string[];
    availabilityZones: [string, string];
}

export interface SgProps {
    batchSecurityGroup: ec2.SecurityGroup;
}

// ------------------------------------------------------------
// [08] - Compute Backend Stack
// ------------------------------------------------------------
export class CfComputeBackendStack extends Construct {
    constructor(
        scope: Construct,
        id: string,
        networkingProps: NetworkingProps,
        sgProps: SgProps,
        commonProps: CommonProps,
        envProps: EnvProps,
    ) {
        super(scope, id);

        // ------------------------------------------------------------
        // AWS IAM EC2 Instance Profile for Batch Configuration
        // ------------------------------------------------------------
        const ec2IamRoleForBatch = new iam.Role(this, "ec2IamRoleForBatch", {
            roleName: "ec2IamRoleForBatch",
            description: "IAM EC2 instance profile for Batch",
            assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
        });

        cdk.Tags.of(ec2IamRoleForBatch).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-iam-role-for-batch`,
        );
        cdk.Tags.of(ec2IamRoleForBatch).add("ProvisionedBy", "AWS");
        cdk.Tags.of(ec2IamRoleForBatch).add("ProjectCode", "1234567890");

        const ec2IamPolicyForBatch = new iam.Policy(
            this,
            "ec2IamPolicyForBatch",
            {
                policyName: "ec2IamPolicyForBatch",
                statements: [
                    new iam.PolicyStatement({
                        sid: "SSMAccess",
                        effect: iam.Effect.ALLOW,
                        actions: ["ssm:StartSession", "ssm:SendCommand"],
                        resources: [
                            `arn:aws:ssm:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:document/AWS-StartSession`,
                        ],
                    }),
                    new iam.PolicyStatement({
                        sid: "RDSAccess",
                        effect: iam.Effect.ALLOW,
                        actions: [
                            "rds-db:connect",
                            "rds-data:ExecuteStatement",
                        ],
                        resources: [
                            `arn:aws:rds:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:db:*`,
                        ],
                    }),
                ],
            },
        );

        cdk.Tags.of(ec2IamPolicyForBatch).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-iam-policy-for-batch`,
        );
        cdk.Tags.of(ec2IamPolicyForBatch).add("ProvisionedBy", "AWS");
        cdk.Tags.of(ec2IamPolicyForBatch).add("ProjectCode", "1234567890");

        ec2IamPolicyForBatch.attachToRole(ec2IamRoleForBatch);

        ec2IamRoleForBatch.addManagedPolicy(
            iam.ManagedPolicy.fromAwsManagedPolicyName(
                "AmazonSSMManagedInstanceCore",
            ),
        );

        const ec2IamInstanceProfileForBatch = new iam.InstanceProfile(
            this,
            "ec2IamInstanceProfileForBatch",
            {
                instanceProfileName: "ec2IamInstanceProfileForBatch",
                role: ec2IamRoleForBatch,
            },
        );

        cdk.Tags.of(ec2IamInstanceProfileForBatch).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-iam-instance-profile-for-batch`,
        );
        cdk.Tags.of(ec2IamInstanceProfileForBatch).add("ProvisionedBy", "AWS");
        cdk.Tags.of(ec2IamInstanceProfileForBatch).add(
            "ProjectCode",
            "1234567890",
        );

        // ------------------------------------------------------------
        // Amazon EC2 Batch Key Pair Configuration
        // ------------------------------------------------------------
        const batchKeyPair = new ec2.KeyPair(this, "batchKeyPair", {
            keyPairName: `${commonProps.projectName}-${envProps.envName}-batch-key-pair`,
            type: ec2.KeyPairType.ED25519,
            format: ec2.KeyPairFormat.PEM,
        });
        cdk.Tags.of(batchKeyPair).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-batch-key-pair`,
        );
        cdk.Tags.of(batchKeyPair).add("ProvisionedBy", "AWS");
        cdk.Tags.of(batchKeyPair).add("ProjectCode", "1234567890");

        // ------------------------------------------------------------
        // Amazon EC2 Batch (AZ-a) Configuration
        // ------------------------------------------------------------
        const ec2InstanceBatchAZa = new ec2.Instance(
            this,
            "ec2InstanceBatchAZa",
            {
                instanceName: `${commonProps.projectName}-${envProps.envName}-ec2-instance-batch-az-a`,
                instanceType: new ec2.InstanceType("t4g.small"),
                machineImage: ec2.MachineImage.latestAmazonLinux2023({
                    cpuType: ec2.AmazonLinuxCpuType.ARM_64,
                }),
                vpc: ec2.Vpc.fromVpcAttributes(this, "vpc", {
                    vpcId: networkingProps.vpcId,
                    availabilityZones: [networkingProps.availabilityZones[0]],
                    publicSubnetIds: [networkingProps.publicSubnetIds[0]],
                    publicSubnetRouteTableIds: [
                        networkingProps.publicSubnetRouteTableIds[0],
                    ],
                }),
                securityGroup: sgProps.batchSecurityGroup,
                instanceProfile: ec2IamInstanceProfileForBatch,
                disableApiTermination: true,
                detailedMonitoring: true,
                allowAllIpv6Outbound: false,
                propagateTagsToVolumeOnCreation: true,
                ssmSessionPermissions: true,
                keyPair: batchKeyPair,
                creditSpecification: ec2.CpuCredits.STANDARD,
                blockDevices: [
                    {
                        mappingEnabled: true,
                        deviceName: "/dev/xvda",
                        volume: ec2.BlockDeviceVolume.ebs(8, {
                            volumeType: ec2.EbsDeviceVolumeType.GP3,
                            encrypted: true,
                            deleteOnTermination: false,
                        }),
                    },
                    {
                        mappingEnabled: true,
                        deviceName: "/dev/xvdb",
                        volume: ec2.BlockDeviceVolume.ebs(256, {
                            volumeType: ec2.EbsDeviceVolumeType.GP3,
                            encrypted: true,
                            deleteOnTermination: false,
                        }),
                    },
                ],
            },
        );

        cdk.Tags.of(ec2InstanceBatchAZa).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-ec2-instance-batch-az-a`,
        );
        cdk.Tags.of(ec2InstanceBatchAZa).add("ProvisionedBy", "AWS");
        cdk.Tags.of(ec2InstanceBatchAZa).add("ProjectCode", "1234567890");

        // ------------------------------------------------------------
        // Amazon EC2 Batch (AZ-c) Configuration
        // ------------------------------------------------------------
        const ec2InstanceBatchAZc = new ec2.Instance(
            this,
            "ec2InstanceBatchAZc",
            {
                instanceName: `${commonProps.projectName}-${envProps.envName}-ec2-instance-batch-az-c`,
                instanceType: new ec2.InstanceType("t4g.small"),
                machineImage: ec2.MachineImage.latestAmazonLinux2023({
                    cpuType: ec2.AmazonLinuxCpuType.ARM_64,
                }),
                vpc: ec2.Vpc.fromVpcAttributes(this, "vpcAZc", {
                    vpcId: networkingProps.vpcId,
                    availabilityZones: [networkingProps.availabilityZones[1]],
                    publicSubnetIds: [networkingProps.publicSubnetIds[1]],
                    publicSubnetRouteTableIds: [
                        networkingProps.publicSubnetRouteTableIds[1],
                    ],
                }),
                securityGroup: sgProps.batchSecurityGroup,
                instanceProfile: ec2IamInstanceProfileForBatch,
                disableApiTermination: true,
                detailedMonitoring: true,
                allowAllIpv6Outbound: false,
                propagateTagsToVolumeOnCreation: true,
                ssmSessionPermissions: true,
                keyPair: batchKeyPair,
                creditSpecification: ec2.CpuCredits.STANDARD,
                blockDevices: [
                    {
                        mappingEnabled: true,
                        deviceName: "/dev/xvda",
                        volume: ec2.BlockDeviceVolume.ebs(8, {
                            volumeType: ec2.EbsDeviceVolumeType.GP3,
                            encrypted: true,
                            deleteOnTermination: false,
                        }),
                    },
                    {
                        mappingEnabled: true,
                        deviceName: "/dev/xvdb",
                        volume: ec2.BlockDeviceVolume.ebs(256, {
                            volumeType: ec2.EbsDeviceVolumeType.GP3,
                            encrypted: true,
                            deleteOnTermination: false,
                        }),
                    },
                ],
            },
        );

        cdk.Tags.of(ec2InstanceBatchAZc).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-ec2-instance-batch-az-c`,
        );
        cdk.Tags.of(ec2InstanceBatchAZc).add("ProvisionedBy", "AWS");
        cdk.Tags.of(ec2InstanceBatchAZc).add("ProjectCode", "1234567890");

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
            instanceId: ec2InstanceBatchAZa.instanceId,
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
            instanceId: ec2InstanceBatchAZc.instanceId,
        });
    }
}
