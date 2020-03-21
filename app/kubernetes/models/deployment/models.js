/**
 * KubernetesDeployment Model
 */
const _KubernetesDeployment = Object.freeze({
  Namespace: '',
  Name: '',
  StackName: '',
  ReplicaCount: 0,
  Image: '',
  Env: [],
  CpuLimit: 0,
  MemoryLimit: 0,
  VolumeMounts: [],
  Volumes: [],
  Secret: undefined,
  ApplicationName: '',
  ApplicationOwner: '',
});

export class KubernetesDeployment {
  constructor() {
    Object.assign(this, JSON.parse(JSON.stringify(_KubernetesDeployment)));
  }
}