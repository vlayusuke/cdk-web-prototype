import * as cdk from "aws-cdk-lib/core";
import type { Construct } from "constructs";
import { commonParameter } from "../config/commonParameter";
import type { PrdParameter } from "../config/prdParameter";
import type { StgParameter } from "../config/stgParameter";
import { cfCICDStack } from "./construct/cfCICDStack";
import { cfComputeBackendStack } from "./construct/cfComputeBackendStack";
import { cfComputeDefinitionStack } from "./construct/cfComputeDefinitionStack";
import { cfComputeServerlessStack } from "./construct/cfComputeServerlessStack";
import { cfComputeWebAPStack } from "./construct/cfComputeWebAPStack";
import { cfDatabaseStack } from "./construct/cfDatabaseStack";
import { cfDNSAndCDNStack } from "./construct/cfDNSAndCDNStack";
import { cfLoggingStack } from "./construct/cfLoggingStack";
import { cfMonitoringStack } from "./construct/cfMonitoringStack";
import { cfNetworkStack } from "./construct/cfNetworkStack";
import { cfNotificationStack } from "./construct/cfNotificationStack";
import { cfSecurityConfigStack } from "./construct/cfSecurityConfigStack";
import { cfSecurityServiceStack } from "./construct/cfSecurityServiceStack";
import { cfSgFrameStack } from "./construct/cfSgFrameStack";
import { cfSgRuleStack } from "./construct/cfSgRuleStack";
import { cfStorageStack } from "./construct/cfStorageStack";

export interface commonProps {
    projectName: string;
    dashboardName: string;
}

export interface envProps {
    envName: string;
    vpcCidr: string;
    defaultGatewayCidr: string;
    slackHookUrl: string;
}

export interface cfCdkWebPrototypeStackProps extends cdk.StackProps {
    deploymentParameter: PrdParameter | StgParameter;
}

/**
 * The main stack for the web prototype.
 * This stack orchestrates the various components required for the web prototype, including security, network, database, storage, and compute resources.
 * It integrates security configurations, network setup, database provisioning, storage management, and compute definitions to provide a comprehensive web prototype environment.
 * This stack serves as the central point for managing and deploying all the necessary infrastructure components for the web prototype.
 * This stack ensures that all components are properly configured and interconnected to support the web prototype's functionality.
 *
 * construction order:
 *   1. [01] cfSecurityConfigStack
 *   2. [02] cfNetworkStack
 *   3. [03] cfSgFrameStack
 *   4. [04] cfDatabaseStack
 *   5. [05] cfSecurityServiceStack
 *   6. [06] cfStorageStack
 *   7. [07] cfComputeWebAPStack
 *   8. [08] cfComputeBackendStack
 *   9. [09] cfSgRuleStack
 *  10. [10] cfDNSAndCDNStack
 *  11. [11] cfComputeDefinitionStack
 *  12. [12] cfNotificationStack
 *  13. [13] cfMonitoringStack
 *  14. [14] cfLoggingStack
 *  15. [15] cfComputeServerlessStack
 *  16. [16] cfCICDStack
 */
