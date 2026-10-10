import type { aws_kms as kms } from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib";
import { aws_ec2 as ec2, aws_s3 as s3 } from "aws-cdk-lib";
import { IpAddresses } from "aws-cdk-lib/aws-ec2";
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

// ------------------------------------------------------------
// [02] - Network Configuration Stack
// ------------------------------------------------------------
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

        // ------------------------------------------------------------
        // Amazon VPC Configuration
        // ------------------------------------------------------------
        const Vpc = new ec2.Vpc(this, "Vpc", {
            ipAddresses: IpAddresses.cidr(envProps.vpcCidr),
            availabilityZones: envProps.availabilityZones,
            natGateways: 2,

            subnetConfiguration: [
                {
                    cidrMask: 24,
                    name: "PublicSubnet",
                    subnetType: ec2.SubnetType.PUBLIC,
                },
                {
                    cidrMask: 24,
                    name: "PrivateSubnet",
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                },
                {
                    cidrMask: 24,
                    name: "ProtectedSubnet",
                    subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                },
            ],
        });

        this.Vpc = Vpc;

        cdk.Tags.of(Vpc).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-vpc`,
        );
        cdk.Tags.of(Vpc).add("ProvisionedBy", "AWS");
        cdk.Tags.of(Vpc).add("ProjectCode", "1234567890");

        for (const [index, subnet] of Vpc.publicSubnets.entries()) {
            const zoneSuffix = envProps.availabilityZones[index].slice(-1);
            const routeTable = subnet.node.findChild(
                "RouteTable",
            ) as ec2.CfnRouteTable;

            cdk.Tags.of(routeTable).add(
                "Name",
                `${commonProps.projectName}-${envProps.envName}-pubsub-route-table-az-${zoneSuffix}`,
            );
            cdk.Tags.of(routeTable).add("ProvisionedBy", "AWS");
            cdk.Tags.of(routeTable).add("ProjectCode", "1234567890");
        }

        for (const [index, subnet] of Vpc.privateSubnets.entries()) {
            const zoneSuffix = envProps.availabilityZones[index].slice(-1);
            const routeTable = subnet.node.findChild(
                "RouteTable",
            ) as ec2.CfnRouteTable;

            cdk.Tags.of(routeTable).add(
                "Name",
                `${commonProps.projectName}-${envProps.envName}-prvsub-route-table-az-${zoneSuffix}`,
            );
            cdk.Tags.of(routeTable).add("ProvisionedBy", "AWS");
            cdk.Tags.of(routeTable).add("ProjectCode", "1234567890");
        }

        for (const [index, subnet] of Vpc.isolatedSubnets.entries()) {
            const zoneSuffix = envProps.availabilityZones[index].slice(-1);
            const routeTable = subnet.node.findChild(
                "RouteTable",
            ) as ec2.CfnRouteTable;

            cdk.Tags.of(routeTable).add(
                "Name",
                `${commonProps.projectName}-${envProps.envName}-protsub-route-table-az-${zoneSuffix}`,
            );
            cdk.Tags.of(routeTable).add("ProvisionedBy", "AWS");
            cdk.Tags.of(routeTable).add("ProjectCode", "1234567890");
        }

        // ------------------------------------------------------------
        // Internet Gateway Configuration
        // ------------------------------------------------------------
        const internetGateway = new ec2.CfnInternetGateway(
            this,
            "InternetGateway",
            {},
        );
        new ec2.CfnVPCGatewayAttachment(this, "VpcGatewayAttachment", {
            vpcId: Vpc.vpcId,
            internetGatewayId: internetGateway.ref,
        });

        cdk.Tags.of(internetGateway).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-igw`,
        );
        cdk.Tags.of(internetGateway).add("ProvisionedBy", "AWS");
        cdk.Tags.of(internetGateway).add("ProjectCode", "1234567890");

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
            vpcId: Vpc.vpcId,
            vpnGatewayId: virtualPrivateGateway.ref,
        });

        cdk.Tags.of(virtualPrivateGateway).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-vgw`,
        );
        cdk.Tags.of(virtualPrivateGateway).add("ProvisionedBy", "AWS");
        cdk.Tags.of(virtualPrivateGateway).add("ProjectCode", "1234567890");

        // ------------------------------------------------------------
        // NAT Gateway Configuration
        // ------------------------------------------------------------
        const natGateways = Vpc.publicSubnets.map((subnet, index) => {
            const zoneSuffix = envProps.availabilityZones[index].slice(-1);
            const natGateway = new ec2.CfnNatGateway(
                this,
                `NatGatewayAZ${zoneSuffix}`,
                {
                    subnetId: subnet.subnetId,
                    allocationId: new ec2.CfnEIP(
                        this,
                        `NatEIPAZ${zoneSuffix}`,
                        { domain: "vpc" },
                    ).attrAllocationId,
                },
            );

            cdk.Tags.of(natGateway).add(
                "Name",
                `${commonProps.projectName}-${envProps.envName}-nat-gateway-az-${zoneSuffix}`,
            );
            cdk.Tags.of(natGateway).add("ProvisionedBy", "AWS");
            cdk.Tags.of(natGateway).add("ProjectCode", "1234567890");

            return natGateway;
        });

        // ------------------------------------------------------------
        // Public Subnet Route Configuration
        // ------------------------------------------------------------
        for (const [index, subnet] of Vpc.publicSubnets.entries()) {
            const zoneSuffix = envProps.availabilityZones[index].slice(-1);
            new ec2.CfnRoute(this, `PublicRouteAZ${zoneSuffix}`, {
                routeTableId: subnet.routeTable.routeTableId,
                destinationCidrBlock: envProps.defaultGatewayCidr,
                gatewayId: internetGateway.ref,
            });
        }

        // ------------------------------------------------------------
        // Private Subnet Route Configuration
        // ------------------------------------------------------------
        for (const [index, subnet] of Vpc.privateSubnets.entries()) {
            const zoneSuffix = envProps.availabilityZones[index].slice(-1);
            new ec2.CfnRoute(this, `PrivateRouteAZ${zoneSuffix}`, {
                routeTableId: subnet.routeTable.routeTableId,
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

        Vpc.addFlowLog("FlowLogs", {
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

        const cfnVPVFlowLog = Vpc.node.findChild("FlowLogs") as ec2.CfnFlowLog;

        cdk.Tags.of(cfnVPVFlowLog).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-vpc-flow-log`,
        );
        cdk.Tags.of(cfnVPVFlowLog).add("ProvisionedBy", "AWS");
        cdk.Tags.of(cfnVPVFlowLog).add("ProjectCode", "1234567890");

        this.Vpc = Vpc;
    }
}
