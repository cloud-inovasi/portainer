/**
 * Generic metadata payload
 */
const _KubernetesCommonMetadataPayload = Object.freeze({
  uid: '',
  name: '',
  namespace: '',
  labels: {}
})
export class KubernetesCommonMetadataPayload {
  constructor() {
    Object.assign(this, JSON.parse(JSON.stringify(_KubernetesCommonMetadataPayload)));
  }
}