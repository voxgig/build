$$resname$$:
  Type: "AWS::SQS::Queue"
  Properties:
    QueueName: '$$queueName$$'
    VisibilityTimeout: $$queueTimeout$$

