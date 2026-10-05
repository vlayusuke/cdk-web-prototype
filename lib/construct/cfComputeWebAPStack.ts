import * as cdk from "aws-cdk-lib";
import { aws_ec2 as ec2, aws_ecs as ecs, aws_iam as iam } from "aws-cdk-lib";
import { Construct } from "constructs";

export interface commonProps {
    projectName: string;
    dashboardName: string;
}

export interface envProps {
    envName: string;
    vpcCidr: string;
    defaultGatewayCidr: string;
}

export interface networkingProps {
    vpcId: string;
    publicSubnetIds: string[];
    publicSubnetRouteTableIds: string[];
    availabilityZones: [string, string];
    defaultGatewayCidr: string;
}

export interface sgProps {
    bastionSecurityGroup: ec2.SecurityGroup;
}

// ------------------------------------------------------------
// [07] - Compute WebAP Stack
// ------------------------------------------------------------
export class cfComputeWebAPStack extends Construct {
    public readonly ecsCluster: ecs.Cluster;

    constructor(
        scope: Construct,
        id: string,
        networkingProps: networkingProps,
        sgProps: sgProps,
        commonProps: commonProps,
        envProps: envProps,
    ) {
        super(scope, id);

        // ------------------------------------------------------------
        // AWS IAM EC2 Instance Profile for Bastion Configuration
        // ------------------------------------------------------------
        const ec2IamRoleForBastion = new iam.Role(
            this,
            "ec2IamRoleForBastion",
            {
                roleName: "ec2IamRoleForBastion",
                description: "IAM EC2 instance profile for Bastion",
                assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
            },
        );

        cdk.Tags.of(ec2IamRoleForBastion).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-iam-role-for-bastion`,
        );
        cdk.Tags.of(ec2IamRoleForBastion).add("ProvisionedBy", "AWS");

        const ec2IamPolicyForBastion = new iam.Policy(
            this,
            "ec2IamPolicyForBastion",
            {
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
                        sid: "S3Access",
                        effect: iam.Effect.ALLOW,
                        actions: [
                            "s3:ListBucket",
                            "s3:GetObject",
                            "s3:PutObject",
                        ],
                        resources: [`arn:aws:s3:::*`],
                    }),
                ],
            },
        );

        cdk.Tags.of(ec2IamPolicyForBastion).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-iam-policy-for-bastion`,
        );
        cdk.Tags.of(ec2IamPolicyForBastion).add("ProvisionedBy", "AWS");

        ec2IamPolicyForBastion.attachToRole(ec2IamRoleForBastion);

        ec2IamRoleForBastion.addManagedPolicy(
            iam.ManagedPolicy.fromAwsManagedPolicyName(
                "AmazonSSMManagedInstanceCore",
            ),
        );

        const ec2IamInstanceProfileForBastion = new iam.InstanceProfile(
            this,
            "ec2IamInstanceProfileForBastion",
            {
                instanceProfileName: "ec2IamInstanceProfileForBastion",
                role: ec2IamRoleForBastion,
            },
        );

        cdk.Tags.of(ec2IamInstanceProfileForBastion).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-iam-instance-profile-for-bastion`,
        );
        cdk.Tags.of(ec2IamInstanceProfileForBastion).add(
            "ProvisionedBy",
            "AWS",
        );

        // ------------------------------------------------------------
        // Amazon ECS Cluster Configuration
        // ------------------------------------------------------------
        this.ecsCluster = new ecs.Cluster(this, "ecsCluster", {
            clusterName: `${commonProps.projectName}-${envProps.envName}-ecs-cluster`,
            containerInsightsV2: ecs.ContainerInsights.ENABLED,
            // Registers FARGATE and FARGATE_SPOT as capacity providers on the cluster.
            enableFargateCapacityProviders: true,
        });

        this.ecsCluster.addDefaultCapacityProviderStrategy([
            { capacityProvider: "FARGATE", base: 1, weight: 1 },
            { capacityProvider: "FARGATE_SPOT", base: 0, weight: 1 },
        ]);

        cdk.Tags.of(this.ecsCluster).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-ecs-cluster`,
        );
        cdk.Tags.of(this.ecsCluster).add("ProvisionedBy", "AWS");

        // ------------------------------------------------------------
        // Amazon EC2 Bastion Key Pair Configuration
        // ------------------------------------------------------------
        const bastionKeyPair = new ec2.KeyPair(this, "bastionKeyPair", {
            keyPairName: `${commonProps.projectName}-${envProps.envName}-bastion-key-pair`,
            type: ec2.KeyPairType.ED25519,
            format: ec2.KeyPairFormat.PEM,
        });

        // ------------------------------------------------------------
        // Amazon EC2 Bastion Configuration
        // ------------------------------------------------------------
        const ec2InstanceBastion = new ec2.Instance(
            this,
            "ec2InstanceBastion",
            {
                instanceName: `${commonProps.projectName}-${envProps.envName}-ec2-instance-bastion`,
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
                securityGroup: sgProps.bastionSecurityGroup,
                instanceProfile: ec2IamInstanceProfileForBastion,
                disableApiTermination: true,
                detailedMonitoring: true,
                allowAllIpv6Outbound: false,
                propagateTagsToVolumeOnCreation: true,
                ssmSessionPermissions: true,
                keyPair: bastionKeyPair,
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
                        volume: ec2.BlockDeviceVolume.ebs(64, {
                            volumeType: ec2.EbsDeviceVolumeType.GP3,
                            encrypted: true,
                            deleteOnTermination: true,
                        }),
                    },
                ],
            },
        );

        cdk.Tags.of(ec2InstanceBastion).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-ec2-instance-bastion`,
        );
        cdk.Tags.of(ec2InstanceBastion).add("ProvisionedBy", "AWS");

        // ------------------------------------------------------------
        // EIP for Amazon EC2 Bastion Configuration
        // ------------------------------------------------------------
        const bastionEip = new ec2.CfnEIP(this, "bastionEip", {
            domain: "vpc",
        });

        cdk.Tags.of(bastionEip).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-bastion-eip`,
        );
        cdk.Tags.of(bastionEip).add("ProvisionedBy", "AWS");

        new ec2.CfnEIPAssociation(this, "bastionEipAssociation", {
            allocationId: bastionEip.attrAllocationId,
            instanceId: ec2InstanceBastion.instanceId,
        });
    }
}
