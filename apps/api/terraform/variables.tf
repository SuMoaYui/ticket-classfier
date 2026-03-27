variable "aws_region" {
  description = "AWS region to deploy resources to"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "ticket-classifier"
}

variable "environment" {
  description = "Deployment environment (e.g., dev, prod)"
  type        = string
  default     = "dev"
}

variable "container_image" {
  description = "Docker image to run in the ECS task"
  type        = string
  default     = "ticket-classifier:latest" # In a real scenario, this would be an ECR URI
}

variable "container_port" {
  description = "Port exposed by the docker image"
  type        = number
  default     = 3000
}

variable "llm_mode" {
  description = "LLM mode: mock or anthropic"
  type        = string
  default     = "mock"
}

variable "anthropic_api_key" {
  description = "Anthropic API Key (required if llm_mode = anthropic)"
  type        = string
  sensitive   = true
  default     = ""
}
