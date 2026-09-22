import * as cdk from "aws-cdk-lib/core";
import type { Construct } from "constructs";
import { commonParameter } from "../commonParameter";
import { pocParameter } from "../pocParameter";
import { cfComputeBatchStack } from "./construct/cfComputeBatchStack";
import { cfComputeDefinitionStack } from "./construct/cfComputeDefinitionStack";
import { cfComputeWebAPStack } from "./construct/cfComputeWebAPStack";
import { cfDatabaseStack } from "./construct/cfDatabaseStack";
import { cfDNSStack } from "./construct/cfDNSStack";
import { cfMonitoringAndLoggingStack } from "./construct/cfMonitoringAndLoggingStack";
import { cfNetworkStack } from "./construct/cfNetworkStack";
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
 *  1. [01] cfSecurityConfigStack as securityConfigStack
 *  2. [02] cfNetworkStack as networkStack
 *  3. [03] cfSgFrameStack as sgFrameStack
 *  4. [04] cfDatabaseStack as databaseStack
 *  5. [05] cfSecurityServiceStack as securityServiceStack
 *  6. [06] cfStorageStack as storageStack
 *  7. [07] cfComputeWebAPStack as computeWebAPStack
 *  8. [08] cfComputeBatchStack as computeBatchStack
 *  9. [09] cfSgRuleStack as sgRuleStack
 * 10. [10][11] cfDNSStack as dnsStack
 * 11. [12] cfComputeDefinitionStack as computeDefinitionStack
 * 12. [13] cfMonitoringAndLoggingStack as monitoringAndLoggingStack
 */
export class CdkWebPrototypeStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // ------------------------------------------------------------
        // [01] - cfSecurityConfigStack
        // ------------------------------------------------------------
        const securityConfigStack: cfSecurityConfigStack =
            new cfSecurityConfigStack(
                this,
                "cfSecurityConfigStack",
                commonParameter,
            );

        // ------------------------------------------------------------
        // [02] - cfNetowrkStack
        // ------------------------------------------------------------
        const networkStack: cfNetworkStack = new cfNetworkStack(
            this,
            "cfNetworkStack",
            {
                ...commonParameter,
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
            commonParameter,
        );

        // ------------------------------------------------------------
        // [04] - cfDatabaseStack
        // ------------------------------------------------------------
        const databaseStack = new cfDatabaseStack(
            this,
            "cfDatabaseStack",
            commonParameter,
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
            commonParameter,
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
            commonParameter,
        );

        // ------------------------------------------------------------
        // [07] - cfComputeWebAPStack
        // ------------------------------------------------------------
        const computeWebAPStack = new cfComputeWebAPStack(
            this,
            "cfComputeWebAPStack",
            {
                applicationKey: securityConfigStack.applicationKey,
                bastionKey: securityConfigStack.bastionKey,
            },
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
            commonParameter,
        );

        // ------------------------------------------------------------
        // [08] - cfComputeBatchStack
        // ------------------------------------------------------------
        const computeBatchStack = new cfComputeBatchStack(
            this,
            "cfComputeBatchStack",
            {
                applicationKey: securityConfigStack.applicationKey,
                bastionKey: securityConfigStack.bastionKey,
            },
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
            commonParameter,
        );

        // ------------------------------------------------------------
        // [09] - cfSgRuleStack
        // ------------------------------------------------------------
        const sgRuleStack = new cfSgRuleStack(this, "cfSgRuleStack", {
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
        // [10][11] - cfDNSStack
        // ------------------------------------------------------------
        const dnsStack = new cfDNSStack(
            this,
            "cfDNSStack",
            commonParameter,
            {
                Vpc: networkStack.Vpc,
                vpcCidr: pocParameter.vpcCidr,
                defaultGatewayCidr: pocParameter.defaultGatewayCidr,
            },
            {
                albSecurityGroup: sgFrameStack.albSecurityGroupFrame,
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
                targetGroup: dnsStack.albExternalTargetGroup,
            },
            {
                ecsCluster: computeWebAPStack.ecsCluster,
            },
            {
                applicationKey: securityConfigStack.applicationKey,
            },
            commonParameter,
        );

        // ------------------------------------------------------------
        // [13] - cfMonitoringAndLoggingStack
        // ------------------------------------------------------------
        const monitoringAndLoggingStack = new cfMonitoringAndLoggingStack(
            this,
            "cfMonitoringAndLoggingStack",
            {
                ecsAppScalableTarget:
                    computeDefinitionStack.ecsAppScalableTarget,
            },
            commonParameter,
        );
    }
}
