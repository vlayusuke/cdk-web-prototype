import * as cdk from "aws-cdk-lib";
import {
    aws_elasticache as elasticache,
    aws_iam as iam,
    aws_rds as rds,
} from "aws-cdk-lib";
import type * as ec2 from "aws-cdk-lib/aws-ec2";
import type * as kms from "aws-cdk-lib/aws-kms";
import { Construct } from "constructs";

export interface CommonProps {
    projectName: string;
    dashboardName: string;
}

export interface EnvProps {
    envName: string;
    vpcCidr: string;
    defaultGatewayCidr: string;
}

export interface KmsProps {
    auroraKey: kms.IKey;
    elasticacheKey: kms.IKey;
}

export interface NetworkingProps {
    subnetIds: string[];
    availabilityZones: [string, string];
}

export interface SgProps {
    auroraSecurityGroup: ec2.ISecurityGroup;
    elasticacheSecurityGroup: ec2.ISecurityGroup;
}

// ************************************************************
// [04] - Database Configuration Stack
// ************************************************************
export class CfDatabaseStack extends Construct {
    public readonly auroraCluster: rds.CfnDBCluster;
    public readonly auroraWriterInstance: rds.CfnDBInstance;
    public readonly auroraReaderInstance: rds.CfnDBInstance;
    public readonly elastiCacheReplicationGroup: elasticache.CfnReplicationGroup;

