import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as kms from "aws-cdk-lib/aws-kms";
import { loadDevParameter } from "../config/devParameter";
import { loadPrdParameter } from "../config/prdParameter";
import { loadStgParameter } from "../config/stgParameter";
import { cfNetworkStack } from "../lib/construct/cfNetworkStack";
import { cfSgFrameStack } from "../lib/construct/cfSgFrameStack";
import { cfSgRuleStack } from "../lib/construct/cfSgRuleStack";
import { cfStorageStack } from "../lib/construct/cfStorageStack";

test.each([
    ["prd", loadPrdParameter],
    ["stg", loadStgParameter],
    ["dev", loadDevParameter],
])(
    "%s parameter loader reads deployment values from CDK context",
    (_env, loadParameter) => {
        expect(
            loadParameter({
                account: "123456789012",
                region: "ap-northeast-1",
                monitoringNotifyEmail: "alerts@example.com",
                monitoringSlackWorkspaceId: "T1234567890",
                monitoringSlackChannelId: "C1234567890",
                slackHookUrl: "https://hooks.slack.com/services/test",
            }),
        ).toMatchObject({
            env: { account: "123456789012", region: "ap-northeast-1" },
            monitoringNotifyEmail: "alerts@example.com",
            monitoringSlackWorkspaceId: "T1234567890",
            monitoringSlackChannelId: "C1234567890",
        });
    },
);

test.each([
    ["prd", loadPrdParameter],
    ["stg", loadStgParameter],
    ["dev", loadDevParameter],
])(
    "%s parameter loader rejects missing required context values",
    (env, loadParameter) => {
        expect(() => loadParameter({})).toThrow(
            `Missing required CDK context value: ${env}.monitoringNotifyEmail`,
        );
    },
);

test("network subnets follow the configured availability zones", () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "NetworkTestStack");
    const availabilityZones = ["ap-northeast-1a", "ap-northeast-1c"];
    const network = new cfNetworkStack(
        stack,
        "Network",
        {
            projectName: "test",
            dashboardName: "test",
            envName: "unit",
            vpcCidr: "10.80.0.0/16",
            defaultGatewayCidr: "0.0.0.0/0",
            availabilityZones: [availabilityZones[0], availabilityZones[1]],
        },
        { s3Key: new kms.Key(stack, "FlowLogsKey") },
    );

    expect(network.Vpc.availabilityZones).toEqual(availabilityZones);
    expect(network.Vpc.publicSubnets).toHaveLength(2);
    expect(network.Vpc.privateSubnets).toHaveLength(2);
    expect(network.Vpc.isolatedSubnets).toHaveLength(2);
});

