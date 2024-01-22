"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lambdaResources = void 0;
const lambdaResources = () => `resource "aws_s3_bucket" "lambda_bucket" {
  bucket = "vxg01-\${var.stage}-lambda-bucket"
}

resource "aws_s3_bucket_ownership_controls" "lambda_bucket" {
  bucket = aws_s3_bucket.lambda_bucket.id

  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_acl" "lambda_bucket" {
  depends_on = [aws_s3_bucket_ownership_controls.lambda_bucket]

  bucket = aws_s3_bucket.lambda_bucket.id
  acl    = "private"
}

resource "aws_s3_object" "lambda_s3_object" {
  bucket = aws_s3_bucket.lambda_bucket.bucket
  key    = "lambda/vxg01-\${var.stage}-lambda-bucket.zip"
  source = "\${path.root}/../../../backend.zip"
  etag   = filemd5("\${path.root}/../../../backend.zip")
}\n\n`;
exports.lambdaResources = lambdaResources;
//# sourceMappingURL=lambda.js.map