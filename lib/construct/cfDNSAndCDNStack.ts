import * as cdk from "aws-cdk-lib";
import {
    aws_certificatemanager as acm,
    aws_cloudfront as cloudfront,
    aws_ec2 as ec2,
    aws_elasticloadbalancingv2 as elbv2,
    aws_cloudfront_origins as origins,
    aws_route53 as route53,
    aws_route53_targets as route53_targets,
} from "aws-cdk-lib";
import type * as s3 from "aws-cdk-lib/aws-s3";
import type * as wafv2 from "aws-cdk-lib/aws-wafv2";
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

export interface networkProps {
    vpc: ec2.IVpc;
    subnets: ec2.ISubnet[];
}

export interface sgProps {
    albSecurityGroup: ec2.ISecurityGroup;
}

export interface wafProps {
    wafv2WebACL: wafv2.IWebACLRef;
}

export interface storageProps {
    assetsBucket: s3.IBucket;
    uploadsBucket: s3.IBucket;
}

// ------------------------------------------------------------
// [11] - DNS And CDN Stack
// ------------------------------------------------------------
export class cfDNSAndCDNStack extends Construct {
    public readonly route53PublicHostedZone: route53.PublicHostedZone;
    public readonly route53ARecord: route53.ARecord;
    public readonly route53AAAARecord: route53.AaaaRecord;
    public readonly acmCertificateALB: acm.Certificate;
    public readonly acmCertificateCloudFront: acm.Certificate;
    public readonly albExternal: elbv2.ApplicationLoadBalancer;
    public readonly albExternalListener: elbv2.ApplicationListener;
    public readonly albExternalTargetGroup: elbv2.ApplicationTargetGroup;
    public readonly cloudFrontDistribution: cloudfront.Distribution;

