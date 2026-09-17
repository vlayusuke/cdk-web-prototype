import * as cdk from 'aws-cdk-lib';
import { aws_certificatemanager as acm, aws_route53 as route53 } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface commonProps {
    projectName: string;
    envName: string;
    nakedDomainName: string;
}

export interface pocProps {
  vpcCidr: string;
  defaultGatewayCidr: string;
}


// ------------------------------------------------------------
// [10] - DNS Configuration Stack
// ------------------------------------------------------------
export class cfDNSStack extends Construct {
    public readonly route53PublicHostedZone: route53.PublicHostedZone;
    public readonly acmCertificate: acm.Certificate;

    constructor(scope: Construct, id: string, props: commonProps) {
        super(scope, id);

        // ------------------------------------------------------------
        // Amazon Route 53 Public Hosted Zone Configuration
        // ------------------------------------------------------------
        this.route53PublicHostedZone = new route53.PublicHostedZone(this, 'route53PublicHostedZone', {
            zoneName: `${props.envName}.${props.nakedDomainName}`,
            comment: `Public Hosted Zone for ${props.projectName} - ${props.envName} environment`,
        });

        cdk.Tags.of(this.route53PublicHostedZone).add('Name', `${props.projectName}-${props.envName}-r53-pub-host-zone`);
        cdk.Tags.of(this.route53PublicHostedZone).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // AWS Certificate Manager Configuration
        // ------------------------------------------------------------
        this.acmCertificate = new acm.Certificate(this, 'acmCertificate', {
            domainName: `${props.envName}.${props.nakedDomainName}`,
            validation: acm.CertificateValidation.fromDns(this.route53PublicHostedZone),
        });

        cdk.Tags.of(this.acmCertificate).add('Name', `${props.projectName}-${props.envName}-acm-certificate`);
        cdk.Tags.of(this.acmCertificate).add('ProvisionedBy', 'AWS');
  }
}
