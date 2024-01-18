variable "name" {
  type = string
}

variable "hash_key" {
  type    = string
  default = "id"
}

variable "billing_mode" {
  type    = string
  default = "PAY_PER_REQUEST"
}

resource "aws_dynamodb_table" "table" {
  name         = var.name
  hash_key     = var.hash_key
  billing_mode = var.billing_mode

  point_in_time_recovery {
    enabled = true
  }

  attribute {
    name = "id"
    type = "S"
  }

  lifecycle {
    prevent_destroy = false
  }
}
