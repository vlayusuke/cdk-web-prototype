import type { Environment } from 'aws-cdk-lib';

// Parameters for PoC Application
export interface PocParameter {
  env?: Environment;
  monitoringNotifyEmail: string;
  monitoringSlackWorkspaceId: string;
  monitoringSlackChannelId: string;
  vpcCidr: string;
  defaultGatewayCidr: string;

  // -- Sample to use custom domain on CloudFront
  // hostedZoneId: string;
  // domainName: string;
  // cloudFrontHostName: string;
}

// Parameters for PoC Information
export const pocParameter: PocParameter = {
  env: {
    account: '111111111111',
    region: 'ap-northeast-1',
  },
  monitoringNotifyEmail: 'vlayusuke@gmail.com',
  monitoringSlackWorkspaceId: 'TXXXXXXXXXX',
  monitoringSlackChannelId: 'CYYYYYYYYYY',
  vpcCidr: '10.20.0.0/20',
  defaultGatewayCidr: '0.0.0.0/0',

  // -- Sample to use custom domain on CloudFront
  // hostedZoneId: 'Z00000000000000000000',
  // domainName: 'example.com',
  // cloudFrontHostName: 'www',
};
