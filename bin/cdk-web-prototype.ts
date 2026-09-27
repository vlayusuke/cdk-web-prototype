#!/usr/bin/env -S npx tsx
import * as cdk from "aws-cdk-lib/core";
import { cfCdkWebPrototypeStack } from "../lib/cdk-web-prototype-stack";
import { loadPocParameter } from "../pocParameter";

const app = new cdk.App();
const pocParameter = loadPocParameter(app.node.tryGetContext("poc"));
new cfCdkWebPrototypeStack(app, "cfCdkWebPrototypeStack", {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT ?? pocParameter.env?.account,
        region: process.env.CDK_DEFAULT_REGION ?? pocParameter.env?.region,
    },
    pocParameter,

    /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});
