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
    bastionSecurityGroup: ec2.SecurityGroup;
}


// ------------------------------------------------------------
// [07] - Compute WebAP Stack
// ------------------------------------------------------------
export class cfComputeWebAPStack extends Construct {

    constructor(scope: Construct, id: string, kmsProps: kmsProps, networkingProps: networkingProps, sgProps: sgProps) {
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

        cdk.Tags.of(ec2IamRoleForBastion).add('Name', 'ec2IamRoleForBastion');
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

        cdk.Tags.of(ec2IamPolicyForBastion).add('Name', 'ec2IamPolicyForBastion');
        cdk.Tags.of(ec2IamPolicyForBastion).add('ProvisionedBy', 'AWS');

        ec2IamPolicyForBastion.attachToRole(ec2IamRoleForBastion);

        const ec2IamInstanceProfileForBastion = new iam.InstanceProfile(this, 'ec2IamInstanceProfileForBastion', {
            instanceProfileName: 'ec2IamInstanceProfileForBastion',
            role: ec2IamRoleForBastion,
        });

        cdk.Tags.of(ec2IamInstanceProfileForBastion).add('Name', 'ec2IamInstanceProfileForBastion');
        cdk.Tags.of(ec2IamInstanceProfileForBastion).add('ProvisionedBy', 'AWS');


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
            { capacityProvider: 'FARGATE_SPOT', base: 0, weight: 1 },
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
            securityGroup: sgProps.bastionSecurityGroup,
            instanceProfile: ec2IamInstanceProfileForBastion,
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
