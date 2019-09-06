export default function KubernetesDeploymentViewModel(data) {
  this.Name = data.metadata.name;
  this.ReadyReplicaCount = data.status.readyReplicas;
  this.TotalReplicaCount = data.status.replicas;
  this.CreatedAt = data.metadata.creationTimestamp;
}