import * as cdk from 'aws-cdk-lib/core';
import type { Construct } from 'constructs';
import { commonParameter } from '../commonParameter';
import { pocParameter } from '../pocParameter';
import { cfDatabaseStack } from './construct/cfDatabaseStack';
import { cfNetworkStack } from './construct/cfNetworkStack';
import { cfSecurityConfigStack } from './construct/cfSecurityConfigStack';
import { cfSecurityServiceStack } from './construct/cfSecurityServiceStack';
import { cfSgFrameStack } from './construct/cfSgFrameStack';
import { cfStorageStack } from './construct/cfStorageStack';


export interface commonProps {
    projectName: string;
    envName: string;
}

export interface pocProps {
    vpcCidr: string;
    defaultGatewayCidr: string;
}


export class CdkWebPrototypeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // [01] - cfSecurityConfigStack
    const securityConfigStack: cfSecurityConfigStack = new cfSecurityConfigStack(
      this,
      'cfSecurityConfigStack',
      commonParameter,
    );

    // [02] - cfNetowrkStack
    const networkStack: cfNetworkStack = new cfNetworkStack(
      this,
      'cfNetworkStack',
      {
        ...commonParameter,
        vpcCidr: pocParameter.vpcCidr,
        defaultGatewayCidr: pocParameter.defaultGatewayCidr,
      },
      {
        s3Key: securityConfigStack.s3Key,
      },
    );

    // [03] - Security group Frame Stack
    const sgFrameStack = new cfSgFrameStack(
      this,
      'cfSgFrameStack',
      commonParameter,
    );

    // [04] - Database Configuration Stack
    const databaseStack = new cfDatabaseStack(
      this,
      'cfDatabaseStack',
      commonParameter,
      {
        auroraSecurityGroup: sgFrameStack.auroraSecurityGroupFrame,
      },
      {
        subnetIds: networkStack.Vpc.privateSubnets.map((subnet) => subnet.subnetId),
      },
      {
        auroraKey: securityConfigStack.auroraKey,
      },
    );

    // [05] - Security Service Stack
    const securityServiceStack = new cfSecurityServiceStack(
      this,
      'cfSecurityServiceStack',
      {
        s3Key: securityConfigStack.s3Key,
      },
      commonParameter,
    );

    // [06] - Storage Stack
    const storageStack = new cfStorageStack(
      this,
      'cfStorageStack',
      {
        vpcId: networkStack.Vpc.vpcId,
        privateSubnetA: networkStack.Vpc.privateSubnets[0].subnetId,
        privateSubnetC: networkStack.Vpc.privateSubnets[1].subnetId,
        ecrKey: securityConfigStack.ecrKey,
        s3Key: securityConfigStack.s3Key,
      },
      {
        vpcEndPointS3SecurityGroup: sgFrameStack.vpcEndPointS3SecurityGroupFrame,
        vpcEndPointECRSecurityGroup: sgFrameStack.vpcEndPointECRSecurityGroupFrame,
        vpcEndPointSSMSecurityGroup: sgFrameStack.vpcEndPointSSMSecurityGroupFrame,
        vpcEndPointSSMEC2SecurityGroup: sgFrameStack.vpcEndPointSSMSecurityGroupFrame,
        vpcEndPointSSMEC2MessagesSecurityGroup: sgFrameStack.vpcEndPointSSMSecurityGroupFrame,
        vpcEndPointKMSSecurityGroup: sgFrameStack.vpcEndPointKMSSecurityGroupFrame,
        vpcEndPointCloudWatchLogsSecurityGroup: sgFrameStack.vpcEndPointCloudWatchLogsSecurityGroupFrame,
      },
      commonParameter,
    );


    // example resource
    // const queue = new sqs.Queue(this, 'CdkWebPrototypeQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}
