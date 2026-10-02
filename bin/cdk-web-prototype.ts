#!/usr/bin/env -S npx tsx
import * as cdk from "aws-cdk-lib/core";
import { loadPrdParameter } from "../config/prdParameter";
import { loadStgParameter } from "../config/stgParameter";
import { cfCdkWebPrototypeStack } from "../lib/cdk-web-prototype-stack";

const app = new cdk.App();
const prdParameter = loadPrdParameter(app.node.tryGetContext("prd"));
const stgParameter = loadStgParameter(app.node.tryGetContext("stg"));

for (const deploymentParameter of [prdParameter, stgParameter]) {
	new cfCdkWebPrototypeStack(
		app,
		`cfCdkWebPrototypeStack-${deploymentParameter.envName}`,
		{
			env: {
				account:
					deploymentParameter.env?.account ?? process.env.CDK_DEFAULT_ACCOUNT,
				region:
					deploymentParameter.env?.region ?? process.env.CDK_DEFAULT_REGION,
			},
			deploymentParameter,

			/* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
		},
	);
}
