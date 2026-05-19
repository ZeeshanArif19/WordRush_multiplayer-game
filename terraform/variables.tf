variable "aws_region" {
  description = "The AWS region to deploy resources in"
  type        = string
  default     = "us-east-1" # Update this to your actual region (e.g., us-east-1, ap-south-1)
}

variable "instance_type" {
  description = "The EC2 instance type"
  type        = string
  default     = "t2.micro"
}

variable "key_name" {
  description = "The name of your AWS SSH key pair"
  type        = string
  default     = "wordrush-key" # Update this to the actual name of the key pair you downloaded from AWS
}
