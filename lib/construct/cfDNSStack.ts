import type { aws_ec2 as ec2 } from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib";
import {
    aws_certificatemanager as acm,
    aws_elasticloadbalancingv2 as elbv2,
    aws_route53 as route53,
    aws_route53_targets as route53_targets,
} from "aws-cdk-lib";
import { Construct } from "constructs";

export interface commonProps {
    projectName: string;
    envName: string;
    nakedDomainName: string;
}

export interface pocProps {
    Vpc: ec2.IVpc;
    vpcCidr: string;
    defaultGatewayCidr: string;
}

// ------------------------------------------------------------
// [10][11] - DNS Stack
// ------------------------------------------------------------
export class cfDNSStack extends Construct {
    public readonly albExternal: elbv2.ApplicationLoadBalancer;
    public readonly route53PublicHostedZone: route53.PublicHostedZone;
    public readonly route53ARecord: route53.ARecord;
    public readonly route53AAAARecord: route53.AaaaRecord;
    public readonly acmCertificate: acm.Certificate;

    constructor(
        scope: Construct,
        id: string,
        props: commonProps,
        pocProps: pocProps,
    ) {
        super(scope, id);

        // ------------------------------------------------------------
        // Application Load Balancer Configuration
        // ------------------------------------------------------------
        this.albExternal = new elbv2.ApplicationLoadBalancer(
            this,
            "albExternal",
            {
                vpc: pocProps.Vpc,
                internetFacing: true,
            },
        );

        cdk.Tags.of(this.albExternal).add(
            "Name",
            `${props.projectName}-${props.envName}-alb-external`,
        );
        cdk.Tags.of(this.albExternal).add("ProvisionedBy", "AWS");

        // ------------------------------------------------------------
        // Amazon Route 53 Public Hosted Zone Configuration
        // ------------------------------------------------------------
        this.route53PublicHostedZone = new route53.PublicHostedZone(
            this,
            "route53PublicHostedZone",
            {
                zoneName: `${props.envName}.${props.nakedDomainName}`,
                comment: `Public Hosted Zone for ${props.projectName} - ${props.envName} environment`,
            },
        );

        cdk.Tags.of(this.route53PublicHostedZone).add(
            "Name",
            `${props.projectName}-${props.envName}-r53-pub-host-zone`,
        );
        cdk.Tags.of(this.route53PublicHostedZone).add("ProvisionedBy", "AWS");

        // ------------------------------------------------------------
        // Amazon Route 53 A Record Configuration
        // ------------------------------------------------------------
        this.route53ARecord = new route53.ARecord(this, "route53ARecord", {
            zone: this.route53PublicHostedZone,
            recordName: `${props.envName}.${props.nakedDomainName}`,
            target: route53.RecordTarget.fromAlias(
                new route53_targets.LoadBalancerTarget(this.albExternal),
            ),
        });

        cdk.Tags.of(this.route53ARecord).add(
            "Name",
            `${props.projectName}-${props.envName}-r53-a-record`,
        );
        cdk.Tags.of(this.route53ARecord).add("ProvisionedBy", "AWS");

        // ------------------------------------------------------------
        // Amazon Route 53 AAAA Record Configuration
        // ------------------------------------------------------------
        this.route53AAAARecord = new route53.AaaaRecord(
            this,
            "route53AAAARecord",
            {
                zone: this.route53PublicHostedZone,
                recordName: `${props.envName}.${props.nakedDomainName}`,
                target: route53.RecordTarget.fromAlias(
                    new route53_targets.LoadBalancerTarget(this.albExternal),
                ),
            },
        );

        cdk.Tags.of(this.route53AAAARecord).add(
            "Name",
            `${props.projectName}-${props.envName}-r53-aaaa-record`,
        );
        cdk.Tags.of(this.route53AAAARecord).add("ProvisionedBy", "AWS");

        // ------------------------------------------------------------
        // AWS Certificate Manager Configuration
        // ------------------------------------------------------------
        this.acmCertificate = new acm.Certificate(this, "acmCertificate", {
            domainName: `${props.envName}.${props.nakedDomainName}`,
            validation: acm.CertificateValidation.fromDns(
                this.route53PublicHostedZone,
            ),
        });

        cdk.Tags.of(this.acmCertificate).add(
            "Name",
            `${props.projectName}-${props.envName}-acm-certificate`,
        );
        cdk.Tags.of(this.acmCertificate).add("ProvisionedBy", "AWS");
    }
}
