import * as cdk from "aws-cdk-lib";
import {
    aws_certificatemanager as acm,
    aws_ec2 as ec2,
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

export interface networkProps {
    vpc: ec2.IVpc;
    subnets: ec2.ISubnet[];
}

export interface sgProps {
    albSecurityGroup: ec2.ISecurityGroup;
}

// ------------------------------------------------------------
// [10][11] - DNS Stack
// ------------------------------------------------------------
export class cfDNSStack extends Construct {
    public readonly route53PublicHostedZone: route53.PublicHostedZone;
    public readonly route53ARecord: route53.ARecord;
    public readonly route53AAAARecord: route53.AaaaRecord;
    public readonly acmCertificate: acm.Certificate;
    public readonly albExternal: elbv2.ApplicationLoadBalancer;
    public readonly albExternalListener: elbv2.ApplicationListener;
    public readonly albExternalTargetGroup: elbv2.ApplicationTargetGroup;

    constructor(
        scope: Construct,
        id: string,
        props: commonProps,
        pocProps: pocProps,
        sgProps: sgProps,
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
        // Application Load Balancer Listener Configuration
        // ------------------------------------------------------------
        this.albExternalListener = this.albExternal.addListener(
            "albExternalListener",
            {
                port: 443,
                protocol: elbv2.ApplicationProtocol.HTTPS,
                sslPolicy: elbv2.SslPolicy.TLS13_RES,
                certificates: [this.acmCertificate],
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
    }
}
