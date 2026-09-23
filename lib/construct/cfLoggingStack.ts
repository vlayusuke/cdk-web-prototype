import * as cdk from "aws-cdk-lib";
import { aws_cloudwatch as cloudwatch } from "aws-cdk-lib";
import { Construct } from "constructs";

export interface commonProps {
    projectName: string;
    envName: string;
}

// ------------------------------------------------------------
// [15] - cfLoggingStack
// ------------------------------------------------------------
export class cfLoggingStack extends Construct {
    constructor(scope: Construct, id: string, commonProps: commonProps) {
        super(scope, id);
    }
}
