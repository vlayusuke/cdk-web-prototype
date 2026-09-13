import * as cdk from "aws-cdk-lib";
import { aws_ec2 as ec2, aws_ecs as ecs, aws_iam as iam } from "aws-cdk-lib";
import { Construct } from "constructs";

export interface kmsProps {
    applicationKey: string;
    bastionKey: string;
}

export interface networkingProps {
    vpcId: string;
    subnetIds: string[];
}

export interface sgProps {
    bastionSecurityGroup: string;
}


// ------------------------------------------------------------
// [07] - Compute WebAP Stack
// ------------------------------------------------------------
export class CfComputeWebAPStack extends Construct {
    public readonly ec2IamInstanceProfile: iam.InstanceProfile;

    constructor(scope: Construct, id: string, kmsProps: kmsProps, networkingProps: networkingProps, sgProps: sgProps) {
        super(scope, id);

        // ------------------------------------------------------------
        // AWS IAM for EC2 Instance Profile Configuration
        // ------------------------------------------------------------
        const ec2IamRole = new iam.Role(this, 'ec2IamRole', {
            roleName: 'ec2IamRole',
            description: 'EC2 IAM Role for instance profile',
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
        });

        cdk.Tags.of(ec2IamRole).add('Name', 'ec2IamRole');
        cdk.Tags.of(ec2IamRole).add('ProvisionedBy', 'AWS');

        const ec2IamPolicy = new iam.Policy(this, 'ec2IamPolicy', {
            statements: [
                new iam.PolicyStatement({
                    sid: 'S3Access',
                    actions: ['s3:ListBucket', 's3:GetObject', 's3:PutObject'],
                    resources: [`arn:aws:s3:::*`],
                }),
            ],
        });

        cdk.Tags.of(ec2IamPolicy).add('Name', 'ec2IamPolicy');
        cdk.Tags.of(ec2IamPolicy).add('ProvisionedBy', 'AWS');

        ec2IamPolicy.attachToRole(ec2IamRole);

        this.ec2IamInstanceProfile = new iam.InstanceProfile(this, 'ec2IamInstanceProfile', {
            instanceProfileName: 'ec2IamInstanceProfile',
            role: ec2IamRole,
        });

        cdk.Tags.of(this.ec2IamInstanceProfile).add('Name', 'ec2IamInstanceProfile');
        cdk.Tags.of(this.ec2IamInstanceProfile).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // Amazon ECS Cluster Configuration
        // ------------------------------------------------------------
        const ecsCluster = new ecs.Cluster(this, 'ecsCluster', {
            clusterName: 'EcsCluster',
            containerInsights: true,
            // Registers FARGATE and FARGATE_SPOT as capacity providers on the cluster.
            enableFargateCapacityProviders: true,
        });

        ecsCluster.addDefaultCapacityProviderStrategy([
            { capacityProvider: 'FARGATE', base: 1, weight: 1 },
        ]);

        cdk.Tags.of(ecsCluster).add('Name', 'EcsCluster');
        cdk.Tags.of(ecsCluster).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // Amazon EC2 Bastion Key Pair Configuration
        // ------------------------------------------------------------
        const bastionKeyPair = new ec2.KeyPair(this, 'bastionKeyPair', {
            keyPairName: 'BastionKeyPair',
            publicKeyMaterial: kmsProps.bastionKey,
            type: ec2.KeyPairType.ED25519,
            format: ec2.KeyPairFormat.PEM,
        });


        // ------------------------------------------------------------
        // Amazon EC2 Bastion Configuration
        // ------------------------------------------------------------
        const ec2InstanceBastion = new ec2.Instance(this, 'ec2InstanceBastion', {
            instanceName: 'Ec2InstanceBastion',
            instanceType: new ec2.InstanceType('t4g.medium'),
            machineImage: ec2.MachineImage.latestAmazonLinux2023(),
            vpc: ec2.Vpc.fromVpcAttributes(this, 'vpc', {
                vpcId: networkingProps.vpcId,
                availabilityZones: ['ap-northeast-1a'],
                publicSubnetIds: [networkingProps.subnetIds[0]],
            }),
            securityGroup: ec2.SecurityGroup.fromSecurityGroupId(this, 'bastionSecurityGroup', sgProps.bastionSecurityGroup),
            instanceProfile: this.ec2IamInstanceProfile,
            keyName: kmsProps.bastionKey,
            disableApiTermination: true,
            detailedMonitoring: true,
            allowAllIpv6Outbound: false,
            ssmSessionPermissions: true,
            keyPair: bastionKeyPair,
            creditSpecification: ec2.CpuCredits.STANDARD,
            blockDevices: [
                {
                    mappingEnabled: true,
                    deviceName: '/dev/xvda',
                    volume: ec2.BlockDeviceVolume.ebs(8, {
                        encrypted: true,
                    }),
                },
                {
                    mappingEnabled: true,
                    deviceName: '/dev/xvdb',
                    volume: ec2.BlockDeviceVolume.ebs(64, {
                        encrypted: true,
                    }),
                }
            ],
        });

        cdk.Tags.of(ec2InstanceBastion).add('Name', 'Ec2InstanceBastion');
        cdk.Tags.of(ec2InstanceBastion).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // EIP for Amazon EC2 Bastion Configuration
        // ------------------------------------------------------------
        const bastionEip = new ec2.CfnEIP(this, 'bastionEip', {
            domain: 'vpc',
        });

        cdk.Tags.of(bastionEip).add('Name', 'BastionEip');
        cdk.Tags.of(bastionEip).add('ProvisionedBy', 'AWS');

        new ec2.CfnEIPAssociation(this, 'bastionEipAssociation', {
            allocationId: bastionEip.attrAllocationId,
            instanceId: ec2InstanceBastion.instanceId,
        });
    }
}
