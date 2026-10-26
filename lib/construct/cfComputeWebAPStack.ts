import type { aws_s3 as s3 } from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib";
import { aws_ec2 as ec2, aws_ecs as ecs, aws_iam as iam } from "aws-cdk-lib";
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
    defaultGatewayCidr: string;
}

export interface SgProps {
    bastionSecurityGroup: ec2.ISecurityGroup;
}

export interface S3Props {
    s3BucketEc2Logs: s3.IBucket;
}

export interface DatabaseProps {
    auroraClusterArn: string;
    auroraWriterInstanceArn: string;
    auroraReaderInstanceArn: string;
}

// ------------------------------------------------------------
// [07] - Compute WebAP Stack
// ------------------------------------------------------------
export class CfComputeWebAPStack extends Construct {
    public readonly ecsCluster: ecs.CfnCluster;

    constructor(
        scope: Construct,
        id: string,
        networkingProps: NetworkingProps,
        sgProps: SgProps,
        s3Props: S3Props,
        databaseProps: DatabaseProps,
        commonProps: CommonProps,
        envProps: EnvProps,
    ) {
        super(scope, id);

        const prefix = `${commonProps.projectName}-${envProps.envName}`;
        const stack = cdk.Stack.of(this);

        // L1 resources live under a wrapper scope with the id "Resource" so that
        // construct paths (and logical IDs) match the former L2 constructs.
        const wrap = (wrapperId: string, name: string): Construct => {
            const wrapper = new Construct(this, wrapperId);
            cdk.Tags.of(wrapper).add("Name", name);
            cdk.Tags.of(wrapper).add("ProvisionedBy", "AWS");
            cdk.Tags.of(wrapper).add("ProjectCode", "1234567890");
            return wrapper;
        };

        // ------------------------------------------------------------
        // AWS IAM EC2 Instance Profile for Bastion Configuration
        // ------------------------------------------------------------
        const ec2IamRoleForBastion = new iam.CfnRole(
            wrap("ec2IamRoleForBastion", `${prefix}-iam-role-for-bastion`),
            "Resource",
            {
                roleName: "ec2IamRoleForBastion",
                description: "IAM EC2 instance profile for Bastion",
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
                    `arn:${stack.partition}:iam::aws:policy/AmazonSSMManagedInstanceCore`,
                ],
            },
        );

        new iam.CfnPolicy(
            wrap("ec2IamPolicyForBastion", `${prefix}-iam-policy-for-bastion`),
            "Resource",
            {
                policyName: `${prefix}-iam-policy-for-bastion`,
                roles: [ec2IamRoleForBastion.ref],
                policyDocument: {
                    Version: "2012-10-17",
                    Statement: [
                        {
                            Sid: "SSMAccess",
                            Effect: "Allow",
                            Action: ["ssm:StartSession", "ssm:SendCommand"],
                            Resource: [
                                `arn:aws:ssm:${stack.region}:${stack.account}:document/AWS-StartSession`,
                            ],
                        },
                        {
                            Sid: "S3Access",
                            Effect: "Allow",
                            Action: [
                                "s3:ListBucket",
                                "s3:GetObject",
                                "s3:PutObject",
                                "s3:DeleteObject",
                            ],
                            Resource: [
                                s3Props.s3BucketEc2Logs.bucketArn,
                                `${s3Props.s3BucketEc2Logs.bucketArn}/*`,
                            ],
                        },
                        {
                            Sid: "AuroraAccess",
                            Effect: "Allow",
                            Action: [
                                "rds:DescribeDBClusters",
                                "rds:DescribeDBInstances",
                                "rds:Connect",
                            ],
                            Resource: [
                                databaseProps.auroraClusterArn,
                                databaseProps.auroraWriterInstanceArn,
                                databaseProps.auroraReaderInstanceArn,
                            ],
                        },
                    ],
                },
            },
        );

        const ec2IamInstanceProfileForBastion = new iam.CfnInstanceProfile(
            wrap(
                "ec2IamInstanceProfileForBastion",
                `${prefix}-iam-instance-profile-for-bastion`,
            ),
            "Resource",
            {
                instanceProfileName: "ec2IamInstanceProfileForBastion",
                roles: [ec2IamRoleForBastion.ref],
            },
        );

        // ------------------------------------------------------------
        // Amazon ECS Cluster Configuration
        // ------------------------------------------------------------
        const ecsClusterScope = wrap("ecsCluster", `${prefix}-ecs-cluster`);
        this.ecsCluster = new ecs.CfnCluster(ecsClusterScope, "Resource", {
            clusterName: `${prefix}-ecs-cluster`,
            clusterSettings: [{ name: "containerInsights", value: "enabled" }],
        });

        new ecs.CfnClusterCapacityProviderAssociations(
            ecsClusterScope,
            "CapacityProviderAssociations",
            {
                cluster: this.ecsCluster.ref,
                capacityProviders: ["FARGATE", "FARGATE_SPOT"],
                defaultCapacityProviderStrategy: [
                    { capacityProvider: "FARGATE", base: 1, weight: 1 },
                    { capacityProvider: "FARGATE_SPOT", base: 0, weight: 1 },
                ],
            },
        );

        // ------------------------------------------------------------
        // Amazon EC2 Bastion Key Pair Configuration
        // ------------------------------------------------------------
        const bastionKeyPair = new ec2.CfnKeyPair(
            wrap("bastionKeyPair", `${prefix}-bastion-key-pair`),
            "Resource",
            {
                keyName: `${prefix}-bastion-key-pair`,
                keyType: "ed25519",
                keyFormat: "pem",
            },
        );

        // ------------------------------------------------------------
        // Amazon EC2 Bastion Configuration
        // ------------------------------------------------------------
        const ec2InstanceBastion = new ec2.CfnInstance(
            wrap("ec2InstanceBastion", `${prefix}-ec2-instance-bastion`),
            "Resource",
            {
                imageId:
                    "{{resolve:ssm:/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64}}",
                instanceType: "t4g.small",
                subnetId: networkingProps.publicSubnetIds[0],
                securityGroupIds: [
                    sgProps.bastionSecurityGroup.securityGroupId,
                ],
                iamInstanceProfile: ec2IamInstanceProfileForBastion.ref,
                keyName: bastionKeyPair.ref,
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
                            volumeSize: 64,
                            encrypted: true,
                            deleteOnTermination: true,
                        },
                    },
                ],
            },
        );

        // ------------------------------------------------------------
        // EIP for Amazon EC2 Bastion Configuration
        // ------------------------------------------------------------
        const bastionEip = new ec2.CfnEIP(this, "bastionEip", {
            domain: "vpc",
        });

        cdk.Tags.of(bastionEip).add("Name", `${prefix}-bastion-eip`);
        cdk.Tags.of(bastionEip).add("ProvisionedBy", "AWS");
        cdk.Tags.of(bastionEip).add("ProjectCode", "1234567890");

        new ec2.CfnEIPAssociation(this, "bastionEipAssociation", {
            allocationId: bastionEip.attrAllocationId,
            instanceId: ec2InstanceBastion.ref,
        });
    }
}
