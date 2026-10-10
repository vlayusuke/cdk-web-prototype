import * as cdk from "aws-cdk-lib/core";
import type { Construct } from "constructs";
import { commonParameter } from "../config/commonParameter";
import type { DevParameter } from "../config/devParameter";
import type { PrdParameter } from "../config/prdParameter";
import type { StgParameter } from "../config/stgParameter";
import { CfCICDStack } from "./construct/cfCICDStack";
import { CfComputeBackendStack } from "./construct/cfComputeBackendStack";
import { CfComputeDefinitionStack } from "./construct/cfComputeDefinitionStack";
import { CfComputeServerlessStack } from "./construct/cfComputeServerlessStack";
import { CfComputeWebAPStack } from "./construct/cfComputeWebAPStack";
import { CfDatabaseStack } from "./construct/cfDatabaseStack";
import { CfDNSAndCDNStack } from "./construct/cfDNSAndCDNStack";
import { CfLoggingStack } from "./construct/cfLoggingStack";
import { CfMonitoringStack } from "./construct/cfMonitoringStack";
import { CfNetworkStack } from "./construct/cfNetworkStack";
import { CfNotificationStack } from "./construct/cfNotificationStack";
import { CfSecurityConfigStack } from "./construct/cfSecurityConfigStack";
import { CfSecurityServiceStack } from "./construct/cfSecurityServiceStack";
import { CfSgFrameStack } from "./construct/cfSgFrameStack";
import { CfSgRuleStack } from "./construct/cfSgRuleStack";
import { CfStorageStack } from "./construct/cfStorageStack";

export interface CommonProps {
    projectName: string;
    dashboardName: string;
    availabilityZones: [string, string, string?];
}

export interface EnvProps {
    envName: string;
    vpcCidr: string;
    defaultGatewayCidr: string;
    slackHookUrl: string;
}

export interface CfCdkWebPrototypeStackProps extends cdk.StackProps {
    deploymentParameter: PrdParameter | StgParameter | DevParameter;
}

/**
 * The main stack for the web prototype.
 * This stack orchestrates the various components required for the web prototype, including security, network, database, storage, and compute resources.
 * It integrates security configurations, network setup, database provisioning, storage management, and compute definitions to provide a comprehensive web prototype environment.
 * This stack serves as the central point for managing and deploying all the necessary infrastructure components for the web prototype.
 * This stack ensures that all components are properly configured and interconnected to support the web prototype's functionality.
 *
 * construction order:
 *   1. [01] CfSecurityConfigStack
 *   2. [02] CfNetworkStack
 *   3. [03] CfSgFrameStack
 *   4. [04] CfDatabaseStack
 *   5. [05] CfSecurityServiceStack
 *   6. [06] CfStorageStack
 *   7. [07] CfComputeWebAPStack
 *   8. [08] CfComputeBackendStack
 *   9. [09] CfSgRuleStack
 *  10. [10] CfDNSAndCDNStack
 *  11. [11] CfComputeDefinitionStack
 *  12. [12] CfNotificationStack
 *  13. [13] CfMonitoringStack
 *  14. [14] CfLoggingStack
 *  15. [15] CfComputeServerlessStack
 *  16. [16] CfCICDStack
 */
