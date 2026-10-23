import json
import os
import zlib
import base64
import logging

import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

sns_client = boto3.client("sns")


def lambda_handler(event, context):
    logger.info(event)

    data = event['awslogs']['data']
    json_str = zlib.decompress(base64.b64decode(data), 16 + zlib.MAX_WBITS).decode('utf-8')
    json_data = json.loads(json_str)

    for row in json_data['logEvents']:
        logger.info(row)

        log_message = '''
            Log group : `{logGroup}`\nLog stream : {logStream}\n<https://ap-northeast-1.console.aws.amazon.com/cloudwatch/home?region=ap-northeast-1#logEventViewer:group={logGroup};stream={logStream} | 詳細はここをクリック>
            ```{message}```
        '''.format(
            logGroup=str(json_data['logGroup']),
            logStream=str(json_data['logStream']),
            message=str(row['message'])
        ).strip()

        sns_client.publish(
            TopicArn=os.environ["snsTopicArn"],
            Message=log_message,
        )
