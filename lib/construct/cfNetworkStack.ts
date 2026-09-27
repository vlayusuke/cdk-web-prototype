import type { aws_kms as kms } from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib";
import { aws_ec2 as ec2, aws_s3 as s3 } from "aws-cdk-lib";
import { IpAddresses } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

export interface commonProps {
    projectName: string;
    envName: string;
}

export interface pocProps {
    vpcCidr: string;
    defaultGatewayCidr: string;
    availabilityZones: [string, string];
}

export interface kmsProps {
    s3Key: kms.IKey;
}

// ------------------------------------------------------------
// [02] - Network Configuration Stack
// ------------------------------------------------------------
export class cfNetworkStack extends Construct {
    public readonly Vpc: ec2.IVpc;

    constructor(
        scope: Construct,
        id: string,
        props: commonProps & pocProps,
        kmsProps: kmsProps,
    ) {
        super(scope, id);

        // ------------------------------------------------------------
        // Amazon VPC Configuration
        // ------------------------------------------------------------
        const Vpc = new ec2.Vpc(this, "Vpc", {
            ipAddresses: IpAddresses.cidr(props.vpcCidr),
            availabilityZones: props.availabilityZones,
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

        cdk.Tags.of(Vpc).add("Name", "Vpc");
        cdk.Tags.of(Vpc).add("ProvisionedBy", "AWS");

        for (const [index, subnet] of Vpc.publicSubnets.entries()) {
            const zoneSuffix = props.availabilityZones[index].slice(-1);
            const routeTable = subnet.node.findChild(
                "RouteTable",
            ) as ec2.CfnRouteTable;
            cdk.Tags.of(routeTable).add(
                "Name",
                `${props.projectName}-${props.envName}-pubsub-route-table-az-${zoneSuffix}`,
            );
            cdk.Tags.of(routeTable).add("ProvisionedBy", "AWS");
        }

        for (const [index, subnet] of Vpc.privateSubnets.entries()) {
            const zoneSuffix = props.availabilityZones[index].slice(-1);
            const routeTable = subnet.node.findChild(
                "RouteTable",
            ) as ec2.CfnRouteTable;
            cdk.Tags.of(routeTable).add(
                "Name",
                `${props.projectName}-${props.envName}-prvsub-route-table-az-${zoneSuffix}`,
            );
            cdk.Tags.of(routeTable).add("ProvisionedBy", "AWS");
        }

        for (const [index, subnet] of Vpc.isolatedSubnets.entries()) {
            const zoneSuffix = props.availabilityZones[index].slice(-1);
            const routeTable = subnet.node.findChild(
                "RouteTable",
            ) as ec2.CfnRouteTable;
            cdk.Tags.of(routeTable).add(
                "Name",
                `${props.projectName}-${props.envName}-protsub-route-table-az-${zoneSuffix}`,
            );
            cdk.Tags.of(routeTable).add("ProvisionedBy", "AWS");
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
            `${props.projectName}-${props.envName}-igw`,
        );
        cdk.Tags.of(internetGateway).add("ProvisionedBy", "AWS");

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
            `${props.projectName}-${props.envName}-vgw`,
        );
        cdk.Tags.of(virtualPrivateGateway).add("ProvisionedBy", "AWS");

        // ------------------------------------------------------------
        // NAT Gateway Configuration
        // ------------------------------------------------------------
        const natGateways = Vpc.publicSubnets.map((subnet, index) => {
            const zoneSuffix = props.availabilityZones[index].slice(-1);
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
                `${props.projectName}-${props.envName}-nat-gateway-az-${zoneSuffix}`,
            );
            cdk.Tags.of(natGateway).add("ProvisionedBy", "AWS");
            return natGateway;
        });

        // ------------------------------------------------------------
        // Public Subnet Route Configuration
        // ------------------------------------------------------------
        for (const [index, subnet] of Vpc.publicSubnets.entries()) {
            const zoneSuffix = props.availabilityZones[index].slice(-1);
            new ec2.CfnRoute(this, `PublicRouteAZ${zoneSuffix}`, {
                routeTableId: subnet.routeTable.routeTableId,
                destinationCidrBlock: props.defaultGatewayCidr,
                gatewayId: internetGateway.ref,
            });
        }

        // ------------------------------------------------------------
        // Private Subnet Route Configuration
        // ------------------------------------------------------------
        for (const [index, subnet] of Vpc.privateSubnets.entries()) {
            const zoneSuffix = props.availabilityZones[index].slice(-1);
            new ec2.CfnRoute(this, `PrivateRouteAZ${zoneSuffix}`, {
                routeTableId: subnet.routeTable.routeTableId,
                destinationCidrBlock: props.defaultGatewayCidr,
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
            `${props.projectName}-${props.envName}-s3-vpc-flow-logs-bucket`,
        );
        cdk.Tags.of(s3VPCFlowLogsBucket).add("ProvisionedBy", "AWS");

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
            `${props.projectName}-${props.envName}-vpc-flow-log`,
        );
        cdk.Tags.of(cfnVPVFlowLog).add("ProvisionedBy", "AWS");

        this.Vpc = Vpc;
    }
}