export class cfCdkWebPrototypeStack extends cdk.Stack {
    constructor(
        scope: Construct,
        id: string,
        props: cfCdkWebPrototypeStackProps,
    ) {
        super(scope, id, props);

        const deploymentParameter = props.deploymentParameter;
        const commonProps = {
            ...commonParameter,
            envName: deploymentParameter.envName,
        };
        if (commonParameter.availabilityZones.length < 2) {
            throw new Error("At least two availability zones are required.");
        }

        const securityConfigStack = new cfSecurityConfigStack(
            this,
            "cfSecurityConfigStack",
            commonProps,
        );

        const networkStack = new cfNetworkStack(
            this,
            "networkStack",
            {
                ...commonProps,
                vpcCidr: deploymentParameter.vpcCidr,
                defaultGatewayCidr: deploymentParameter.defaultGatewayCidr,
                availabilityZones: commonParameter.availabilityZones,
            },
            { s3Key: securityConfigStack.s3Key },
        );

        const sgFrameStack = new cfSgFrameStack(
            this,
            "cfSgFrameStack",
            commonProps,
            { vpc: networkStack.Vpc },
        );

        new cfDatabaseStack(
            this,
            "cfDatabaseStack",
            commonProps,
            {
                auroraSecurityGroup: sgFrameStack.auroraSecurityGroupFrame,
                elasticacheSecurityGroup:
                    sgFrameStack.elasticacheSecurityGroupFrame,
            },
            {
                subnetIds: networkStack.Vpc.privateSubnets.map(
                    (subnet) => subnet.subnetId,
                ),
                availabilityZones: commonParameter.availabilityZones,
            },
            {
                auroraKey: securityConfigStack.auroraKey,
                elasticacheKey: securityConfigStack.elasticacheKey,
            },
        );

        // ------------------------------------------------------------
        // [05] - cfSecurityServiceStack
        // ------------------------------------------------------------
        const securityServiceStack = new cfSecurityServiceStack(
            this,
            "cfSecurityServiceStack",
            commonProps,
            {
                s3Key: securityConfigStack.s3Key,
            },
        );

        // ------------------------------------------------------------
        // [06] - cfStorageStack
        // ------------------------------------------------------------
        const storageStack = new cfStorageStack(
            this,
            "cfStorageStack",
            {
                vpcId: networkStack.Vpc.vpcId,
                privateSubnetIds: networkStack.Vpc.privateSubnets.map(
                    (subnet) => subnet.subnetId,
                ),
                privateSubnetRouteTableIds: networkStack.Vpc.privateSubnets.map(
                    (subnet) => subnet.routeTable.routeTableId,
                ),
                applicationKey: securityConfigStack.applicationKey,
                ecrKey: securityConfigStack.ecrKey,
                s3Key: securityConfigStack.s3Key,
            },
            {
                vpcEndPointS3SecurityGroup:
                    sgFrameStack.vpcEndPointS3SecurityGroupFrame,
                vpcEndPointECRSecurityGroup:
                    sgFrameStack.vpcEndPointECRSecurityGroupFrame,
                vpcEndPointSSMSecurityGroup:
                    sgFrameStack.vpcEndPointSSMSecurityGroupFrame,
                vpcEndPointKMSSecurityGroup:
                    sgFrameStack.vpcEndPointKMSSecurityGroupFrame,
                vpcEndPointCloudWatchLogsSecurityGroup:
                    sgFrameStack.vpcEndPointCloudWatchLogsSecurityGroupFrame,
            },
            commonProps,
        );

        // ------------------------------------------------------------
        // [07] - cfComputeWebAPStack
        // ------------------------------------------------------------
        const computeWebAPStack = new cfComputeWebAPStack(
            this,
            "cfComputeWebAPStack",
            {
                vpcId: networkStack.Vpc.vpcId,
                publicSubnetIds: networkStack.Vpc.publicSubnets.map(
                    (subnet) => subnet.subnetId,
                ),
                publicSubnetRouteTableIds: networkStack.Vpc.publicSubnets.map(
                    (subnet) => subnet.routeTable.routeTableId,
                ),
                availabilityZones: commonParameter.availabilityZones,
                defaultGatewayCidr: deploymentParameter.defaultGatewayCidr,
            },
            {
                bastionSecurityGroup: sgFrameStack.bastionSecurityGroupFrame,
            },
            commonProps,
            {
                envName: deploymentParameter.envName,
                vpcCidr: deploymentParameter.vpcCidr,
                defaultGatewayCidr: deploymentParameter.defaultGatewayCidr,
            },
        );

        // ------------------------------------------------------------
        // [08] - cfComputeBackendStack
        // ------------------------------------------------------------
        new cfComputeBackendStack(
            this,
            "cfComputeBackendStack",
            {
                vpcId: networkStack.Vpc.vpcId,
                publicSubnetIds: networkStack.Vpc.publicSubnets.map(
                    (subnet) => subnet.subnetId,
                ),
                publicSubnetRouteTableIds: networkStack.Vpc.publicSubnets.map(
                    (subnet) => subnet.routeTable.routeTableId,
                ),
                availabilityZones: commonParameter.availabilityZones,
            },
            {
                batchSecurityGroup: sgFrameStack.batchSecurityGroupFrame,
            },
            commonProps,
            {
                envName: deploymentParameter.envName,
                vpcCidr: deploymentParameter.vpcCidr,
                defaultGatewayCidr: deploymentParameter.defaultGatewayCidr,
            },
        );

        // ------------------------------------------------------------
        // [09] - cfSgRuleStack
        // ------------------------------------------------------------
        new cfSgRuleStack(this, "cfSgRuleStack", {
            albSecurityGroupFrame: sgFrameStack.albSecurityGroupFrame,
            batchSecurityGroupFrame: sgFrameStack.batchSecurityGroupFrame,
            bastionSecurityGroupFrame: sgFrameStack.bastionSecurityGroupFrame,
            ecsSecurityGroupFrame: sgFrameStack.ecsSecurityGroupFrame,
            auroraSecurityGroupFrame: sgFrameStack.auroraSecurityGroupFrame,
            elasticacheSecurityGroupFrame:
                sgFrameStack.elasticacheSecurityGroupFrame,
            lambdaSecurityGroupFrame: sgFrameStack.lambdaSecurityGroupFrame,
            vpcEndPointS3SecurityGroupFrame:
                sgFrameStack.vpcEndPointS3SecurityGroupFrame,
            vpcEndPointECRSecurityGroupFrame:
                sgFrameStack.vpcEndPointECRSecurityGroupFrame,
            vpcEndPointSSMSecurityGroupFrame:
                sgFrameStack.vpcEndPointSSMSecurityGroupFrame,
            vpcEndPointKMSSecurityGroupFrame:
                sgFrameStack.vpcEndPointKMSSecurityGroupFrame,
            vpcEndPointCloudWatchLogsSecurityGroupFrame:
                sgFrameStack.vpcEndPointCloudWatchLogsSecurityGroupFrame,
        });

        // ------------------------------------------------------------
        // [10] - cfDNSAndCDNStack
        // ------------------------------------------------------------
        const dnsAndCDNStack = new cfDNSAndCDNStack(
            this,
            "cfDNSAndCDNStack",
            commonProps,
            {
                Vpc: networkStack.Vpc,
                vpcCidr: deploymentParameter.vpcCidr,
                defaultGatewayCidr: deploymentParameter.defaultGatewayCidr,
            },
            {
                albSecurityGroup: sgFrameStack.albSecurityGroupFrame,
            },
            {
                assetsBucket: storageStack.s3BucketAssets,
                uploadsBucket: storageStack.s3BucketUploads,
            },
            {
                wafv2WebACL: securityServiceStack.wafv2WebACL,
            },
        );

        // ------------------------------------------------------------
        // [11] - cfComputeDefinitionStack
        // ------------------------------------------------------------
        const computeDefinitionStack = new cfComputeDefinitionStack(
            this,
            "cfComputeDefinitionStack",
            {
                ecsSecurityGroup: sgFrameStack.ecsSecurityGroupFrame,
            },
            {
                targetGroup: dnsAndCDNStack.albExternalTargetGroup,
            },
            {
                ecsCluster: computeWebAPStack.ecsCluster,
            },
            {
                applicationKey: securityConfigStack.applicationKey,
            },
            {
                projectName: commonParameter.projectName,
                dashboardName: commonParameter.dashboardName,
            },
            {
                envName: deploymentParameter.envName,
                vpcCidr: deploymentParameter.vpcCidr,
                defaultGatewayCidr: deploymentParameter.defaultGatewayCidr,
            },
        );

        // ------------------------------------------------------------
        // [12] - cfNotificationStack
        // ------------------------------------------------------------
        const notificationStack = new cfNotificationStack(
            this,
            "cfNotificationStack",
            commonProps,
            {
                monitoringSlackWorkspaceId:
                    deploymentParameter.monitoringSlackWorkspaceId,
                monitoringSlackChannelId:
                    deploymentParameter.monitoringSlackChannelId,
            },
            {
                snsKeyArn: securityConfigStack.snsKey,
            },
        );

        // ------------------------------------------------------------
        // [13] - cfMonitoringStack
        // ------------------------------------------------------------
        new cfMonitoringStack(this, "cfMonitoringStack", commonProps, {
            ecsAppScalableTarget: computeDefinitionStack.ecsAppScalableTarget,
        });

        // ------------------------------------------------------------
        // [14] - cfLoggingStack
        // ------------------------------------------------------------
        const loggingStack = new cfLoggingStack(
            this,
            "cfLoggingStack",
            commonProps,
        );

        // ------------------------------------------------------------
        // [15] - cfComputeBackendStack
        // ------------------------------------------------------------
        const computeServerlessStack = new cfComputeServerlessStack(
            this,
            "cfComputeServerlessStack",
            {
                lambdaKey: securityConfigStack.lambdaKey,
            },
            commonProps,
            {
                envName: deploymentParameter.envName,
                slackHookUrl: this.node.tryGetContext(
                    deploymentParameter.envName,
                ).slackHookUrl,
            },
        );
        loggingStack.addCloudWatchLogsAlertSubscription(
            computeServerlessStack.lambdaCloudWatchLogsAlert,
        );
        notificationStack.addEventNotificationSubscription(
            computeServerlessStack.lambdaCloudWatchMetricsAlert,
        );

        // ------------------------------------------------------------
        // [16] - cfCICDStack
        // ------------------------------------------------------------
        new cfCICDStack(this, "cfCICDStack", commonProps, {
            codeCommitKey: securityConfigStack.codeCommitKey,
        });
    }
}