    constructor(
        scope: Construct,
        id: string,
        props: commonProps,
        pocProps: pocProps,
        sgProps: sgProps,
        storageProps: storageProps,
        wafProps: wafProps,
    ) {
        super(scope, id);

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
        // AWS Certificate Manager for ALB Configuration
        // ------------------------------------------------------------
        this.acmCertificateALB = new acm.Certificate(
            this,
            "acmCertificateALB",
            {
                domainName: `${props.envName}.${props.nakedDomainName}`,
                validation: acm.CertificateValidation.fromDns(
                    this.route53PublicHostedZone,
                ),
            },
        );

        cdk.Tags.of(this.acmCertificateALB).add(
            "Name",
            `${props.projectName}-${props.envName}-acm-certificate`,
        );
        cdk.Tags.of(this.acmCertificateALB).add("ProvisionedBy", "AWS");

        // ------------------------------------------------------------
        // AWS Certificate Manager for Amazon CloudFront Configuration
        // ------------------------------------------------------------
        this.acmCertificateCloudFront = new acm.Certificate(
            this,
            "acmCertificateCloudFront",
            {
                domainName: `${props.envName}.${props.nakedDomainName}`,
                validation: acm.CertificateValidation.fromDns(
                    this.route53PublicHostedZone,
                ),
            },
        );

        cdk.Tags.of(this.acmCertificateCloudFront).add(
            "Name",
            `${props.projectName}-${props.envName}-acm-certificate-cloudfront`,
        );
        cdk.Tags.of(this.acmCertificateCloudFront).add("ProvisionedBy", "AWS");

        // ------------------------------------------------------------
        // Application Load Balancer Configuration
        // ------------------------------------------------------------
        this.albExternal = new elbv2.ApplicationLoadBalancer(
            this,
            "albExternal",
            {
                vpc: pocProps.Vpc,
                vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
                securityGroup: sgProps.albSecurityGroup,
                internetFacing: true,
                http2Enabled: true,
                crossZoneEnabled: true,
                deletionProtection: false,
            },
        );

        cdk.Tags.of(this.albExternal).add(
            "Name",
            `${props.projectName}-${props.envName}-alb-external`,
        );
        cdk.Tags.of(this.albExternal).add("ProvisionedBy", "AWS");

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
        // Application Load Balancer Listener Configuration
        // ------------------------------------------------------------
        this.albExternalListener = this.albExternal.addListener(
            "albExternalListener",
            {
                port: 443,
                protocol: elbv2.ApplicationProtocol.HTTPS,
                sslPolicy: elbv2.SslPolicy.TLS13_RES,
                certificates: [this.acmCertificateALB],
                defaultAction: elbv2.ListenerAction.fixedResponse(404, {
                    contentType: "text/html",
                    messageBody:
                        "<html><head><title>404 Not Found</title></head><body><h1>Not Found</h1><hr><address>Apache/2.2.31</address></body></html>",
                }),
            },
        );

        const cfnAlbExternalListener = this.albExternalListener.node
            .defaultChild as elbv2.CfnListener;
        cfnAlbExternalListener.alpnPolicy = ["HTTP2Preferred"];

        cdk.Tags.of(this.albExternalListener).add(
            "Name",
            `${props.projectName}-${props.envName}-alb-external-listener`,
        );
        cdk.Tags.of(this.albExternalListener).add("ProvisionedBy", "AWS");

        // ------------------------------------------------------------
        // Application Load Balancer Target Rule Configuration
        // ------------------------------------------------------------
        this.albExternalTargetGroup = new elbv2.ApplicationTargetGroup(
            this,
            "albExternalTargetGroup",
            {
                targetType: elbv2.TargetType.IP,
                vpc: pocProps.Vpc,
                port: 80,
                protocol: elbv2.ApplicationProtocol.HTTP,
                loadBalancingAlgorithmType:
                    elbv2.TargetGroupLoadBalancingAlgorithmType.ROUND_ROBIN,
                crossZoneEnabled: true,
                deregistrationDelay: cdk.Duration.seconds(115),
                stickinessCookieDuration: cdk.Duration.seconds(86400),
                healthCheck: {
                    healthyThresholdCount: 3,
                    unhealthyThresholdCount: 3,
                    path: "/",
                    interval: cdk.Duration.seconds(30),
                    timeout: cdk.Duration.seconds(6),
                },
            },
        );

        cdk.Tags.of(this.albExternalTargetGroup).add(
            "Name",
            `${props.projectName}-${props.envName}-alb-external-target-group`,
        );
        cdk.Tags.of(this.albExternalTargetGroup).add("ProvisionedBy", "AWS");

        // ------------------------------------------------------------
        // Application Load Balancer Listener Rule Configuration
        // ------------------------------------------------------------
        const albExternalListenerRule = new elbv2.ApplicationListenerRule(
            this,
            "albExternalListenerRule",
            {
                listener: this.albExternalListener,
                priority: 1,
                conditions: [
                    elbv2.ListenerCondition.hostHeaders([
                        `${props.envName}.${props.nakedDomainName}`,
                    ]),
                ],
                action: elbv2.ListenerAction.forward([
                    this.albExternalTargetGroup,
                ]),
            },
        );

        cdk.Tags.of(albExternalListenerRule).add(
            "Name",
            `${props.projectName}-${props.envName}-alb-external-listener-rule`,
        );
        cdk.Tags.of(albExternalListenerRule).add("ProvisionedBy", "AWS");

        const albExternalListenerRuleRedirect =
            new elbv2.ApplicationListenerRule(
                this,
                "albExternalListenerRuleRedirect",
                {
                    listener: this.albExternalListener,
                    priority: 2,
                    conditions: [
                        elbv2.ListenerCondition.hostHeaders([
                            `www.${props.envName}.${props.nakedDomainName}`,
                        ]),
                    ],
                    action: elbv2.ListenerAction.redirect({
                        protocol: "HTTPS",
                        port: "443",
                        host: `${props.envName}.${props.nakedDomainName}`,
                        query: "",
                        permanent: true,
                    }),
                },
            );

        cdk.Tags.of(albExternalListenerRuleRedirect).add(
            "Name",
            `${props.projectName}-${props.envName}-alb-external-listener-rule-redirect`,
        );
        cdk.Tags.of(albExternalListenerRuleRedirect).add(
            "ProvisionedBy",
            "AWS",
        );

        const cloudFrontResponseHeadersPolicy =
            new cloudfront.ResponseHeadersPolicy(
                this,
                "cloudFrontResponseHeadersPolicy",
                {
                    responseHeadersPolicyName: `${props.projectName}-${props.envName}-cft-response-header-policy`,
                    comment: `Amazon CloudFront Response Headers Policy for ${props.projectName}-${props.envName}`,
                    securityHeadersBehavior: {
                        contentTypeOptions: { override: true },
                        frameOptions: {
                            frameOption:
                                cloudfront.HeadersFrameOption.SAMEORIGIN,
                            override: true,
                        },
                        xssProtection: {
                            protection: true,
                            override: true,
                        },
                    },
                },
            );

        const cloudFrontCachePolicy = new cloudfront.CachePolicy(
            this,
            "cloudFrontCachePolicy",
            {
                cachePolicyName: `${props.projectName}-${props.envName}-cft-cache-policy`,
                comment: `Amazon CloudFront Cache Policy for ${props.projectName}-${props.envName}`,
                defaultTtl: cdk.Duration.seconds(86400),
                maxTtl: cdk.Duration.seconds(259200),
                minTtl: cdk.Duration.seconds(0),
                cookieBehavior: cloudfront.CacheCookieBehavior.all(),
                headerBehavior: cloudfront.CacheHeaderBehavior.none(),
                queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
                enableAcceptEncodingBrotli: true,
                enableAcceptEncodingGzip: true,
            },
        );

        const assetsOriginAccessControl = new cloudfront.S3OriginAccessControl(
            this,
            "assetsOriginAccessControl",
            {
                originAccessControlName: `${props.projectName}-${props.envName}-cft-oac-assets`,
                description: `Origin Access Control for ${props.projectName}-${props.envName} assets`,
                signing: cloudfront.Signing.SIGV4_ALWAYS,
            },
        );

        // ------------------------------------------------------------
        // Amazon CloudFront Distribution Configuration
        // ------------------------------------------------------------
        this.cloudFrontDistribution = new cloudfront.Distribution(
            this,
            "cloudFrontDistribution",
            {
                domainNames: [`${props.envName}.${props.nakedDomainName}`],
                comment: `CloudFront distribution for ${props.envName}.${props.nakedDomainName}`,
                certificate: this.acmCertificateCloudFront,
                enabled: true,
                enableIpv6: true,
                httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
                webAclId: wafProps.wafv2WebACL.webAclRef.webAclId,
                geoRestriction: cloudfront.GeoRestriction.allowlist("JP"),
                additionalBehaviors: {
                    "/public/*": {
                        origin: origins.S3BucketOrigin.withOriginAccessControl(
                            storageProps.assetsBucket,
                            {
                                originPath: "/assets",
                                originAccessControl: assetsOriginAccessControl,
                            },
                        ),
                        allowedMethods:
                            cloudfront.AllowedMethods.ALLOW_GET_HEAD,
                        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
                        cachePolicy: cloudFrontCachePolicy,
                        responseHeadersPolicy: cloudFrontResponseHeadersPolicy,
                        compress: true,
                        smoothStreaming: false,
                        viewerProtocolPolicy:
                            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    },
                    "/uploads/*": {
                        origin: origins.S3BucketOrigin.withOriginAccessControl(
                            storageProps.assetsBucket,
                            { originPath: "/pictures" },
                        ),
                        allowedMethods:
                            cloudfront.AllowedMethods.ALLOW_GET_HEAD,
                        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
                        cachePolicy: cloudFrontCachePolicy,
                        responseHeadersPolicy: cloudFrontResponseHeadersPolicy,
                        compress: true,
                        smoothStreaming: false,
                        viewerProtocolPolicy:
                            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    },
                },
                defaultBehavior: {
                    origin: new origins.HttpOrigin(
                        this.albExternal.loadBalancerDnsName,
                        {
                            httpPort: 80,
                            httpsPort: 443,
                            keepaliveTimeout: cdk.Duration.seconds(5),
                            protocolPolicy:
                                cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
                            readTimeout: cdk.Duration.seconds(60),
                            originSslProtocols: [
                                cloudfront.OriginSslPolicy.TLS_V1_2,
                            ],
                        },
                    ),
                    allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
                    cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
                    cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
                    originRequestPolicy:
                        cloudfront.OriginRequestPolicy.ALL_VIEWER,
                    responseHeadersPolicy: cloudFrontResponseHeadersPolicy,
                    compress: false,
                    viewerProtocolPolicy:
                        cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                },
            },
        );

        cdk.Tags.of(this.cloudFrontDistribution).add(
            "Name",
            `${props.projectName}-${props.envName}-cloudfront-distribution`,
        );
        cdk.Tags.of(this.cloudFrontDistribution).add("ProvisionedBy", "AWS");
    }
}