    constructor(
        scope: Construct,
        id: string,
        sgProps: SgProps,
        networkingProps: NetworkingProps,
        kmsProps: KmsProps,
        commonProps: CommonProps,
        envProps: EnvProps,
    ) {
        super(scope, id);

        // ------------------------------------------------------------
        // AWS IAM for Amazon Aurora Configuration
        // ------------------------------------------------------------
        const iamAuroraRole = new iam.Role(this, "iamAuroraRole", {
            roleName: `${commonProps.projectName}-${envProps.envName}-iam-aurora-role`,
            description: "IAM role for Amazon Aurora to access AWS resources",
            assumedBy: new iam.ServicePrincipal("rds.amazonaws.com"),
        });

        cdk.Tags.of(iamAuroraRole).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-iam-aurora-role`,
        );
        cdk.Tags.of(iamAuroraRole).add("ProvisionedBy", "AWS");
        cdk.Tags.of(iamAuroraRole).add("ProjectCode", "1234567890");

        const iamAuroraPolicyScope = new Construct(this, "iamAuroraPolicy");

        new iam.CfnManagedPolicy(iamAuroraPolicyScope, "Resource", {
            managedPolicyName: `${commonProps.projectName}-${envProps.envName}-iam-aurora-policy`,
            roles: [iamAuroraRole.roleName],
            policyDocument: {
                Version: "2012-10-17",
                Statement: [
                    {
                        Sid: "AuroraRDSAccess",
                        Effect: "Allow",
                        Action: ["rds-db:connect", "rds-data:ExecuteStatement"],
                        Resource: [
                            `arn:aws:rds-db:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:dbuser:*/*`,
                        ],
                    },
                ],
            },
        });

        cdk.Tags.of(iamAuroraPolicyScope).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-iam-aurora-policy`,
        );
        cdk.Tags.of(iamAuroraPolicyScope).add("ProvisionedBy", "AWS");
        cdk.Tags.of(iamAuroraPolicyScope).add("ProjectCode", "1234567890");

        // ------------------------------------------------------------
        // AWS IAM for Amazon Aurora Performance Insights Configuration
        // ------------------------------------------------------------
        const iamAuroraPeformanceInsightRole = new iam.Role(
            this,
            "iamAuroraPeformanceInsightRole",
            {
                roleName: `${commonProps.projectName}-${envProps.envName}-iam-aurora-performance-insight-role`,
                description: "IAM role for Amazon Aurora Performance Insights",
                assumedBy: new iam.ServicePrincipal("rds.amazonaws.com"),
            },
        );

        cdk.Tags.of(iamAuroraPeformanceInsightRole).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-iam-aurora-performance-insight-role`,
        );
        cdk.Tags.of(iamAuroraPeformanceInsightRole).add("ProvisionedBy", "AWS");
        cdk.Tags.of(iamAuroraPeformanceInsightRole).add(
            "ProjectCode",
            "1234567890",
        );

        const iamAuroraPeformanceInsightPolicyScope = new Construct(
            this,
            "iamAuroraPeformanceInsightPolicy",
        );

        new iam.CfnManagedPolicy(
            iamAuroraPeformanceInsightPolicyScope,
            "Resource",
            {
                managedPolicyName: `${commonProps.projectName}-${envProps.envName}-iam-aurora-performance-insight-policy`,
                roles: [iamAuroraPeformanceInsightRole.roleName],
                policyDocument: {
                    Version: "2012-10-17",
                    Statement: [
                        {
                            Sid: "AuroraPerformanceInsightAccess",
                            Effect: "Allow",
                            Action: [
                                "rds:DescribeDBClusters",
                                "rds:DescribeDBInstances",
                                "rds:DescribeDBPerformanceInsights",
                                "rds:GetDBPerformanceInsights",
                            ],
                            Resource: [
                                `arn:aws:rds:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:db:*`,
                            ],
                        },
                    ],
                },
            },
        );

        cdk.Tags.of(iamAuroraPeformanceInsightPolicyScope).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-iam-aurora-performance-insight-policy`,
        );
        cdk.Tags.of(iamAuroraPeformanceInsightPolicyScope).add(
            "ProvisionedBy",
            "AWS",
        );
        cdk.Tags.of(iamAuroraPeformanceInsightPolicyScope).add(
            "ProjectCode",
            "1234567890",
        );

        // ------------------------------------------------------------
        // AWS IAM for Amazon ElastiCache Configuration
        // ------------------------------------------------------------
        const elasticacheIamRole = new iam.Role(this, "elasticacheIamRole", {
            roleName: `${commonProps.projectName}-${envProps.envName}-iam-elasticache-role`,
            description: "IAM role for Amazon ElastiCache",
            assumedBy: new iam.ServicePrincipal("elasticache.amazonaws.com"),
        });

        cdk.Tags.of(elasticacheIamRole).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-iam-elasticache-role`,
        );
        cdk.Tags.of(elasticacheIamRole).add("ProvisionedBy", "AWS");
        cdk.Tags.of(elasticacheIamRole).add("ProjectCode", "1234567890");

        const elasticacheIamPolicyScope = new Construct(
            this,
            "elasticacheIamPolicy",
        );

        new iam.CfnManagedPolicy(elasticacheIamPolicyScope, "Resource", {
            managedPolicyName: `${commonProps.projectName}-${envProps.envName}-iam-elasticache-policy`,
            roles: [elasticacheIamRole.roleName],
            policyDocument: {
                Version: "2012-10-17",
                Statement: [
                    {
                        Sid: "ElasticacheAccess",
                        Effect: "Allow",
                        Action: [
                            "elasticache:DescribeCacheClusters",
                            "elasticache:DescribeCacheSubnetGroups",
                            "elasticache:DescribeReplicationGroups",
                            "elasticache:DescribeUsers",
                        ],
                        Resource: [
                            `arn:aws:elasticache:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:cluster:*`,
                            `arn:aws:elasticache:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:subnet-group:*`,
                            `arn:aws:elasticache:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:replicationgroup:*`,
                            `arn:aws:elasticache:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:user:*`,
                        ],
                    },
                ],
            },
        });

        cdk.Tags.of(elasticacheIamPolicyScope).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-iam-elasticache-policy`,
        );
        cdk.Tags.of(elasticacheIamPolicyScope).add("ProvisionedBy", "AWS");
        cdk.Tags.of(elasticacheIamPolicyScope).add("ProjectCode", "1234567890");

        // ------------------------------------------------------------
        // Amazon Aurora Subnet Group Configuration
        // ------------------------------------------------------------
        const auroraSubnetGroup = new rds.CfnDBSubnetGroup(
            this,
            "auroraSubnetGroup",
            {
                dbSubnetGroupDescription: "Subnet group for Amazon Aurora",
                subnetIds: networkingProps.subnetIds,
            },
        );

        cdk.Tags.of(auroraSubnetGroup).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-aurora-subnet-group`,
        );
        cdk.Tags.of(auroraSubnetGroup).add("ProvisionedBy", "AWS");
        cdk.Tags.of(auroraSubnetGroup).add("ProjectCode", "1234567890");

        // ------------------------------------------------------------
        // Amazon Aurora DB Parameter Group Configuration
        // ------------------------------------------------------------
        const auroraDbParameterGroup = new rds.CfnDBParameterGroup(
            this,
            "auroraDbParameterGroup",
            {
                description: "DB parameter group for Amazon Aurora",
                family: "aurora-postgresql15",
                parameters: {
                    client_encoding: "UTF8",
                },
            },
        );

        cdk.Tags.of(auroraDbParameterGroup).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-aurora-db-parameter-group`,
        );
        cdk.Tags.of(auroraDbParameterGroup).add("ProvisionedBy", "AWS");
        cdk.Tags.of(auroraDbParameterGroup).add("ProjectCode", "1234567890");

        // ------------------------------------------------------------
        // Amazon Aurora Cluster Configuration
        // ------------------------------------------------------------
        const auroraCluster = new rds.CfnDBCluster(this, "auroraCluster", {
            dbClusterIdentifier: `${commonProps.projectName}-${envProps.envName}-aurora-cluster`,
            associatedRoles: [
                { roleArn: iamAuroraRole.roleArn },
                { roleArn: iamAuroraPeformanceInsightRole.roleArn },
            ],
            availabilityZones: networkingProps.availabilityZones,
            dbSubnetGroupName: auroraSubnetGroup.ref,
            backupRetentionPeriod: 7,
            backtrackWindow: 86400,
            databaseName: `${commonProps.projectName}-${envProps.envName}-aurora-db`,
            databaseInsightsMode: "standard",
            deletionProtection: false,
            enableCloudwatchLogsExports: [
                `instance`,
                `postgresql`,
                `iam-db-auth-error`,
            ],
            enableIamDatabaseAuthentication: true,
            engine: "aurora-postgresql",
            engineMode: "provisioned",
            engineVersion: "15.10",
            kmsKeyId: kmsProps.auroraKey.keyId,
            manageMasterUserPassword: true,
            masterUsername: iamAuroraRole.roleName,
            port: 5432,
            preferredBackupWindow: "20:00-21:00",
            preferredMaintenanceWindow: "sat:21:30-sat:22:30",
            storageEncrypted: true,
            vpcSecurityGroupIds: [sgProps.auroraSecurityGroup],
        });

        auroraCluster.applyRemovalPolicy(cdk.RemovalPolicy.SNAPSHOT);

        cdk.Tags.of(auroraCluster).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-aurora-cluster`,
        );
        cdk.Tags.of(auroraCluster).add("AutoStop", "true");
        cdk.Tags.of(auroraCluster).add("ProvisionedBy", "AWS");
        cdk.Tags.of(auroraCluster).add("ProjectCode", "1234567890");

        // ------------------------------------------------------------
        // Amazon Aurora Instance Configuration
        // ------------------------------------------------------------

        //**  Writer Instance Configuration
        const auroraWriterInstance = new rds.CfnDBInstance(
            this,
            "auroraWriterInstance",
            {
                dbInstanceIdentifier: `${commonProps.projectName}-${envProps.envName}-aurora-writer-instance`,
                dbInstanceClass: "db.t4g.medium",
                engine: "aurora-postgresql",
                dbClusterIdentifier: auroraCluster.ref,
                dbParameterGroupName: auroraDbParameterGroup.ref,
                dbSubnetGroupName: auroraSubnetGroup.ref,
                deletionProtection: false,
                publiclyAccessible: false,
                enablePerformanceInsights: true,
                performanceInsightsRetentionPeriod: 7,
                kmsKeyId: kmsProps.auroraKey.keyId,
                caCertificateIdentifier: "rds-ca-rsa2048-g1",
                promotionTier: 0,
                applyImmediately: true,
            },
        );

        //** Reader Instance Configuration
        const auroraReaderInstance = new rds.CfnDBInstance(
            this,
            "auroraReaderInstance",
            {
                dbInstanceIdentifier: `${commonProps.projectName}-${envProps.envName}-aurora-reader-instance`,
                dbInstanceClass: "db.t4g.medium",
                engine: "aurora-postgresql",
                dbClusterIdentifier: auroraCluster.ref,
                dbParameterGroupName: auroraDbParameterGroup.ref,
                dbSubnetGroupName: auroraSubnetGroup.ref,
                publiclyAccessible: false,
                deletionProtection: false,
                enablePerformanceInsights: true,
                performanceInsightsRetentionPeriod: 7,
                kmsKeyId: kmsProps.auroraKey.keyId,
                caCertificateIdentifier: "rds-ca-rsa2048-g1",
                promotionTier: 1,
                applyImmediately: true,
            },
        );

        auroraReaderInstance.addResourceDependency(auroraWriterInstance);

        this.auroraCluster = auroraCluster;
        this.auroraWriterInstance = auroraWriterInstance;
        this.auroraReaderInstance = auroraReaderInstance;

        for (const instance of [auroraWriterInstance, auroraReaderInstance]) {
            instance.applyRemovalPolicy(cdk.RemovalPolicy.SNAPSHOT);
            cdk.Tags.of(instance).add("AutoStop", "true");
            cdk.Tags.of(instance).add("ProvisionedBy", "AWS");
            cdk.Tags.of(instance).add("ProjectCode", "1234567890");
        }

        cdk.Tags.of(auroraReaderInstance).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-aurora-reader-instance`,
        );
        cdk.Tags.of(auroraWriterInstance).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-aurora-writer-instance`,
        );

        // ------------------------------------------------------------
        // Amazon ElastiCache Subnet Group Configuration
        // ------------------------------------------------------------
        const elasticacheSubnetGroup = new elasticache.CfnSubnetGroup(
            this,
            "elasticacheSubnetGroup",
            {
                description: "Subnet group for Amazon ElastiCache",
                subnetIds: [networkingProps.subnetIds[1]],
                cacheSubnetGroupName: "elasticache-subnet-group",
            },
        );

        cdk.Tags.of(elasticacheSubnetGroup).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-elasticache-subnet-group`,
        );
        cdk.Tags.of(elasticacheSubnetGroup).add("ProvisionedBy", "AWS");
        cdk.Tags.of(elasticacheSubnetGroup).add("ProjectCode", "1234567890");

        // ------------------------------------------------------------
        // Amazon ElastiCache Parameter Group Configuration
        // ------------------------------------------------------------
        const elasticacheParameterGroup = new elasticache.CfnParameterGroup(
            this,
            "elasticacheParameterGroup",
            {
                cacheParameterGroupFamily: "redis7",
                description: "Parameter group for Amazon ElastiCache",
                properties: {
                    "maxmemory-policy": "allkeys-lru",
                },
            },
        );

        cdk.Tags.of(elasticacheParameterGroup).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-elasticache-parameter-group`,
        );
        cdk.Tags.of(elasticacheParameterGroup).add("ProvisionedBy", "AWS");
        cdk.Tags.of(elasticacheParameterGroup).add("ProjectCode", "1234567890");

        // ------------------------------------------------------------
        // Amazon ElastiCache Replication Group Configuration
        // ------------------------------------------------------------
        const elasticacheReplicationGroup = new elasticache.CfnReplicationGroup(
            this,
            "elasticacheReplicationGroup",
            {
                replicationGroupDescription:
                    "Replication group for Amazon ElastiCache",
                nodeGroupConfiguration: [
                    {
                        nodeGroupId: "0001",
                        primaryAvailabilityZone: cdk.Fn.select(
                            0,
                            cdk.Fn.getAzs(),
                        ),
                        replicaAvailabilityZones: [
                            cdk.Fn.select(1, cdk.Fn.getAzs()),
                        ],
                        replicaCount: 1,
                        slots: "0-8191",
                    },
                ],
                multiAzEnabled: true,
                networkType: "ipv4",
                engine: "redis",
                engineVersion: "7.0",
                cacheNodeType: "cache.t4g.micro",
                numCacheClusters: 1,
                numNodeGroups: 2,
                port: 6379,
                automaticFailoverEnabled: true,
                snapshotRetentionLimit: 7,
                snapshotWindow: "20:00-21:00",
                securityGroupIds: [
                    sgProps.elasticacheSecurityGroup.securityGroupId,
                ],
                kmsKeyId: kmsProps.elasticacheKey.keyId,
                cacheSubnetGroupName: elasticacheSubnetGroup.ref,
                cacheParameterGroupName: elasticacheParameterGroup.ref,
                preferredMaintenanceWindow: "sat:21:30-sat:22:30",
                atRestEncryptionEnabled: true,
                transitEncryptionEnabled: true,
            },
        );

        this.elastiCacheReplicationGroup = elasticacheReplicationGroup;

        cdk.Tags.of(elasticacheReplicationGroup).add(
            "Name",
            `${commonProps.projectName}-${envProps.envName}-elasticache-replication-group`,
        );
        cdk.Tags.of(elasticacheReplicationGroup).add("ProvisionedBy", "AWS");
        cdk.Tags.of(elasticacheReplicationGroup).add(
            "ProjectCode",
            "1234567890",
        );
    }
}
