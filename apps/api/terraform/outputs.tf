output "alb_dns_name" {
  description = "The DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "ecs_cluster_name" {
  description = "Name of the ECS Cluster"
  value       = aws_ecs_cluster.main.name
}

output "efs_id" {
  description = "ID of the EFS File System"
  value       = aws_efs_file_system.sqlite_data.id
}
