#!/opt/homebrew/opt/node/bin/node
import * as cdk from "aws-cdk-lib/core";
import { CdkWebPrototypeStack } from "../lib/cdk-web-prototype-stack";

const app = new cdk.App();
new CdkWebPrototypeStack(app, "CdkWebPrototypeStack", {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
    },

    /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});
