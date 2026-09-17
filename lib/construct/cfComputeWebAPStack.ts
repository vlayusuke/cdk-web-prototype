import * as cdk from "aws-cdk-lib";
import { aws_ec2 as ec2, aws_ecs as ecs, aws_iam as iam } from "aws-cdk-lib";
import type * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from "constructs";

export interface commonProps {
    projectName: string;
    envName: string;
}

export interface pocProps {
  vpcCidr: string;
  defaultGatewayCidr: string;
}

export interface kmsProps {
    applicationKey: kms.Key;
    bastionKey: kms.Key;
}

export interface networkingProps {
    vpcId: string;
    subnetIds: string[];
}

export interface sgProps {
    bastionSecurityGroup: ec2.SecurityGroup;
}


// ------------------------------------------------------------
// [07] - Compute WebAP Stack
// ------------------------------------------------------------
export class cfComputeWebAPStack extends Construct {
    public readonly ecsCluster: ecs.Cluster;

    constructor(scope: Construct, id: string, kmsProps: kmsProps, networkingProps: networkingProps, sgProps: sgProps, commonProps: commonProps) {
        super(scope, id);

        // ------------------------------------------------------------
        // AWS IAM EC2 Instance Profile for Bastion Configuration
        // ------------------------------------------------------------
        const ec2IamRoleForBastion = new iam.Role(this, 'ec2IamRoleForBastion', {
            roleName: 'ec2IamRoleForBastion',
            description: 'IAM EC2 instance profile for Bastion',
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
        });

        ec2IamRoleForBastion.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));
        ec2IamRoleForBastion.addToPolicy(new iam.PolicyStatement({
            sid: 'SSMAccess',
            actions: ['ssm:StartSession', 'ssm:SendCommand'],
            resources: [ `arn:aws:ssm:${cdk.Stack.of(this).account}:${cdk.Stack.of(this).region}:document/AWS-StartSession` ],
        }));

        cdk.Tags.of(ec2IamRoleForBastion).add('Name', `${commonProps.projectName}-${commonProps.envName}-iam-role-for-bastion`);
        cdk.Tags.of(ec2IamRoleForBastion).add('ProvisionedBy', 'AWS');

        const ec2IamPolicyForBastion = new iam.Policy(this, 'ec2IamPolicyForBastion', {
            statements: [
                new iam.PolicyStatement({
                    sid: 'S3Access',
                    actions: ['s3:ListBucket', 's3:GetObject', 's3:PutObject'],
                    resources: [`arn:aws:s3:::*`],
                }),
            ],
        });

        cdk.Tags.of(ec2IamPolicyForBastion).add('Name', `${commonProps.projectName}-${commonProps.envName}-iam-policy-for-bastion`);
        cdk.Tags.of(ec2IamPolicyForBastion).add('ProvisionedBy', 'AWS');

        ec2IamPolicyForBastion.attachToRole(ec2IamRoleForBastion);

        const ec2IamInstanceProfileForBastion = new iam.InstanceProfile(this, 'ec2IamInstanceProfileForBastion', {
            instanceProfileName: 'ec2IamInstanceProfileForBastion',
            role: ec2IamRoleForBastion,
        });

        cdk.Tags.of(ec2IamInstanceProfileForBastion).add('Name', `${commonProps.projectName}-${commonProps.envName}-iam-instance-profile-for-bastion`);
        cdk.Tags.of(ec2IamInstanceProfileForBastion).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // Amazon ECS Cluster Configuration
        // ------------------------------------------------------------
        this.ecsCluster = new ecs.Cluster(this, 'ecsCluster', {
            clusterName: 'EcsCluster',
            containerInsights: true,
            // Registers FARGATE and FARGATE_SPOT as capacity providers on the cluster.
            enableFargateCapacityProviders: true,
        });

        this.ecsCluster.addDefaultCapacityProviderStrategy([
            { capacityProvider: 'FARGATE', base: 1, weight: 1 },
            { capacityProvider: 'FARGATE_SPOT', base: 0, weight: 1 },
        ]);

        cdk.Tags.of(this.ecsCluster).add('Name', `${commonProps.projectName}-${commonProps.envName}-ecs-cluster`);
        cdk.Tags.of(this.ecsCluster).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // Amazon EC2 Bastion Key Pair Configuration
        // ------------------------------------------------------------
        const bastionKeyPair = new ec2.KeyPair(this, 'bastionKeyPair', {
            keyPairName: `${commonProps.projectName}-${commonProps.envName}-bastion-key-pair`,
            publicKeyMaterial: kmsProps.bastionKey.keyId,
            type: ec2.KeyPairType.ED25519,
            format: ec2.KeyPairFormat.PEM,
        });


        // ------------------------------------------------------------
        // Amazon EC2 Bastion Configuration
        // ------------------------------------------------------------
        const ec2InstanceBastion = new ec2.Instance(this, 'ec2InstanceBastion', {
            instanceName: `${commonProps.projectName}-${commonProps.envName}-ec2-instance-bastion`,
            instanceType: new ec2.InstanceType('t4g.medium'),
            machineImage: ec2.MachineImage.latestAmazonLinux2023(),
            vpc: ec2.Vpc.fromVpcAttributes(this, 'vpc', {
                vpcId: networkingProps.vpcId,
                availabilityZones: ['ap-northeast-1a'],
                publicSubnetIds: [networkingProps.subnetIds[0]],
            }),
            securityGroup: sgProps.bastionSecurityGroup,
            instanceProfile: ec2IamInstanceProfileForBastion,
            keyName: kmsProps.bastionKey.keyId,
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

        cdk.Tags.of(ec2InstanceBastion).add('Name', `${commonProps.projectName}-${commonProps.envName}-ec2-instance-bastion`);
        cdk.Tags.of(ec2InstanceBastion).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // EIP for Amazon EC2 Bastion Configuration
        // ------------------------------------------------------------
        const bastionEip = new ec2.CfnEIP(this, 'bastionEip', {
            domain: 'vpc',
        });

        cdk.Tags.of(bastionEip).add('Name', `${commonProps.projectName}-${commonProps.envName}-bastion-eip`);
        cdk.Tags.of(bastionEip).add('ProvisionedBy', 'AWS');

        new ec2.CfnEIPAssociation(this, 'bastionEipAssociation', {
            allocationId: bastionEip.attrAllocationId,
            instanceId: ec2InstanceBastion.instanceId,
        });
    }
}
