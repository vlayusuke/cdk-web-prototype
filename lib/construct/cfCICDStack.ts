import type { aws_kms as kms } from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib";
import { aws_codecommit as codecommit } from "aws-cdk-lib";
import { Construct } from "constructs";

export interface commonProps {
    projectName: string;
    envName: string;
}

export interface kmsProps {
    codeCommitKey: kms.IKey;
}

// ------------------------------------------------------------
// [16] - CICD Stack
// ------------------------------------------------------------
export class cfCICDStack extends Construct {
    constructor(
        scope: Construct,
        id: string,
        commonProps: commonProps,
        kmsProps: kmsProps,
    ) {
        super(scope, id);

        // ------------------------------------------------------------
        // AWS CodeCommit Configuration
        // ------------------------------------------------------------
        const codeCommitRepository = new codecommit.Repository(
            this,
            "CodeCommitRepository",
            {
                repositoryName: "cdk-web-prototype",
                kmsKey: kmsProps.codeCommitKey,
            },
        );

        cdk.Tags.of(codeCommitRepository).add(
            "Name",
            `${commonProps.projectName}-${commonProps.envName}-codecommit`,
        );
        cdk.Tags.of(codeCommitRepository).add("ProvisionedBy", "AWS");
    }
}
