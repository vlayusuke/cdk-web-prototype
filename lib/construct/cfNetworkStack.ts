import type { aws_kms as kms } from 'aws-cdk-lib';
import * as cdk from 'aws-cdk-lib';
import { aws_ec2 as ec2, aws_s3 as s3 } from 'aws-cdk-lib';
import { IpAddresses } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface networkingProps {
  vpcCidr: string;
}

export interface kmsProps {
  s3Key: kms.IKey;
}

export interface defaultGatewayCidrProps {
  defaultGatewayCidr: string;
}


// ------------------------------------------------------------
// 02 Network Configuration Stack
// ------------------------------------------------------------
export class cfNetworkStack extends Construct {
    public readonly Vpc: ec2.IVpc;

    constructor(scope: Construct, id: string, props: networkingProps, kmsProps: kmsProps, defaultGatewayCidrProps: defaultGatewayCidrProps) {
        super(scope, id);

        // ------------------------------------------------------------
        // Amazon VPC Configuration
        // ------------------------------------------------------------
        const Vpc = new ec2.Vpc(this, 'Vpc', {
            ipAddresses: IpAddresses.cidr(props.vpcCidr),
            maxAzs: 2,
            natGateways: 2,

            subnetConfiguration: [
                {
                    cidrMask: 24,
                    name: 'PublicSubnet',
                    subnetType: ec2.SubnetType.PUBLIC,
                },
                {
                    cidrMask: 24,
                    name: 'PrivateSubnet',
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                },
                {
                    cidrMask: 24,
                    name: 'ProtectedSubnet',
                    subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                },
            ],
        });

        this.Vpc = Vpc;

        cdk.Tags.of(Vpc).add('Name', 'Vpc');
        cdk.Tags.of(Vpc).add('ProvisionedBy', 'AWS');

        const cfnPublicSubnetAZa = Vpc.publicSubnets[0].node.findChild('RouteTable') as ec2.CfnRouteTable;
        cdk.Tags.of(cfnPublicSubnetAZa).add('Name', 'publicRouteTableAZa');
        cdk.Tags.of(cfnPublicSubnetAZa).add('ProvisionedBy', 'AWS');

        const cfnPublicSubnetAZc = Vpc.publicSubnets[1].node.findChild('RouteTable') as ec2.CfnRouteTable;
        cdk.Tags.of(cfnPublicSubnetAZc).add('Name', 'publicRouteTableAZc');
        cdk.Tags.of(cfnPublicSubnetAZc).add('ProvisionedBy', 'AWS');

        const cfnPrivateSubnetAZa = Vpc.privateSubnets[0].node.findChild('RouteTable') as ec2.CfnRouteTable;
        cdk.Tags.of(cfnPrivateSubnetAZa).add('Name', 'privateRouteTableAZa');
        cdk.Tags.of(cfnPrivateSubnetAZa).add('ProvisionedBy', 'AWS');

        const cfnPrivateSubnetAZc = Vpc.privateSubnets[1].node.findChild('RouteTable') as ec2.CfnRouteTable;
        cdk.Tags.of(cfnPrivateSubnetAZc).add('Name', 'privateRouteTableAZc');
        cdk.Tags.of(cfnPrivateSubnetAZc).add('ProvisionedBy', 'AWS');

        const cfnProtectedSubnetAZa = Vpc.isolatedSubnets[0].node.findChild('RouteTable') as ec2.CfnRouteTable;
        cdk.Tags.of(cfnProtectedSubnetAZa).add('Name', 'protectedRouteTableAZa');
        cdk.Tags.of(cfnProtectedSubnetAZa).add('ProvisionedBy', 'AWS');

        const cfnProtectedSubnetAZc = Vpc.isolatedSubnets[1].node.findChild('RouteTable') as ec2.CfnRouteTable;
        cdk.Tags.of(cfnProtectedSubnetAZc).add('Name', 'protectedRouteTableAZc');
        cdk.Tags.of(cfnProtectedSubnetAZc).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // Internet Gateway Configuration
        // ------------------------------------------------------------
        const internetGateway = new ec2.CfnInternetGateway(this, 'InternetGateway', {});
        new ec2.CfnVPCGatewayAttachment(this, 'VpcGatewayAttachment', {
            vpcId: Vpc.vpcId,
            internetGatewayId: internetGateway.ref,
        });

        cdk.Tags.of(internetGateway).add('Name', 'internetGateway');
        cdk.Tags.of(internetGateway).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // Virtual Private Gateway Configuration
        // ------------------------------------------------------------
        const virtualPrivateGateway = new ec2.CfnVPNGateway(this, 'VirtualPrivateGateway', {
            type: 'ipsec.1',
        });

        new ec2.CfnVPCGatewayAttachment(this, 'VpcVpnGatewayAttachment', {
            vpcId: Vpc.vpcId,
            vpnGatewayId: virtualPrivateGateway.ref,
        });

        cdk.Tags.of(virtualPrivateGateway).add('Name', 'virtualPrivateGateway');
        cdk.Tags.of(virtualPrivateGateway).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // NAT Gateway Configuration
        // ------------------------------------------------------------
        const natGatewayAZa = new ec2.CfnNatGateway(this, 'NatGatewayAZa', {
            subnetId: Vpc.publicSubnets[0].subnetId,
            allocationId: new ec2.CfnEIP(this, 'NatEIPAZa', {
                domain: 'vpc',
            }).attrAllocationId,
        });

        cdk.Tags.of(natGatewayAZa).add('Name', 'natGatewayAZa');
        cdk.Tags.of(natGatewayAZa).add('ProvisionedBy', 'AWS');

        const natGatewayAZc = new ec2.CfnNatGateway(this, 'NatGatewayAZc', {
            subnetId: Vpc.publicSubnets[1].subnetId,
            allocationId: new ec2.CfnEIP(this, 'NatEIPAZc', {
                domain: 'vpc',
            }).attrAllocationId,
        });

        cdk.Tags.of(natGatewayAZc).add('Name', 'natGatewayAZc');
        cdk.Tags.of(natGatewayAZc).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // Public Subnet Route Configuration
        // ------------------------------------------------------------
        const publicRouteTableAZa = Vpc.publicSubnets[0].routeTable.routeTableId;

        new ec2.CfnRoute(this, 'PublicRoute', {
            routeTableId: publicRouteTableAZa,
            destinationCidrBlock: defaultGatewayCidrProps.defaultGatewayCidr,
            gatewayId: internetGateway.ref,
        });

        // The route table that is automatically generated when creating a VPC exists as a child construct of the subnet.
        const cfnPublicRouteTableAZa = Vpc.publicSubnets[0].node.findChild('RouteTable') as ec2.CfnRouteTable;
        cdk.Tags.of(cfnPublicRouteTableAZa).add('Name', 'publicRouteTableAZa');
        cdk.Tags.of(cfnPublicRouteTableAZa).add('ProvisionedBy', 'AWS');

        const publicRouteTableAZc = Vpc.publicSubnets[1].routeTable.routeTableId;

        new ec2.CfnRoute(this, 'PublicRouteAZc', {
            routeTableId: publicRouteTableAZc,
            destinationCidrBlock: defaultGatewayCidrProps.defaultGatewayCidr,
            gatewayId: internetGateway.ref,
        });

        // The route table that is automatically generated when creating a VPC exists as a child construct of the subnet.
        const cfnPublicRouteTableAZc = Vpc.publicSubnets[1].node.findChild('RouteTable') as ec2.CfnRouteTable;
        cdk.Tags.of(cfnPublicRouteTableAZc).add('Name', 'publicRouteTableAZc');
        cdk.Tags.of(cfnPublicRouteTableAZc).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // Private Subnet Route Configuration
        // ------------------------------------------------------------
        const privateRouteTableAZa = Vpc.privateSubnets[0].routeTable.routeTableId;

        new ec2.CfnRoute(this, 'PrivateRouteAZa', {
            routeTableId: privateRouteTableAZa,
            destinationCidrBlock: defaultGatewayCidrProps.defaultGatewayCidr,
            natGatewayId: natGatewayAZa.ref,
        });

        // The route table that is automatically generated when creating a VPC exists as a child construct of the subnet.
        const cfnPrivateRouteTableAZa = Vpc.privateSubnets[0].node.findChild('RouteTable') as ec2.CfnRouteTable;
        cdk.Tags.of(cfnPrivateRouteTableAZa).add('Name', 'privateRouteTableAZa');
        cdk.Tags.of(cfnPrivateRouteTableAZa).add('ProvisionedBy', 'AWS');

        const privateRouteTableAZc = Vpc.privateSubnets[1].routeTable.routeTableId;

        new ec2.CfnRoute(this, 'PrivateRouteAZc', {
            routeTableId: privateRouteTableAZc,
            destinationCidrBlock: defaultGatewayCidrProps.defaultGatewayCidr,
            natGatewayId: natGatewayAZc.ref,
        });

        // The route table that is automatically generated when creating a VPC exists as a child construct of the subnet.
        const cfnPrivateRouteTableAZc = Vpc.privateSubnets[1].node.findChild('RouteTable') as ec2.CfnRouteTable;
        cdk.Tags.of(cfnPrivateRouteTableAZc).add('Name', 'privateRouteTableAZc');
        cdk.Tags.of(cfnPrivateRouteTableAZc).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // Amazon S3 Bucket for VPC Flow Logs Configuration
        // ------------------------------------------------------------
        const s3VPCFlowLogsBucket = new s3.Bucket(this, 's3VPCFlowLogsBucket', {
            accessControl: s3.BucketAccessControl.PRIVATE,
            encryptionKey: kmsProps.s3Key,
            encryption: s3.BucketEncryption.KMS,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            enforceSSL: true,
        });

        cdk.Tags.of(s3VPCFlowLogsBucket).add('Name', 's3VPCFlowLogsBucket');
        cdk.Tags.of(s3VPCFlowLogsBucket).add('ProvisionedBy', 'AWS');

        Vpc.addFlowLog('FlowLogs', {
            destination: ec2.FlowLogDestination.toS3(s3VPCFlowLogsBucket, undefined, {
                fileFormat: ec2.FlowLogFileFormat.PLAIN_TEXT,
                perHourPartition: true,
            }),
            trafficType: ec2.FlowLogTrafficType.ALL,
            maxAggregationInterval: ec2.FlowLogMaxAggregationInterval.TEN_MINUTES,
        });

        const cfnVPVFlowLog = Vpc.node.findChild('FlowLogs') as ec2.CfnFlowLog;
        cdk.Tags.of(cfnVPVFlowLog).add('Name', 'vpcFlowLog');
        cdk.Tags.of(cfnVPVFlowLog).add('ProvisionedBy', 'AWS');

        this.Vpc = Vpc;
    }
}
