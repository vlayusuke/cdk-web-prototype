import * as cdk from "aws-cdk-lib";
import {
    aws_certificatemanager as acm,
    aws_cloudfront as cloudfront,
    type aws_ec2 as ec2,
    aws_elasticloadbalancingv2 as elbv2,
    aws_iam as iam,
    aws_route53 as route53,
} from "aws-cdk-lib";
import type * as s3 from "aws-cdk-lib/aws-s3";
import type * as wafv2 from "aws-cdk-lib/aws-wafv2";
import { Construct } from "constructs";

export interface CommonProps {
    projectName: string;
    envName: string;
    nakedDomainName: string;
    dashboardName: string;
}

export interface EnvProps {
    envName: string;
    vpcCidr: string;
    defaultGatewayCidr: string;
}

export interface NetworkProps {
    vpc: ec2.IVpc;
    subnets: ec2.ISubnet[];
}

export interface SgProps {
    albSecurityGroup: ec2.ISecurityGroup;
}

export interface WafProps {
    wafv2WebACL: wafv2.IWebACLRef;
}

export interface DnsProps {
    hostedZoneId: string;
    cloudFrontCertificateArn: string;
}

export interface StorageProps {
    assetsBucket: s3.IBucket;
    uploadsBucket: s3.IBucket;
}

// ************************************************************
// [11] - DNS And CDN Stack
// ************************************************************
export class CfDNSAndCDNStack extends Construct {
    public readonly route53ARecord: route53.CfnRecordSet;
    public readonly route53AAAARecord: route53.CfnRecordSet;
    public readonly acmCertificateALB: acm.CfnCertificate;
    public readonly albExternal: elbv2.CfnLoadBalancer;
    public readonly albExternalListener: elbv2.CfnListener;
    public readonly albExternalTargetGroup: elbv2.CfnTargetGroup;
    public readonly albExternalListenerRule: elbv2.CfnListenerRule;
    public readonly cloudFrontDistribution: cloudfront.CfnDistribution;

