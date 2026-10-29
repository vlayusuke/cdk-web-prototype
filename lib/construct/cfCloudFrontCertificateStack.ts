import * as cdk from "aws-cdk-lib";
import {
    aws_certificatemanager as acm,
    aws_route53 as route53,
} from "aws-cdk-lib";
import { Construct } from "constructs";

export interface CommonProps {
    projectName: string;
    envName: string;
    nakedDomainName: string;
}

export interface CfCloudFrontCertificateStackProps extends cdk.StackProps {
    commonProps: CommonProps;
}

// ************************************************************
// [10] - CloudFront Certificate Stack
// ************************************************************
export class CfCloudFrontCertificateStack extends cdk.Stack {
    public readonly route53PublicHostedZone: route53.CfnHostedZone;
    public readonly route53ARecord: route53.CfnRecordSet;
    public readonly route53AAAARecord: route53.CfnRecordSet;
    public readonly route53HealthCheck: route53.CfnHealthCheck;
    public readonly acmCertificateCloudFront: acm.CfnCertificate;

    constructor(
        scope: Construct,
        id: string,
        props: CfCloudFrontCertificateStackProps,
    ) {
        super(scope, id, props);

        const { commonProps } = props;
        const prefix = `${commonProps.projectName}-${commonProps.envName}`;
        const domainName = `${commonProps.envName}.${commonProps.nakedDomainName}`;

        const addCommonTags = (target: Construct, name: string) => {
            cdk.Tags.of(target).add("Name", name);
            cdk.Tags.of(target).add("ProvisionedBy", "AWS");
            cdk.Tags.of(target).add("ProjectCode", "1234567890");
        };

        // ------------------------------------------------------------
        // Amazon Route 53 Public Hosted Zone Configuration
        // ------------------------------------------------------------
        const route53PublicHostedZoneScope = new Construct(
            this,
            "route53PublicHostedZone",
        );

        this.route53PublicHostedZone = new route53.CfnHostedZone(
            route53PublicHostedZoneScope,
            "Resource",
            {
                name: `${domainName}.`,
                hostedZoneConfig: {
                    comment: `Public Hosted Zone for ${commonProps.projectName} - ${commonProps.envName} environment`,
                },
            },
        );

        addCommonTags(
            route53PublicHostedZoneScope,
            `${prefix}-r53-pub-host-zone`,
        );

        // ------------------------------------------------------------
        // Amazon Route 53 A Record
        // ------------------------------------------------------------
        const route53ARecordScope = new Construct(this, "route53ARecord");

        this.route53ARecord = new route53.CfnRecordSet(
            route53ARecordScope,
            "Resource",
            {
                hostedZoneId: this.route53PublicHostedZone.ref,
                name: domainName,
                type: "A",
            },
        );

        addCommonTags(route53ARecordScope, `${prefix}-r53-a-record`);

        // ------------------------------------------------------------
        // Amazon Route 53 AAAA Record
        // ------------------------------------------------------------
        const route53AAAARecordScope = new Construct(this, "route53AAAARecord");

        this.route53AAAARecord = new route53.CfnRecordSet(
            route53AAAARecordScope,
            "Resource",
            {
                hostedZoneId: this.route53PublicHostedZone.ref,
                name: domainName,
                type: "AAAA",
            },
        );

        addCommonTags(route53AAAARecordScope, `${prefix}-r53-aaaa-record`);

        // ------------------------------------------------------------
        // Amazon Route 53 Health Check
        // ------------------------------------------------------------
        const route53HealthCheckScope = new Construct(
            this,
            "route53HealthCheck",
        );

        this.route53HealthCheck = new route53.CfnHealthCheck(
            route53HealthCheckScope,
            "Resource",
            {
                healthCheckConfig: {
                    type: "HTTPS",
                    fullyQualifiedDomainName: domainName,
                    port: 443,
                    requestInterval: 30,
                    failureThreshold: 3,
                },
            },
        );

        addCommonTags(route53HealthCheckScope, `${prefix}-r53-health-check`);

        // ------------------------------------------------------------
        // AWS Certificate Manager for Amazon CloudFront Configuration
        // ------------------------------------------------------------
        const acmCertificateCloudFrontScope = new Construct(
            this,
            "acmCertificateCloudFront",
        );

        this.acmCertificateCloudFront = new acm.CfnCertificate(
            acmCertificateCloudFrontScope,
            "Resource",
            {
                domainName,
                validationMethod: "DNS",
                domainValidationOptions: [
                    {
                        domainName,
                        hostedZoneId: this.route53PublicHostedZone.ref,
                    },
                ],
            },
        );

        addCommonTags(
            acmCertificateCloudFrontScope,
            `${prefix}-acm-certificate-cloudfront`,
        );
    }
}