export class CfCdkWebPrototypeStack extends cdk.Stack {
    constructor(
        scope: Construct,
        id: string,
        props: CfCdkWebPrototypeStackProps,
    ) {
        super(scope, id, props);

        const deploymentParameter = props.deploymentParameter;
        const commonProps = {
            ...commonParameter,
            envName: deploymentParameter.envName,
        };
        const envProps = {
            envName: deploymentParameter.envName,
            vpcCidr: deploymentParameter.vpcCidr,
            defaultGatewayCidr: deploymentParameter.defaultGatewayCidr,
            slackHookUrl: deploymentParameter.slackHookUrl,
        };
        if (commonProps.availabilityZones.length < 2) {
            throw new Error("At least two availability zones are required.");
        }

        // ------------------------------------------------------------
        // [01] - CfSecurityConfigStack
        // ------------------------------------------------------------
        const securityConfigStack = new CfSecurityConfigStack(
            this,
            "CfSecurityConfigStack",
            commonProps,
            envProps,
        );

        //-------------------------------------------------------------
        // [02] - CfNetworkStack
        // ------------------------------------------------------------
        const networkStack = new CfNetworkStack(
            this,
            "CfNetworkStack",
            { s3Key: securityConfigStack.s3Key },
            commonProps,
            {
                ...envProps,
                availabilityZones: commonProps.availabilityZones,
            },
        );

        //-------------------------------------------------------------
        // [03] - CfSgFrameStack
        // ------------------------------------------------------------
        const sgFrameStack = new CfSgFrameStack(
            this,
            "CfSgFrameStack",
            { vpc: networkStack.Vpc },
            commonProps,
            envProps,
        );

        // ------------------------------------------------------------
        // [04] - CfDatabaseStack
        // ------------------------------------------------------------
        new CfDatabaseStack(
            this,
            "CfDatabaseStack",
            {
                auroraSecurityGroup: sgFrameStack.auroraSecurityGroupFrame,
                elasticacheSecurityGroup:
                    sgFrameStack.elasticacheSecurityGroupFrame,
            },
            {
                subnetIds: networkStack.Vpc.privateSubnets.map(
                    (subnet) => subnet.subnetId,
                ),
                availabilityZones: commonProps.availabilityZones,
            },
            {
                auroraKey: securityConfigStack.auroraKey,
                elasticacheKey: securityConfigStack.elasticacheKey,
            },
            commonProps,
            envProps,
        );

        // ------------------------------------------------------------
        // [05] - CfSecurityServiceStack
        // ------------------------------------------------------------
        const securityServiceStack = new CfSecurityServiceStack(
            this,
            "CfSecurityServiceStack",
            commonProps,
            envProps,
            {
                s3Key: securityConfigStack.s3Key,
            },
        );

        // ------------------------------------------------------------
        // [06] - CfStorageStack
        // ------------------------------------------------------------
        const storageStack = new CfStorageStack(
            this,
            "CfStorageStack",
            {
                vpcId: networkStack.Vpc.vpcId,
                privateSubnetIds: networkStack.Vpc.privateSubnets.map(
                    (subnet) => subnet.subnetId,
                ),
                privateSubnetRouteTableIds: networkStack.Vpc.privateSubnets.map(
                    (subnet) => subnet.routeTable.routeTableId,
                ),
            },
            {
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
            envProps,
        );

        // ------------------------------------------------------------
        // [07] - CfComputeWebAPStack
        // ------------------------------------------------------------
        const computeWebAPStack = new CfComputeWebAPStack(
            this,
            "CfComputeWebAPStack",
            {
                vpcId: networkStack.Vpc.vpcId,
                publicSubnetIds: networkStack.Vpc.publicSubnets.map(
                    (subnet) => subnet.subnetId,
                ),
                publicSubnetRouteTableIds: networkStack.Vpc.publicSubnets.map(
                    (subnet) => subnet.routeTable.routeTableId,
                ),
                availabilityZones: commonProps.availabilityZones,
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
        // [08] - CfComputeBackendStack
        // ------------------------------------------------------------
        new CfComputeBackendStack(
            this,
            "CfComputeBackendStack",
            {
                vpcId: networkStack.Vpc.vpcId,
                publicSubnetIds: networkStack.Vpc.publicSubnets.map(
                    (subnet) => subnet.subnetId,
                ),
                publicSubnetRouteTableIds: networkStack.Vpc.publicSubnets.map(
                    (subnet) => subnet.routeTable.routeTableId,
                ),
                availabilityZones: commonProps.availabilityZones,
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
        // [09] - CfSgRuleStack
        // ------------------------------------------------------------
        new CfSgRuleStack(this, "CfSgRuleStack", {
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
        // [10] - CfDNSAndCDNStack
        // ------------------------------------------------------------
        const dnsAndCDNStack = new CfDNSAndCDNStack(
            this,
            "CfDNSAndCDNStack",
            {
                vpc: networkStack.Vpc,
                subnets: networkStack.Vpc.publicSubnets,
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
            commonProps,
            envProps,
        );

        // ------------------------------------------------------------
        // [11] - CfComputeDefinitionStack
        // ------------------------------------------------------------
        const computeDefinitionStack = new CfComputeDefinitionStack(
            this,
            "CfComputeDefinitionStack",
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
            commonProps,
            envProps,
        );

        // ------------------------------------------------------------
        // [12] - CfNotificationStack
        // ------------------------------------------------------------
        const notificationStack = new CfNotificationStack(
            this,
            "CfNotificationStack",
            {
                monitoringSlackWorkspaceId:
                    deploymentParameter.monitoringSlackWorkspaceId,
                monitoringSlackChannelId:
                    deploymentParameter.monitoringSlackChannelId,
            },
            {
                snsKeyArn: securityConfigStack.snsKey,
            },
            commonProps,
            envProps,
        );

        // ------------------------------------------------------------
        // [13] - CfMonitoringStack
        // ------------------------------------------------------------
        new CfMonitoringStack(
            this,
            "CfMonitoringStack",
            {
                ecsAppScalableTarget:
                    computeDefinitionStack.ecsAppScalableTarget,
            },
            commonProps,
            envProps,
        );

        // ------------------------------------------------------------
        // [14] - CfLoggingStack
        // ------------------------------------------------------------
        const loggingStack = new CfLoggingStack(
            this,
            "CfLoggingStack",
            commonProps,
            envProps,
        );

        // ------------------------------------------------------------
        // [15] - CfComputeBackendStack
        // ------------------------------------------------------------
        const computeServerlessStack = new CfComputeServerlessStack(
            this,
            "CfComputeServerlessStack",
            {
                lambdaKey: securityConfigStack.lambdaKey,
            },
            commonProps,
            envProps,
        );
        loggingStack.addCloudWatchLogsAlertSubscription(
            computeServerlessStack.lambdaCloudWatchLogsAlert,
        );
        notificationStack.addEventNotificationSubscription(
            computeServerlessStack.lambdaCloudWatchMetricsAlert,
        );

        // ------------------------------------------------------------
        // [16] - CfCICDStack
        // ------------------------------------------------------------
        new CfCICDStack(this, "CfCICDStack", commonProps, envProps, {
            codeCommitKey: securityConfigStack.codeCommitKey,
        });
    }
}
