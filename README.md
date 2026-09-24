# cdk-web-prototype

このプロトタイプは、Amazon Web ServicesとAWS CDKをフレームワークとして用いたTypeScriptを使用した、Web3レイヤー構成による、Webアプリケーション向けのリソースを構築するために使用するものです。AWS Fargateを用いたコンテナを用いてWebアプリケーションを構築することを想定しています。

また、標準的な3ステージ構成とすることを目指し、また、原則として1つのAWSアカウントに対して、1つの環境を構築することを前提としています。ただし、1つのAWSアカウントに対して3つの環境を構築することも可能なように柔軟性を持たせた設計とする予定です。

## スタックの構成

このプロトタイプで実装しているスタックの構成は以下の通りです。

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
11. cfDNSStack.ts
12. cfComputeDefinitionStack.ts
13. cfNotificationStack.ts
14. cfMonitoringStack.ts
15. cfLoggingStack.ts

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

このプロトタイプの開発プラットフォームを構成するフレームワークや開発言語のバージョン情報は以下の通りです。

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

このプロトタイプのリリース履歴は、[Releases](https://github.com/vlayusuke/cdk-web-prototype/releases)を参照してください。

## ライセンス

このプロトタイプは、MIT LICENSEのもとでライセンスされています。詳細は、[LICENSE](./LICENSE)を参照してください。
