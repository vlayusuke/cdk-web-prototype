# cdk-web-prototype

このプロジェクトは、Amazon Web ServicesとAWS CDKをフレームワークとして用いたTypeScriptを使用した、Web3レイヤー構成による、Webアプリケーション向けのリソースを構築するために使用するものです。AWS Fargateを用いたコンテナを用いてWebアプリケーションを構築することを想定しています。

また、標準的な3ステージ構成とすることを目指し、また、原則として1つのAWSアカウントに対して、1つの環境を構築することを前提としています。ただし、1つのAWSアカウントに対して3つの環境を構築することも可能なように柔軟性を持たせた設計とする予定です。

## プロジェクトファイルについて

このプロジェクトは、実装開始時に

```bash
cdk init --language typescript
```

コマンドを実行してプロジェクトの構築を行なっています。また、

```bash
npx tsc --noEmit

cdk synth
```

コマンドを実行して、 `.ts` ファイルの型チェックと、AWS CloudFormationスタックテンプレートの出力確認が正常に実行されることを確認しています。

AWSアカウント、通知先メールアドレス、Slack IDなどの環境固有値は、ルート直下の `cdk.context.json` の `poc` contextに設定してください。このファイルは `.gitignore` 対象です。初回checkout後に次のキーを設定してから `cdk synth` または `cdk deploy` を実行してください。

```json
{
    "poc": {
        "account": "AWS_ACCOUNT_ID",
        "region": "AWS_REGION",
        "monitoringNotifyEmail": "NOTIFICATION_EMAIL",
        "monitoringSlackWorkspaceId": "SLACK_WORKSPACE_ID",
        "monitoringSlackChannelId": "SLACK_CHANNEL_ID"
    }
}
```

利用するAvailability Zoneは `commonParameter.ts` の `availabilityZones` で設定します。現在の Batch構成では2AZ以上が必要な設定となっています。

## スタックの構成

このプロジェクトで実装しているスタックの構成は以下の通りです。

### `/bin`

- cdk-web-prototype.ts

### `/lib`

- cdk-web-prototype-stack.ts

### `/lib/construct`

1. cfSecurityConfigStack.ts
2. cfNetworkStack.ts
3. cfSgFrameStack.ts
4. cfDatabaseStack.ts
5. cfSecurityServiceStack.ts
6. cfStorageStack.ts
7. cfComputeWebAPStack.ts
8. cfComputeBatchStack.ts
9. cfComputeServerlessStack.ts
10. cfSgRuleStack.ts
11. cfDNSAndCDNStack.ts
12. cfComputeDefinitionStack.ts
13. cfNotificationStack.ts
14. cfMonitoringStack.ts
15. cfLoggingStack.ts
16. cfCICDStack.ts

### `/lib/json`

1. amazon-ecr-lifecycle-policy.json
2. amazon-ecs-task-definition-app.json
3. amazon-ecs-task-definition-cron.json
4. amazon-ecs-task-definition-queue.json

### `/lib/lambda`

1. cloudwatch-logs-alert
2. cloudwatch-metrics-alert
3. rds-control

## 開発プラットフォームのバージョン

このプロジェクトの開発プラットフォームを構成するフレームワークや開発言語のバージョン情報は以下の通りです。

### フレームワーク

| Framework   | Version    |
| :---------- | ---------: |
| AWS CDK     |  v2.1139.0 |
| Node.js     |   v24.20.0 |
| npm         |    v12.0.2 |
| Boto3       |   v1.43.97 |

### 開発言語

| Language    | Version    |
| :---------- | ---------: |
| TypeScript  |     v7.0.2 |
| Python      |    v3.14.6 |

## リリース履歴

このプロジェクトのリリース履歴は、[Releases](https://github.com/vlayusuke/cdk-web-prototype/releases)を参照してください。

## ライセンス

このプロジェクトは、MIT LICENSEのもとでライセンスされています。詳細は、[LICENSE](./LICENSE)を参照してください。
