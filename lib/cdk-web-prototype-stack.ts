import * as cdk from "aws-cdk-lib/core";
import type { Construct } from "constructs";
import { commonParameter } from "../commonParameter";
import { pocParameter } from "../pocParameter";
import { cfCICDStack } from "./construct/cfCICDStack";
import { cfComputeBatchStack } from "./construct/cfComputeBatchStack";
import { cfComputeDefinitionStack } from "./construct/cfComputeDefinitionStack";
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
    envName: string;
}

export interface pocProps {
    vpcCidr: string;
    defaultGatewayCidr: string;
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
 *   8. [08] cfComputeBatchStack
 *   9. [09] cfComputeServerlessStack
 *  10. [10] cfSgRuleStack
 *  11. [11] cfDNSAndCDNStack
 *  12. [12] cfComputeDefinitionStack
 *  13. [13] cfNotificationStack
 *  14. [14] cfMonitoringStack
 *  15. [15] cfLoggingStack
 *  16. [16] cfCICDStack
 */
export class cfCdkWebPrototypeStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const commonProps = {
            ...commonParameter,
            envName: pocParameter.envName,
        };

        // ------------------------------------------------------------
        // [01] - cfSecurityConfigStack
        // ------------------------------------------------------------
        const securityConfigStack = new cfSecurityConfigStack(
            this,
            "cfSecurityConfigStack",
            commonProps,
        );

        // ------------------------------------------------------------
        // [02] - cfNetowrkStack
        // ------------------------------------------------------------
        const networkStack = new cfNetworkStack(
            this,
            "networkStack",
            {
                ...commonProps,
                vpcCidr: pocParameter.vpcCidr,
                defaultGatewayCidr: pocParameter.defaultGatewayCidr,
            },
            {
                s3Key: securityConfigStack.s3Key,
            },
        );

        // ------------------------------------------------------------
        // [03] - cfSgFrameStack
        // ------------------------------------------------------------
        const sgFrameStack = new cfSgFrameStack(
            this,
            "cfSgFrameStack",
            commonProps,
            { vpc: networkStack.Vpc },
        );

        // ------------------------------------------------------------
        // [04] - cfDatabaseStack
        // ------------------------------------------------------------
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
            {
                s3Key: securityConfigStack.s3Key,
            },
            commonProps,
        );

        // ------------------------------------------------------------
        // [06] - cfStorageStack
        // ------------------------------------------------------------
        const storageStack = new cfStorageStack(
            this,
            "cfStorageStack",
            {
                vpcId: networkStack.Vpc.vpcId,
                privateSubnetA: networkStack.Vpc.privateSubnets[0].subnetId,
                privateSubnetC: networkStack.Vpc.privateSubnets[1].subnetId,
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
                vpcEndPointSSMEC2SecurityGroup:
                    sgFrameStack.vpcEndPointSSMSecurityGroupFrame,
                vpcEndPointSSMEC2MessagesSecurityGroup:
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
                subnetIds: [
                    networkStack.Vpc.privateSubnets[0].subnetId,
                    networkStack.Vpc.privateSubnets[1].subnetId,
                ],
            },
            {
                bastionSecurityGroup: sgFrameStack.bastionSecurityGroupFrame,
            },
            commonProps,
        );

        // ------------------------------------------------------------
        // [08] - cfComputeBatchStack
        // ------------------------------------------------------------
        new cfComputeBatchStack(
            this,
            "cfComputeBatchStack",
            {
                vpcId: networkStack.Vpc.vpcId,
                subnetIds: [
                    networkStack.Vpc.privateSubnets[0].subnetId,
                    networkStack.Vpc.privateSubnets[1].subnetId,
                ],
            },
            {
                batchSecurityGroup: sgFrameStack.batchSecurityGroupFrame,
            },
            commonProps,
        );

        // ------------------------------------------------------------
        // [10] - cfSgRuleStack
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
        // [11] - cfDNSAndCDNStack
        // ------------------------------------------------------------
        const dnsAndCDNStack = new cfDNSAndCDNStack(
            this,
            "cfDNSAndCDNStack",
            commonProps,
            {
                Vpc: networkStack.Vpc,
                vpcCidr: pocParameter.vpcCidr,
                defaultGatewayCidr: pocParameter.defaultGatewayCidr,
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
        // [12] - cfComputeDefinitionStack
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
            commonProps,
        );

        // ------------------------------------------------------------
        // [13] - cfNotificationStack
        // ------------------------------------------------------------
        new cfNotificationStack(
            this,
            "cfNotificationStack",
            commonProps,
            {
                monitoringSlackWorkspaceId:
                    pocParameter.monitoringSlackWorkspaceId,
                monitoringSlackChannelId: pocParameter.monitoringSlackChannelId,
            },
            {
                snsKeyArn: securityConfigStack.snsKey,
            },
        );

        // ------------------------------------------------------------
        // [14] - cfMonitoringStack
        // ------------------------------------------------------------
        new cfMonitoringStack(
            this,
            "cfMonitoringStack",
            {
                ecsAppScalableTarget:
                    computeDefinitionStack.ecsAppScalableTarget,
            },
            commonProps,
        );

        // ------------------------------------------------------------
        // [15] - cfLoggingStack
        // ------------------------------------------------------------
        new cfLoggingStack(this, "cfLoggingStack", commonProps);

        // ------------------------------------------------------------
        // [16] - cfCICDStack
        // ------------------------------------------------------------
        new cfCICDStack(this, "cfCICDStack", commonProps, {
            codeCommitKey: securityConfigStack.codeCommitKey,
        });
    }
}