    constructor(
        scope: Construct,
        id: string,
        dnsProps: DnsProps,
        networkProps: NetworkProps,
        sgProps: SgProps,
        storageProps: StorageProps,
        wafProps: WafProps,
        commonProps: CommonProps,
        envProps: EnvProps,
    ) {
        super(scope, id);

        const prefix = `${commonProps.projectName}-${envProps.envName}`;
        const domainName = `${envProps.envName}.${commonProps.nakedDomainName}`;

        // ------------------------------------------------------------
        // Applies the common Name / ProvisionedBy / ProjectCode tags to a construct.
        // ------------------------------------------------------------
        const addCommonTags = (target: Construct, name: string) => {
            cdk.Tags.of(target).add("Name", name);
            cdk.Tags.of(target).add("ProvisionedBy", "AWS");
            cdk.Tags.of(target).add("ProjectCode", "1234567890");
        };

        // ------------------------------------------------------------
        // AWS Certificate Manager for ALB Configuration
        // ------------------------------------------------------------
        const acmCertificateALBScope = new Construct(this, "acmCertificateALB");

        this.acmCertificateALB = new acm.CfnCertificate(
            acmCertificateALBScope,
            "Resource",
            {
                domainName,
                validationMethod: "DNS",
                domainValidationOptions: [
                    {
                        domainName,
                        hostedZoneId: dnsProps.hostedZoneId,
                    },
                ],
            },
        );

        addCommonTags(acmCertificateALBScope, `${prefix}-acm-certificate`);

        // ------------------------------------------------------------
        // Application Load Balancer Configuration
        // ------------------------------------------------------------
        const albExternalScope = new Construct(this, "albExternal");

        this.albExternal = new elbv2.CfnLoadBalancer(
            albExternalScope,
            "Resource",
            {
                type: "application",
                scheme: "internet-facing",
                subnets: networkProps.subnets.map((subnet) => subnet.subnetId),
                securityGroups: [sgProps.albSecurityGroup.securityGroupId],
                loadBalancerAttributes: [
                    {
                        key: "deletion_protection.enabled",
                        value: "false",
                    },
                    {
                        key: "load_balancing.cross_zone.enabled",
                        value: "true",
                    },
                    { key: "routing.http2.enabled", value: "true" },
                ],
            },
        );

        addCommonTags(albExternalScope, `${prefix}-alb-external`);

        // ------------------------------------------------------------
        // Application Load Balancer Listener Configuration
        // ------------------------------------------------------------
        const albExternalListenerScope = new Construct(
            albExternalScope,
            "albExternalListener",
        );

        this.albExternalListener = new elbv2.CfnListener(
            albExternalListenerScope,
            "Resource",
            {
                loadBalancerArn: this.albExternal.ref,
                port: 443,
                protocol: "HTTPS",
                sslPolicy: "ELBSecurityPolicy-TLS13-1-2-Res-2021-06",
                alpnPolicy: ["HTTP2Preferred"],
                certificates: [{ certificateArn: this.acmCertificateALB.ref }],
                defaultActions: [
                    {
                        type: "fixed-response",
                        fixedResponseConfig: {
                            statusCode: "404",
                            contentType: "text/html",
                            messageBody:
                                "<html><head><title>404 Not Found</title></head><body><h1>Not Found</h1><hr><address>Apache/2.2.31</address></body></html>",
                        },
                    },
                ],
            },
        );

        addCommonTags(
            albExternalListenerScope,
            `${prefix}-alb-external-listener`,
        );

        // ------------------------------------------------------------
        // Application Load Balancer Target Rule Configuration
        // ------------------------------------------------------------
        const albExternalTargetGroupScope = new Construct(
            this,
            "albExternalTargetGroup",
        );

        this.albExternalTargetGroup = new elbv2.CfnTargetGroup(
            albExternalTargetGroupScope,
            "Resource",
            {
                targetType: "ip",
                vpcId: networkProps.vpc.vpcId,
                port: 80,
                protocol: "HTTP",
                healthCheckPath: "/",
                healthCheckIntervalSeconds: 30,
                healthCheckTimeoutSeconds: 6,
                healthyThresholdCount: 3,
                unhealthyThresholdCount: 3,
                targetGroupAttributes: [
                    {
                        key: "deregistration_delay.timeout_seconds",
                        value: "115",
                    },
                    {
                        key: "load_balancing.cross_zone.enabled",
                        value: "true",
                    },
                    { key: "stickiness.enabled", value: "true" },
                    { key: "stickiness.type", value: "lb_cookie" },
                    {
                        key: "stickiness.lb_cookie.duration_seconds",
                        value: "86400",
                    },
                    {
                        key: "load_balancing.algorithm.type",
                        value: "round_robin",
                    },
                ],
            },
        );

        addCommonTags(
            albExternalTargetGroupScope,
            `${prefix}-alb-external-target-group`,
        );

        // ------------------------------------------------------------
        // Application Load Balancer Listener Rule Configuration
        // ------------------------------------------------------------
        const albExternalListenerRuleScope = new Construct(
            this,
            "albExternalListenerRule",
        );

        this.albExternalListenerRule = new elbv2.CfnListenerRule(
            albExternalListenerRuleScope,
            "Resource",
            {
                listenerArn: this.albExternalListener.ref,
                priority: 1,
                conditions: [
                    {
                        field: "host-header",
                        hostHeaderConfig: { values: [domainName] },
                    },
                ],
                actions: [
                    {
                        type: "forward",
                        targetGroupArn: this.albExternalTargetGroup.ref,
                    },
                ],
            },
        );

        addCommonTags(
            albExternalListenerRuleScope,
            `${prefix}-alb-external-listener-rule`,
        );

        const albExternalListenerRuleRedirectScope = new Construct(
            this,
            "albExternalListenerRuleRedirect",
        );

        new elbv2.CfnListenerRule(
            albExternalListenerRuleRedirectScope,
            "Resource",
            {
                listenerArn: this.albExternalListener.ref,
                priority: 2,
                conditions: [
                    {
                        field: "host-header",
                        hostHeaderConfig: { values: [`www.${domainName}`] },
                    },
                ],
                actions: [
                    {
                        type: "redirect",
                        redirectConfig: {
                            protocol: "HTTPS",
                            port: "443",
                            host: domainName,
                            query: "",
                            statusCode: "HTTP_301",
                        },
                    },
                ],
            },
        );

        addCommonTags(
            albExternalListenerRuleRedirectScope,
            `${prefix}-alb-external-listener-rule-redirect`,
        );

        // ------------------------------------------------------------
        // Amazon CloudFront Response Headers Policy Configuration
        // ------------------------------------------------------------
        const cloudFrontResponseHeadersPolicy =
            new cloudfront.CfnResponseHeadersPolicy(
                new Construct(this, "cloudFrontResponseHeadersPolicy"),
                "Resource",
                {
                    responseHeadersPolicyConfig: {
                        name: `${prefix}-cft-response-header-policy`,
                        comment: `Amazon CloudFront Response Headers Policy for ${prefix}`,
                        securityHeadersConfig: {
                            contentTypeOptions: { override: true },
                            frameOptions: {
                                frameOption: "SAMEORIGIN",
                                override: true,
                            },
                            xssProtection: {
                                protection: true,
                                override: true,
                            },
                        },
                    },
                },
            );

        // ------------------------------------------------------------
        // Amazon CloudFront Cache Policy Configuration
        // ------------------------------------------------------------
        const cloudFrontCachePolicy = new cloudfront.CfnCachePolicy(
            new Construct(this, "cloudFrontCachePolicy"),
            "Resource",
            {
                cachePolicyConfig: {
                    name: `${prefix}-cft-cache-policy`,
                    comment: `Amazon CloudFront Cache Policy for ${prefix}`,
                    defaultTtl: 86400,
                    maxTtl: 259200,
                    minTtl: 0,
                    parametersInCacheKeyAndForwardedToOrigin: {
                        cookiesConfig: { cookieBehavior: "all" },
                        headersConfig: { headerBehavior: "none" },
                        queryStringsConfig: { queryStringBehavior: "all" },
                        enableAcceptEncodingBrotli: true,
                        enableAcceptEncodingGzip: true,
                    },
                },
            },
        );

        // ------------------------------------------------------------
        // Origin Access Control Configuration
        // ------------------------------------------------------------
        const assetsOriginAccessControl = new cloudfront.CfnOriginAccessControl(
            new Construct(this, "assetsOriginAccessControl"),
            "Resource",
            {
                originAccessControlConfig: {
                    name: `${prefix}-cft-oac-assets`,
                    description: `Origin Access Control for ${prefix} assets`,
                    originAccessControlOriginType: "s3",
                    signingBehavior: "always",
                    signingProtocol: "sigv4",
                },
            },
        );

        // ------------------------------------------------------------
        // Amazon CloudFront Distribution Configuration
        // ------------------------------------------------------------
        const originAlb = "alb-external";
        const originAssets = "s3-assets";
        const originUploads = "s3-uploads";
        const assetsDomainName = `${storageProps.assetsBucket.bucketName}.s3.${cdk.Aws.REGION}.${cdk.Aws.URL_SUFFIX}`;

        const s3BehaviorBase = {
            allowedMethods: ["GET", "HEAD"],
            cachedMethods: ["GET", "HEAD"],
            cachePolicyId: cloudFrontCachePolicy.ref,
            responseHeadersPolicyId: cloudFrontResponseHeadersPolicy.ref,
            compress: true,
            smoothStreaming: false,
            viewerProtocolPolicy: "redirect-to-https",
        };

        const cloudFrontDistributionScope = new Construct(
            this,
            "cloudFrontDistribution",
        );

        this.cloudFrontDistribution = new cloudfront.CfnDistribution(
            cloudFrontDistributionScope,
            "Resource",
            {
                distributionConfig: {
                    enabled: true,
                    aliases: [domainName],
                    comment: `CloudFront distribution for ${domainName}`,
                    ipv6Enabled: true,
                    httpVersion: "http2and3",
                    webAclId: wafProps.wafv2WebACL.webAclRef.webAclId,
                    restrictions: {
                        geoRestriction: {
                            restrictionType: "whitelist",
                            locations: ["JP"],
                        },
                    },
                    viewerCertificate: {
                        acmCertificateArn: dnsProps.cloudFrontCertificateArn,
                        minimumProtocolVersion: "TLSv1.2_2021",
                        sslSupportMethod: "sni-only",
                    },
                    origins: [
                        {
                            id: originAlb,
                            domainName: this.albExternal.attrDnsName,
                            customOriginConfig: {
                                httpPort: 80,
                                httpsPort: 443,
                                originKeepaliveTimeout: 5,
                                originProtocolPolicy: "https-only",
                                originReadTimeout: 60,
                                originSslProtocols: ["TLSv1.2"],
                            },
                        },
                        {
                            id: originAssets,
                            domainName: assetsDomainName,
                            originPath: "/assets",
                            originAccessControlId:
                                assetsOriginAccessControl.attrId,
                            s3OriginConfig: { originAccessIdentity: "" },
                        },
                        {
                            id: originUploads,
                            domainName: assetsDomainName,
                            originPath: "/pictures",
                            originAccessControlId:
                                assetsOriginAccessControl.attrId,
                            s3OriginConfig: { originAccessIdentity: "" },
                        },
                    ],
                    cacheBehaviors: [
                        {
                            ...s3BehaviorBase,
                            pathPattern: "/public/*",
                            targetOriginId: originAssets,
                        },
                        {
                            ...s3BehaviorBase,
                            pathPattern: "/uploads/*",
                            targetOriginId: originUploads,
                        },
                    ],
                    defaultCacheBehavior: {
                        targetOriginId: originAlb,
                        allowedMethods: [
                            "GET",
                            "HEAD",
                            "OPTIONS",
                            "PUT",
                            "PATCH",
                            "POST",
                            "DELETE",
                        ],
                        cachedMethods: ["GET", "HEAD"],
                        cachePolicyId:
                            cloudfront.CachePolicy.CACHING_DISABLED
                                .cachePolicyId,
                        originRequestPolicyId:
                            cloudfront.OriginRequestPolicy.ALL_VIEWER
                                .originRequestPolicyId,
                        responseHeadersPolicyId:
                            cloudFrontResponseHeadersPolicy.ref,
                        compress: false,
                        viewerProtocolPolicy: "redirect-to-https",
                    },
                },
            },
        );

        addCommonTags(
            cloudFrontDistributionScope,
            `${prefix}-cloudfront-distribution`,
        );

        // ------------------------------------------------------------
        // Amazon Route 53 A / AAAA Record Configuration (alias to CloudFront)
        // ------------------------------------------------------------
        const createAliasRecord = (
            logicalId: string,
            type: "A" | "AAAA",
        ): route53.CfnRecordSet =>
            new route53.CfnRecordSet(
                new Construct(this, logicalId),
                "Resource",
                {
                    hostedZoneId: dnsProps.hostedZoneId,
                    name: `${domainName}.`,
                    type,
                    aliasTarget: {
                        dnsName: this.cloudFrontDistribution.attrDomainName,
                        // Fixed hosted zone ID shared by all CloudFront distributions.
                        hostedZoneId: "Z2FDTNDATAQYW2",
                    },
                },
            );

        this.route53ARecord = createAliasRecord("route53ARecord", "A");
        this.route53AAAARecord = createAliasRecord("route53AAAARecord", "AAAA");

        // ------------------------------------------------------------
        // Allow the distribution (OAC) to read the assets bucket
        // ------------------------------------------------------------
        storageProps.assetsBucket.addToResourcePolicy(
            new iam.PolicyStatement({
                actions: ["s3:GetObject"],
                principals: [
                    new iam.ServicePrincipal("cloudfront.amazonaws.com"),
                ],
                resources: [storageProps.assetsBucket.arnForObjects("*")],
                conditions: {
                    StringEquals: {
                        "AWS:SourceArn": `arn:${cdk.Aws.PARTITION}:cloudfront::${cdk.Aws.ACCOUNT_ID}:distribution/${this.cloudFrontDistribution.ref}`,
                    },
                },
            }),
        );

        // Account-scoped grant avoids a distribution-ID dependency cycle.
        storageProps.assetsBucket.encryptionKey?.addToResourcePolicy(
            new iam.PolicyStatement({
                actions: ["kms:Decrypt"],
                principals: [
                    new iam.ServicePrincipal("cloudfront.amazonaws.com"),
                ],
                resources: ["*"],
                conditions: {
                    ArnLike: {
                        "AWS:SourceArn": `arn:${cdk.Aws.PARTITION}:cloudfront::${cdk.Aws.ACCOUNT_ID}:distribution/*`,
                    },
                },
            }),
        );
    }
}
