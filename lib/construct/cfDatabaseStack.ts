import * as cdk from 'aws-cdk-lib';
import { aws_iam as iam, aws_rds as rds } from 'aws-cdk-lib';
import type * as ec2 from 'aws-cdk-lib/aws-ec2';
import type * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';

export interface commonProps {
    projectName: string;
    envName: string;
}

export interface pocProps {
  vpcCidr: string;
  defaultGatewayCidr: string;
}

export interface kmsProps {
    auroraKey: kms.IKey;
}

export interface networkingProps {
    subnetIds: string[];
}

export interface sgProps {
    auroraSecurityGroup: ec2.SecurityGroup;
}


// ------------------------------------------------------------
// [04] - Database Configuration Stack
// ------------------------------------------------------------
export class cfDatabaseStack extends Construct {

    constructor(scope: Construct, id: string, props: commonProps, sgProps: sgProps, networkingProps: networkingProps, kmsProps: kmsProps) {
        super(scope, id);

        // ------------------------------------------------------------
        // AWS IAM for Amazon Aurora Configuration
        // ------------------------------------------------------------
        const auroraIamRole = new iam.Role(this, 'AuroraIamRole', {
            roleName: 'AuroraIamRole',
            description: 'IAM role for Amazon Aurora to access AWS resources',
            assumedBy: new iam.ServicePrincipal('rds.amazonaws.com'),
        });

        cdk.Tags.of(auroraIamRole).add('Name', `${props.projectName}-${props.envName}-iam-aurora-role`);
        cdk.Tags.of(auroraIamRole).add('ProvisionedBy', 'AWS');

        const auroraIamPolicy = new iam.Policy(this, 'AuroraIamPolicy', {
            statements: [
                new iam.PolicyStatement({
                    sid: 'AuroraRDSAccess',
                    actions: [
                        'rds-db:connect',
                        'rds-data:ExecuteStatement',
                    ],
                    resources: [
                        `arn:aws:rds-db:${cdk.Stack.of(this).account}:${cdk.Stack.of(this).region}:dbuser:*/*`,
                    ],
                }),
            ],
        });

        cdk.Tags.of(auroraIamPolicy).add('Name', `${props.projectName}-${props.envName}-iam-aurora-policy`);
        cdk.Tags.of(auroraIamPolicy).add('ProvisionedBy', 'AWS');

        const auroraIamPeformanceInsightRole = new iam.Role(this, 'AuroraIamPeformanceInsightRole', {
            roleName: 'AuroraIamPeformanceInsightRole',
            description: 'IAM role for Amazon Aurora Performance Insights',
            assumedBy: new iam.ServicePrincipal('rds.amazonaws.com'),
        });

        cdk.Tags.of(auroraIamPeformanceInsightRole).add('Name', `${props.projectName}-${props.envName}-iam-aurora-performance-insight-role`);
        cdk.Tags.of(auroraIamPeformanceInsightRole).add('ProvisionedBy', 'AWS');

        const auroraIamPeformanceInsightPolicy = new iam.Policy(this, 'AuroraIamPeformanceInsightPolicy', {
            statements: [
                new iam.PolicyStatement({
                    sid: 'AuroraPerformanceInsightAccess',
                    actions: ['rds:DescribeDBInstances', 'rds:DescribeDBClusters'],
                    resources: [`arn:aws:rds:${cdk.Stack.of(this).account}:${cdk.Stack.of(this).region}:db:*`],
                }),
            ],
        });

        cdk.Tags.of(auroraIamPeformanceInsightPolicy).add('Name', `${props.projectName}-${props.envName}-iam-aurora-performance-insight-policy`);
        cdk.Tags.of(auroraIamPeformanceInsightPolicy).add('ProvisionedBy', 'AWS');

        auroraIamRole.attachInlinePolicy(auroraIamPolicy);
        auroraIamPeformanceInsightRole.attachInlinePolicy(auroraIamPeformanceInsightPolicy);


        // ------------------------------------------------------------
        // Subnet Group Configuration
        // ------------------------------------------------------------
        const auroraSubnetGroup = new rds.CfnDBSubnetGroup(this, 'AuroraSubnetGroup', {
            dbSubnetGroupDescription: 'Subnet group for Amazon Aurora',
            subnetIds: [networkingProps.subnetIds[2]],
        });

        cdk.Tags.of(auroraSubnetGroup).add('Name', `${props.projectName}-${props.envName}-aurora-subnet-group`);
        cdk.Tags.of(auroraSubnetGroup).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // DB Parameter Group Configuration
        // ------------------------------------------------------------
        const auroraDbParameterGroup = new rds.CfnDBParameterGroup(this, 'AuroraDbParameterGroup', {
            description: 'DB parameter group for Amazon Aurora',
            family: 'aurora-postgresql15',
            parameters: {
                'client_encoding': 'UTF8',
            },
        });

        cdk.Tags.of(auroraDbParameterGroup).add('Name', `${props.projectName}-${props.envName}-aurora-db-parameter-group`);
        cdk.Tags.of(auroraDbParameterGroup).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // Amazon Aurora Cluster Configuration
        // ------------------------------------------------------------
        const auroraCluster = new rds.CfnDBCluster(this, 'AuroraCluster', {
            dbClusterIdentifier: `${props.projectName}-${props.envName}-aurora-cluster`,
            associatedRoles: [
                { roleArn: auroraIamRole.roleArn },
                { roleArn: auroraIamPeformanceInsightRole.roleArn },
            ],
            availabilityZones: ['ap-northeast-1a', 'ap-northeast-1c'],
            dbSubnetGroupName: auroraSubnetGroup.ref,
            backupRetentionPeriod: 14,
            backtrackWindow: 86400,
            databaseName: 'cdk-web-prototype-database',
            databaseInsightsMode: 'standard',
            deletionProtection: true,
            enableCloudwatchLogsExports: [`instance`, `postgresql`, `iam-db-auth-error`],
            enableIamDatabaseAuthentication: true,
            engine: 'aurora-postgresql',
            engineMode: 'provisioned',
            engineVersion: '15.10',
            kmsKeyId: kmsProps.auroraKey.keyId,
            manageMasterUserPassword: true,
            masterUsername: auroraIamRole.roleName,
            port: 5432,
            preferredBackupWindow: '20:00-21:00',
            preferredMaintenanceWindow: 'sat:21:30-sat:22:30',
            storageEncrypted: true,
            vpcSecurityGroupIds: [sgProps.auroraSecurityGroup],
        });

        auroraCluster.applyRemovalPolicy(cdk.RemovalPolicy.SNAPSHOT);
        cdk.Tags.of(auroraCluster).add('Name', `${props.projectName}-${props.envName}-aurora-cluster`);
        cdk.Tags.of(auroraCluster).add('AutoStop', 'true');
        cdk.Tags.of(auroraCluster).add('ProvisionedBy', 'AWS');


        // ------------------------------------------------------------
        // Amazon Aurora Instance Configuration
        // ------------------------------------------------------------

        // Writer Instance Configuration
        const auroraWriterInstance = new rds.CfnDBInstance(this, 'AuroraWriterInstance', {
            dbInstanceIdentifier: `${props.projectName}-${props.envName}-aurora-writer-instance`,
            dbInstanceClass: 'db.t4g.medium',
            engine: 'aurora-postgresql',
            dbClusterIdentifier: auroraCluster.ref,
            dbParameterGroupName: auroraDbParameterGroup.ref,
            dbSubnetGroupName: auroraSubnetGroup.ref,
            publiclyAccessible: false,
            enablePerformanceInsights: true,
            performanceInsightsRetentionPeriod: 7,
            kmsKeyId: kmsProps.auroraKey.keyId,
            caCertificateIdentifier: 'rds-ca-rsa2048-g1',
            promotionTier: 0,
        });

        // Reader Instance Configuration
        const auroraReaderInstance = new rds.CfnDBInstance(this, 'AuroraReaderInstance', {
            dbInstanceIdentifier: `${props.projectName}-${props.envName}-aurora-reader-instance`,
            dbInstanceClass: 'db.t4g.medium',
            engine: 'aurora-postgresql',
            dbClusterIdentifier: auroraCluster.ref,
            dbParameterGroupName: auroraDbParameterGroup.ref,
            dbSubnetGroupName: auroraSubnetGroup.ref,
            publiclyAccessible: false,
            enablePerformanceInsights: true,
            performanceInsightsRetentionPeriod: 7,
            kmsKeyId: kmsProps.auroraKey.keyId,
            caCertificateIdentifier: 'rds-ca-rsa2048-g1',
            promotionTier: 1,
        });

        auroraReaderInstance.addResourceDependency(auroraWriterInstance);

        for (const instance of [auroraWriterInstance, auroraReaderInstance]) {
            instance.applyRemovalPolicy(cdk.RemovalPolicy.SNAPSHOT);
            cdk.Tags.of(instance).add('AutoStop', 'true');
            cdk.Tags.of(instance).add('ProvisionedBy', 'AWS');
        }

        cdk.Tags.of(auroraReaderInstance).add('Name', `${props.projectName}-${props.envName}-aurora-reader-instance`);
        cdk.Tags.of(auroraWriterInstance).add('Name', `${props.projectName}-${props.envName}-aurora-writer-instance`);
    }
}
