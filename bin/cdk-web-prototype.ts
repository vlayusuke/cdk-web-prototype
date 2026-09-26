#!/opt/homebrew/opt/node/bin/node
import * as cdk from "aws-cdk-lib/core";
import { pocParameter } from "../pocParameter";
import { cfCdkWebPrototypeStack } from "../lib/cdk-web-prototype-stack";

const app = new cdk.App();
new cfCdkWebPrototypeStack(app, "cfCdkWebPrototypeStack", {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT ?? pocParameter.env?.account,
        region: process.env.CDK_DEFAULT_REGION ?? pocParameter.env?.region,
    },

    /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});
