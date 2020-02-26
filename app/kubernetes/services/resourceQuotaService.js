import _ from 'lodash-es';
import KubernetesResourceQuotaViewModel from 'Kubernetes/models/resourceQuota';

angular.module("portainer.kubernetes").factory("KubernetesResourceQuotaService", [
  "$async", "KubernetesResourceQuotas",
  function KubernetesResourceQuotaServiceFactory($async, KubernetesResourceQuotas) {
    "use strict";
    const service = {
      quota: quota,
      quotas: quotas,
      create: create,
      update: update,
      remove: remove,
      removeCollection: removeCollection
    };

    /**
     * Quota
     */
    async function quotaAsync(namespace, name) {
      try {
        const payload = {
          id: name
        };
        const [raw, yaml] = await Promise.all([
          KubernetesResourceQuotas(namespace).get(payload).$promise,
          KubernetesResourceQuotas(namespace).getYaml(payload).$promise
        ]);
        const quota = new KubernetesResourceQuotaViewModel(raw);
        quota.Yaml = yaml;
        return quota;
      } catch (err) {
        throw { msg: 'Unable to retrieve resource quota', err: err };
      }
    }

    function quota(namespace, name) {
      return $async(quotaAsync, namespace, name);
    }

    /**
     * Quotas
     */
    async function quotasAsync(namespace) {
      try {
        const data = await KubernetesResourceQuotas(namespace).get().$promise;
        const quotas = _.map(data.items, (item) => new KubernetesResourceQuotaViewModel(item));
        return quotas;
      } catch (err) {
        throw { msg: 'Unable to retrieve resource quotas', err: err};
      }
    }

    function quotas(namespace) {
      return $async(quotasAsync, namespace);
    }

    /**
     * Creation
     */
    async function createAsync(namespace, cpuLimit, memoryLimit) {
      try {
        const payload = {
          metadata: {
            name: 'portainer-rq-' + namespace,
            namespace: namespace
          },
          spec: {
            hard: {
              'limits.cpu': cpuLimit,
              'limits.memory': memoryLimit
            }
          }
        };
        if (cpuLimit === 0) {
          delete payload.spec.hard['limits.cpu'];
        }
        if (memoryLimit ===0) {
          delete payload.spec.hard['limits.memory'];
        }
        const data = await KubernetesResourceQuotas(namespace).create(payload).$promise;
        return data;
      } catch (err) {
        throw { msg: 'Unable to create quota', err:err };
      }
    }

    function create(namespace, cpuLimit, memoryLimit) {
      return $async(createAsync, namespace, cpuLimit, memoryLimit);
    }

    /**
     * Update
     */
    async function updateAsync(quota, cpuLimit, memoryLimit) {
      try {
        quota.spec.hard['limits.cpu'] = cpuLimit;
        quota.spec.hard['limits.memory'] = memoryLimit;
        if (cpuLimit === 0) {
          delete quota.spec.hard['limits.cpu'];
        }
        if (memoryLimit === 0) {
          delete quota.spec.hard['limits.memory'];
        }
        const data = await KubernetesResourceQuotas(quota.metadata.namespace).update({}, quota).$promise;
        return new KubernetesResourceQuotaViewModel(data);
      } catch (err) {
        throw { msg: 'Unable to update resource quota', err: err };
      }
    }

    function update(quota, cpuLimit, memoryLimit) {
      return $async(updateAsync, quota, cpuLimit, memoryLimit)
    }

    /**
     * Delete
     */
    async function removeAsync(quota) {
      try {
        const payload = {
          id: quota.Name
        };
        await KubernetesResourceQuotas(quota.Namespace).delete(payload).$promise;
      } catch (err) {
        throw { msg: 'Unable to delete quota', err: err };
      }
    }

    function remove(quota) {
      return $async(removeAsync, quota);
    }

    /**
     * Delete collection
     */
    async function removeCollectionAsync(quota) {
      try {
        await KubernetesResourceQuotas(quota.Namespace).delete().$promise;
      } catch (err) {
        throw { msg: 'Unable to delete quotas', err: err };
      }
    }

    function removeCollection(quota) {
      return $async(removeCollectionAsync, quota);
    }

    return service;
  }
]);