import type { aws_kms as kms } from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib";
import { aws_ec2 as ec2, aws_s3 as s3 } from "aws-cdk-lib";
import { Construct } from "constructs";

export interface CommonProps {
    projectName: string;
    dashboardName: string;
}

export interface EnvProps {
    envName: string;
    vpcCidr: string;
    defaultGatewayCidr: string;
    availabilityZones: [string, string];
}

export interface KmsProps {
    s3Key: kms.IKey;
}

// ************************************************************
// [02] - Network Configuration Stack
// ************************************************************
export class CfNetworkStack extends Construct {
    public readonly Vpc: ec2.IVpc;

    constructor(
        scope: Construct,
        id: string,
        kmsProps: KmsProps,
        commonProps: CommonProps,
        envProps: EnvProps,
    ) {
        super(scope, id);

        const prefix = `${commonProps.projectName}-${envProps.envName}`;

        // ------------------------------------------------------------
        // Applies the common Name / ProvisionedBy / ProjectCode tags to a construct.
        // ------------------------------------------------------------
        const tagAll = (target: Construct, name: string) => {
            cdk.Tags.of(target).add("Name", name);
            cdk.Tags.of(target).add("ProvisionedBy", "AWS");
            cdk.Tags.of(target).add("ProjectCode", "1234567890");
        };

        // ------------------------------------------------------------
        // Amazon VPC Configuration
        // ------------------------------------------------------------
        const vpcScope = new Construct(this, "Vpc");

        const cfnVpc = new ec2.CfnVPC(vpcScope, "Resource", {
            cidrBlock: envProps.vpcCidr,
            enableDnsHostnames: true,
            enableDnsSupport: true,
            instanceTenancy: "default",
        });

        tagAll(cfnVpc, `${prefix}-vpc`);

        // ------------------------------------------------------------
        // Amazon VPC Subnets Configuration
        // ------------------------------------------------------------
        // Six /24 subnets, in the order: public x2, private x2, isolated x2.
        const subnetCidrs = cdk.Fn.cidr(envProps.vpcCidr, 6, "8");

        const subnetGroups = [
            { name: "PublicSubnet", short: "pubsub", isPublic: true },
            { name: "PrivateSubnet", short: "prvsub", isPublic: false },
            { name: "ProtectedSubnet", short: "protsub", isPublic: false },
        ];

        const publicSubnetIds: string[] = [];
        const publicRouteTableIds: string[] = [];
        const privateSubnetIds: string[] = [];
        const privateRouteTableIds: string[] = [];
        const isolatedSubnetIds: string[] = [];
        const isolatedRouteTableIds: string[] = [];

        const subnetIdsByGroup = [
            publicSubnetIds,
            privateSubnetIds,
            isolatedSubnetIds,
        ];

        const routeTableIdsByGroup = [
            publicRouteTableIds,
            privateRouteTableIds,
            isolatedRouteTableIds,
        ];

        for (const [groupIndex, group] of subnetGroups.entries()) {
            for (const [azIndex, az] of envProps.availabilityZones.entries()) {
                const zoneSuffix = az.slice(-1);

                const subnetScope = new Construct(
                    vpcScope,
                    `${group.name}Subnet${azIndex + 1}`,
                );

                const subnet = new ec2.CfnSubnet(subnetScope, "Subnet", {
                    vpcId: cfnVpc.ref,
                    cidrBlock: cdk.Fn.select(
                        groupIndex * 2 + azIndex,
                        subnetCidrs,
                    ),
                    availabilityZone: az,
                    mapPublicIpOnLaunch: group.isPublic,
                });

                tagAll(subnet, `${prefix}-${group.short}-az-${zoneSuffix}`);

                const routeTable = new ec2.CfnRouteTable(
                    subnetScope,
                    "RouteTable",
                    { vpcId: cfnVpc.ref },
                );

                tagAll(
                    routeTable,
                    `${prefix}-${group.short}-route-table-az-${zoneSuffix}`,
                );

                new ec2.CfnSubnetRouteTableAssociation(
                    subnetScope,
                    "RouteTableAssociation",
                    {
                        subnetId: subnet.ref,
                        routeTableId: routeTable.ref,
                    },
                );

                subnetIdsByGroup[groupIndex].push(subnet.ref);
                routeTableIdsByGroup[groupIndex].push(routeTable.ref);
            }
        }

        const Vpc = ec2.Vpc.fromVpcAttributes(this, "VpcImport", {
            vpcId: cfnVpc.ref,
            vpcCidrBlock: envProps.vpcCidr,
            availabilityZones: envProps.availabilityZones,
            publicSubnetIds,
            publicSubnetRouteTableIds: publicRouteTableIds,
            privateSubnetIds,
            privateSubnetRouteTableIds: privateRouteTableIds,
            isolatedSubnetIds,
            isolatedSubnetRouteTableIds: isolatedRouteTableIds,
        });

        // ------------------------------------------------------------
        // Internet Gateway Configuration
        // ------------------------------------------------------------
        const internetGateway = new ec2.CfnInternetGateway(
            this,
            "InternetGateway",
            {},
        );

        const igwAttachment = new ec2.CfnVPCGatewayAttachment(
            this,
            "VpcGatewayAttachment",
            {
                vpcId: cfnVpc.ref,
                internetGatewayId: internetGateway.ref,
            },
        );

        tagAll(internetGateway, `${prefix}-igw`);

        // ------------------------------------------------------------
        // Virtual Private Gateway Configuration
        // ------------------------------------------------------------
        const virtualPrivateGateway = new ec2.CfnVPNGateway(
            this,
            "VirtualPrivateGateway",
            {
                type: "ipsec.1",
            },
        );

        new ec2.CfnVPCGatewayAttachment(this, "VpcVpnGatewayAttachment", {
            vpcId: cfnVpc.ref,
            vpnGatewayId: virtualPrivateGateway.ref,
        });

        tagAll(virtualPrivateGateway, `${prefix}-vgw`);

        // ------------------------------------------------------------
        // NAT Gateway Configuration
        // ------------------------------------------------------------
        const natGateways = publicSubnetIds.map((subnetId, index) => {
            const zoneSuffix = envProps.availabilityZones[index].slice(-1);

            const natGateway = new ec2.CfnNatGateway(
                this,
                `NatGatewayAZ${zoneSuffix}`,
                {
                    subnetId,
                    allocationId: new ec2.CfnEIP(
                        this,
                        `NatEIPAZ${zoneSuffix}`,
                        { domain: "vpc" },
                    ).attrAllocationId,
                },
            );

            tagAll(natGateway, `${prefix}-nat-gateway-az-${zoneSuffix}`);
            return natGateway;
        });

        // ------------------------------------------------------------
        // Public Subnet Route Configuration
        // ------------------------------------------------------------
        for (const [index, routeTableId] of publicRouteTableIds.entries()) {
            const zoneSuffix = envProps.availabilityZones[index].slice(-1);

            const route = new ec2.CfnRoute(this, `PublicRouteAZ${zoneSuffix}`, {
                routeTableId,
                destinationCidrBlock: envProps.defaultGatewayCidr,
                gatewayId: internetGateway.ref,
            });

            route.addResourceDependency(
                igwAttachment,
                "The route needs the internet gateway to be attached first",
            );
        }

        // ------------------------------------------------------------
        // Private Subnet Route Configuration
        // ------------------------------------------------------------
        for (const [index, routeTableId] of privateRouteTableIds.entries()) {
            const zoneSuffix = envProps.availabilityZones[index].slice(-1);

            new ec2.CfnRoute(this, `PrivateRouteAZ${zoneSuffix}`, {
                routeTableId,
                destinationCidrBlock: envProps.defaultGatewayCidr,
                natGatewayId: natGateways[index].ref,
            });
        }

        // ------------------------------------------------------------
        // Amazon S3 Bucket for VPC Flow Logs Configuration
        // ------------------------------------------------------------
        const s3VPCFlowLogsBucket = new s3.Bucket(this, "s3VPCFlowLogsBucket", {
            accessControl: s3.BucketAccessControl.PRIVATE,
            encryptionKey: kmsProps.s3Key,
            encryption: s3.BucketEncryption.KMS,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            enforceSSL: true,
            blockedEncryptionTypes: [s3.BlockedEncryptionType.SSE_C],
        });

        cdk.Tags.of(s3VPCFlowLogsBucket).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-s3-vpc-flow-logs-bucket`,
        );
        cdk.Tags.of(s3VPCFlowLogsBucket).add("ProvisionedBy", "AWS");
        cdk.Tags.of(s3VPCFlowLogsBucket).add("ProjectCode", "1234567890");

        // ------------------------------------------------------------
        // Amazon VPC Flow Logs Configuration
        // ------------------------------------------------------------1
        const vpcFlowLog = new ec2.FlowLog(vpcScope, "FlowLogs", {
            resourceType: ec2.FlowLogResourceType.fromVpc(Vpc),
            destination: ec2.FlowLogDestination.toS3(
                s3VPCFlowLogsBucket,
                undefined,
                {
                    fileFormat: ec2.FlowLogFileFormat.PLAIN_TEXT,
                    perHourPartition: true,
                },
            ),
            trafficType: ec2.FlowLogTrafficType.ALL,
            maxAggregationInterval:
                ec2.FlowLogMaxAggregationInterval.TEN_MINUTES,
        });

        tagAll(vpcFlowLog, `${prefix}-vpc-flow-log`);

        this.Vpc = Vpc;
    }
}
