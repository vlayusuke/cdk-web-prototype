#!/usr/bin/env -S npx tsx
import * as cdk from "aws-cdk-lib";
import { loadDevParameter } from "../config/devParameter";
import { loadPrdParameter } from "../config/prdParameter";
import { loadStgParameter } from "../config/stgParameter";
import { cfCdkWebPrototypeStack } from "../lib/cdk-web-prototype-stack";

const app = new cdk.App();
const prdParameter = loadPrdParameter(app.node.tryGetContext("prd"));
const stgParameter = loadStgParameter(app.node.tryGetContext("stg"));
const devParameter = loadDevParameter(app.node.tryGetContext("dev"));

for (const deploymentParameter of [prdParameter, stgParameter, devParameter]) {
    new cfCdkWebPrototypeStack(
        app,
        `cfCdkWebPrototypeStack-${deploymentParameter.envName}`,
        {
            env: {
                account: deploymentParameter.env?.account,
                region: deploymentParameter.env?.region,
            },
            deploymentParameter,

            /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
        },
    );
}
