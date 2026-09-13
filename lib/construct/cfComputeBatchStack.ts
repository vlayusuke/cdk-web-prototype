import * as cdk from 'aws-cdk-lib';
import { aws_ec2 as ec2, aws_iam as iam } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface kmsProps {
    applicationKey: string;
    bastionKey: string;
}

export interface networkingProps {
    vpcId: string;
    subnetIds: string[];
}

export interface sgProps {
    batchSecurityGroup: ec2.SecurityGroup;
}


// ------------------------------------------------------------
// [08] - Compute Batch Stack
// ------------------------------------------------------------
export class cfComputeBatchStack extends Construct {

    constructor(scope: Construct, id: string, kmsProps: kmsProps, networkingProps: networkingProps, sgProps: sgProps) {
        super(scope, id);

        // ------------------------------------------------------------
        // AWS IAM EC2 Instance Profile for Batch Configuration
        // ------------------------------------------------------------
        const ec2IamRoleForBatch = new iam.Role(this, 'ec2IamRoleForBatch', {
            roleName: 'ec2IamRoleForBatch',
            description: 'IAM EC2 instance profile for Batch',
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
        });

        ec2IamRoleForBatch.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));
        ec2IamRoleForBatch.addToPolicy(new iam.PolicyStatement({
            sid: 'SSMAccess',
            actions: ['ssm:StartSession', 'ssm:SendCommand'],
            resources: [ `arn:aws:ssm:${cdk.Stack.of(this).account}:${cdk.Stack.of(this).region}:document/AWS-StartSession` ],
        }));

        cdk.Tags.of(ec2IamRoleForBatch).add('Name', 'ec2IamRoleForBatch');
        cdk.Tags.of(ec2IamRoleForBatch).add('ProvisionedBy', 'AWS');

        const ec2IamPolicyForBatch = new iam.Policy(this, 'ec2IamPolicyForBatch', {
            statements: [
                new iam.PolicyStatement({
                    sid: 'RDSAccess',
                    actions: ['rds-db:connect', 'rds-data:ExecuteStatement'],
                    resources: [`arn:aws:rds:${cdk.Stack.of(this).account}:${cdk.Stack.of(this).region}:db:*`],
                }),
            ],
        });

        cdk.Tags.of(ec2IamPolicyForBatch).add('Name', 'ec2IamPolicyForBatch');
        cdk.Tags.of(ec2IamPolicyForBatch).add('ProvisionedBy', 'AWS');

        ec2IamPolicyForBatch.attachToRole(ec2IamRoleForBatch);

        const ec2IamInstanceProfileForBatch = new iam.InstanceProfile(this, 'ec2IamInstanceProfileForBatch', {
            instanceProfileName: 'ec2IamInstanceProfileForBatch',
            role: ec2IamRoleForBatch,
        });

        cdk.Tags.of(ec2IamInstanceProfileForBatch).add('Name', 'ec2IamInstanceProfileForBatch');
        cdk.Tags.of(ec2IamInstanceProfileForBatch).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // Amazon EC2 Batch Key Pair Configuration
        // ------------------------------------------------------------
        const batchKeyPair = new ec2.KeyPair(this, 'batchKeyPair', {
            keyPairName: 'BatchKeyPair',
            publicKeyMaterial: kmsProps.bastionKey,
            type: ec2.KeyPairType.ED25519,
            format: ec2.KeyPairFormat.PEM,
        });


        // ------------------------------------------------------------
        // Amazon EC2 Batch (AZ-a) Configuration
        // ------------------------------------------------------------
        const ec2InstanceBatchAZa = new ec2.Instance(this, 'ec2InstanceBatchAZa', {
            instanceName: 'Ec2InstanceBatchAZa',
            instanceType: new ec2.InstanceType('t4g.large'),
            machineImage: ec2.MachineImage.latestAmazonLinux2023(),
            vpc: ec2.Vpc.fromVpcAttributes(this, 'vpc', {
                vpcId: networkingProps.vpcId,
                availabilityZones: ['ap-northeast-1a'],
                publicSubnetIds: [networkingProps.subnetIds[0]],
            }),
            securityGroup: sgProps.batchSecurityGroup,
            instanceProfile: ec2IamInstanceProfileForBatch,
            keyName: kmsProps.bastionKey,
            disableApiTermination: true,
            detailedMonitoring: true,
            allowAllIpv6Outbound: false,
            ssmSessionPermissions: true,
            keyPair: batchKeyPair,
            creditSpecification: ec2.CpuCredits.STANDARD,
            blockDevices: [
                {
                    mappingEnabled: true,
                    deviceName: '/dev/xvda',
                    volume: ec2.BlockDeviceVolume.ebs(64, {
                        encrypted: true,
                    }),
                },
                {
                    mappingEnabled: true,
                    deviceName: '/dev/xvdb',
                    volume: ec2.BlockDeviceVolume.ebs(128, {
                        encrypted: true,
                    }),
                }
            ],
        });

        cdk.Tags.of(ec2InstanceBatchAZa).add('Name', 'Ec2InstanceBatchAZa');
        cdk.Tags.of(ec2InstanceBatchAZa).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // Amazon EC2 Batch (AZ-c) Configuration
        // ------------------------------------------------------------
        const ec2InstanceBatchAZc = new ec2.Instance(this, 'ec2InstanceBatchAZc', {
            instanceName: 'Ec2InstanceBatchAZc',
            instanceType: new ec2.InstanceType('t4g.large'),
            machineImage: ec2.MachineImage.latestAmazonLinux2023(),
            vpc: ec2.Vpc.fromVpcAttributes(this, 'vpc', {
                vpcId: networkingProps.vpcId,
                availabilityZones: ['ap-northeast-1c'],
                publicSubnetIds: [networkingProps.subnetIds[1]],
            }),
            securityGroup: sgProps.batchSecurityGroup,
            instanceProfile: ec2IamInstanceProfileForBatch,
            keyName: kmsProps.bastionKey,
            disableApiTermination: true,
            detailedMonitoring: true,
            allowAllIpv6Outbound: false,
            ssmSessionPermissions: true,
            keyPair: batchKeyPair,
            creditSpecification: ec2.CpuCredits.STANDARD,
            blockDevices: [
                {
                    mappingEnabled: true,
                    deviceName: '/dev/xvda',
                    volume: ec2.BlockDeviceVolume.ebs(64, {
                        encrypted: true,
                    }),
                },
                {
                    mappingEnabled: true,
                    deviceName: '/dev/xvdb',
                    volume: ec2.BlockDeviceVolume.ebs(128, {
                        encrypted: true,
                    }),
                }
            ],
        });

        cdk.Tags.of(ec2InstanceBatchAZc).add('Name', 'Ec2InstanceBatchAZc');
        cdk.Tags.of(ec2InstanceBatchAZc).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // EIP for Amazon EC2 Batch (AZ-a) Configuration
        // ------------------------------------------------------------
        const batchEipAZa = new ec2.CfnEIP(this, 'batchEipAZa', {
            domain: 'vpc',
        });

        cdk.Tags.of(batchEipAZa).add('Name', 'BatchEipAZa');
        cdk.Tags.of(batchEipAZa).add('ProvisionedBy', 'AWS');

        new ec2.CfnEIPAssociation(this, 'batchEipAssociationAZa', {
            allocationId: batchEipAZa.attrAllocationId,
            instanceId: ec2InstanceBatchAZa.instanceId,
        });


        // ------------------------------------------------------------
        // EIP for Amazon EC2 Batch (AZ-c) Configuration
        // ------------------------------------------------------------
        const batchEipAZc = new ec2.CfnEIP(this, 'batchEipAZc', {
            domain: 'vpc',
        });

        cdk.Tags.of(batchEipAZc).add('Name', 'BatchEipAZc');
        cdk.Tags.of(batchEipAZc).add('ProvisionedBy', 'AWS');

        new ec2.CfnEIPAssociation(this, 'batchEipAssociationAZc', {
            allocationId: batchEipAZc.attrAllocationId,
            instanceId: ec2InstanceBatchAZc.instanceId,
        });
    }
}