test("Systems Manager endpoints share a least-privilege endpoint security group", () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, "TestStack");
    const vpc = new ec2.Vpc(stack, "Vpc", {
        maxAzs: 2,
        natGateways: 0,
        subnetConfiguration: [
            {
                name: "Private",
                subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
            },
        ],
    });
    const securityGroups = new cfSgFrameStack(
        stack,
        "SecurityGroups",
        {
            projectName: "test",
            dashboardName: "test",
            envName: "unit",
            vpcCidr: "10.80.0.0/16",
            defaultGatewayCidr: "0.0.0.0/0",
        },
        { vpc },
    );
    new cfSgRuleStack(stack, "SecurityGroupRules", {
        albSecurityGroupFrame: securityGroups.albSecurityGroupFrame,
        batchSecurityGroupFrame: securityGroups.batchSecurityGroupFrame,
        bastionSecurityGroupFrame: securityGroups.bastionSecurityGroupFrame,
        ecsSecurityGroupFrame: securityGroups.ecsSecurityGroupFrame,
        elasticacheSecurityGroupFrame:
            securityGroups.elasticacheSecurityGroupFrame,
        auroraSecurityGroupFrame: securityGroups.auroraSecurityGroupFrame,
        lambdaSecurityGroupFrame: securityGroups.lambdaSecurityGroupFrame,
        vpcEndPointS3SecurityGroupFrame:
            securityGroups.vpcEndPointS3SecurityGroupFrame,
        vpcEndPointECRSecurityGroupFrame:
            securityGroups.vpcEndPointECRSecurityGroupFrame,
        vpcEndPointSSMSecurityGroupFrame:
            securityGroups.vpcEndPointSSMSecurityGroupFrame,
        vpcEndPointKMSSecurityGroupFrame:
            securityGroups.vpcEndPointKMSSecurityGroupFrame,
        vpcEndPointCloudWatchLogsSecurityGroupFrame:
            securityGroups.vpcEndPointCloudWatchLogsSecurityGroupFrame,
    });

    const storage = new cfStorageStack(
        stack,
        "Storage",
        {
            vpcId: vpc.vpcId,
            privateSubnetIds: vpc.isolatedSubnets.map(
                (subnet) => subnet.subnetId,
            ),
            privateSubnetRouteTableIds: vpc.isolatedSubnets.map(
                (subnet) => subnet.routeTable.routeTableId,
            ),
            applicationKey: new kms.Key(stack, "ApplicationKey"),
            ecrKey: new kms.Key(stack, "EcrKey"),
            s3Key: new kms.Key(stack, "S3Key"),
        },
        {
            vpcEndPointS3SecurityGroup:
                securityGroups.vpcEndPointS3SecurityGroupFrame,
            vpcEndPointECRSecurityGroup:
                securityGroups.vpcEndPointECRSecurityGroupFrame,
            vpcEndPointSSMSecurityGroup:
                securityGroups.vpcEndPointSSMSecurityGroupFrame,
            vpcEndPointKMSSecurityGroup:
                securityGroups.vpcEndPointKMSSecurityGroupFrame,
            vpcEndPointCloudWatchLogsSecurityGroup:
                securityGroups.vpcEndPointCloudWatchLogsSecurityGroupFrame,
        },
        {
            projectName: "test",
            dashboardName: "test",
            nakedDomainName: "example.com",
        },
        {
            envName: "unit",
            vpcCidr: "10.80.0.0/16",
            defaultGatewayCidr: "0.0.0.0/0",
        },
    );

    const template = Template.fromStack(stack);
    const endpointResources = template.findResources("AWS::EC2::VPCEndpoint");
    const interfaceEndpoints = Object.values(endpointResources).filter(
        (endpoint) => endpoint.Properties.VpcEndpointType === "Interface",
    );
    expect(interfaceEndpoints).toHaveLength(7);
    for (const endpoint of interfaceEndpoints) {
        expect(endpoint.Properties.IpAddressType).toBe("ipv4");
        expect(endpoint.Properties.DnsOptions.DnsRecordIpType).toBe("ipv4");
        expect(endpoint.Properties.SubnetIds).toHaveLength(2);
        expect(endpoint.Properties.PolicyDocument.Statement).toBeDefined();
    }

    const s3Endpoint =
        endpointResources[stack.getLogicalId(storage.vpcEndpointS3)];
    expect(s3Endpoint.Properties.RouteTableIds).toHaveLength(2);
    expect(s3Endpoint.Properties.PolicyDocument.Statement).toBeDefined();

    const sharedSecurityGroupId = stack.resolve(
        securityGroups.vpcEndPointSSMSecurityGroupFrame.securityGroupId,
    );

    for (const endpoint of [
        storage.vpcEndpointSSM,
        storage.vpcEndpointSSMEC2,
        storage.vpcEndpointSSMEC2Messages,
    ]) {
        expect(
            endpointResources[stack.getLogicalId(endpoint)].Properties
                .SecurityGroupIds,
        ).toEqual([sharedSecurityGroupId]);
    }

    const ssmIngressRules = Object.values(
        template.findResources("AWS::EC2::SecurityGroupIngress"),
    ).filter(
        (rule) =>
            JSON.stringify(rule.Properties.GroupId) ===
            JSON.stringify(sharedSecurityGroupId),
    );
    expect(ssmIngressRules).toHaveLength(4);
    expect(
        ssmIngressRules.every(
            (rule) =>
                rule.Properties.IpProtocol === "tcp" &&
                rule.Properties.FromPort === 443 &&
                rule.Properties.ToPort === 443,
        ),
    ).toBe(true);
});
