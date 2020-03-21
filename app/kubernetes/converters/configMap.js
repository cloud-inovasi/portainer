import _ from 'lodash-es';
import { KubernetesConfigMap, KubernetesPortainerConfigMapAccessKey } from 'Kubernetes/models/config-map/models';
import { KubernetesConfigMapCreatePayload, KubernetesConfigMapUpdatePayload } from 'Kubernetes/models/config-map/payloads';
import { UserAccessViewModel, TeamAccessViewModel } from 'Portainer/models/access';
import YAML from 'yaml';

class KubernetesConfigMapConverter {
  /**
   * API ConfigMap to front ConfigMap
   */
  static apiToConfigMap(data) {
    const res = new KubernetesConfigMap();
    res.Id = data.metadata.uid;
    res.Name = data.metadata.name;
    res.Namespace = data.metadata.namespace;
    res.CreationDate = data.metadata.creationTimestamp;
    res.Data = {};
    const resData = data.data || {};
    _.forIn(resData, (value, key) => {
      try {
        res.Data[key] = JSON.parse(value)
      } catch (err) {
        res.Data[key] = value;
      }
    });
    return res;
  }

  /**
   * 
   */
  static modifiyNamespaceAccesses(configMap, namespace, accesses) {
    configMap.Data[KubernetesPortainerConfigMapAccessKey][namespace] = {
      UserAccessPolicies: {},
      TeamAccessPolicies: {}
    };
    _.forEach(accesses, (item) => {
      if (item instanceof UserAccessViewModel) {
        configMap.Data[KubernetesPortainerConfigMapAccessKey][namespace].UserAccessPolicies[item.Id] = { RoleId: 0 };
      } else if (item instanceof TeamAccessViewModel) {
        configMap.Data[KubernetesPortainerConfigMapAccessKey][namespace].TeamAccessPolicies[item.Id] = { RoleId: 0 };
      }
    });
    return configMap;
  }

  /**
   * Generate a default ConfigMap Model
   * with ID = 0 (showing it's a default)
   * but setting his Namespace and Name
   */
  static defaultConfigMap(namespace, name) {
    const res = new KubernetesConfigMap();
    res.Name = name
    res.Namespace = namespace;
    return res;
  }

  /**
   * CREATE payload
   */
  static createPayload(data) {
    const res = new KubernetesConfigMapCreatePayload();
    res.metadata.name = data.Name;
    res.metadata.namespace = data.Namespace;
    res.data = {};
    _.forIn(data.Data, (value, key) => res.data[key] = JSON.stringify(value));
    return res;
  }

  /**
   * UPDATE payload
   */
  static updatePayload(data) {
    const res = new KubernetesConfigMapUpdatePayload();
    res.metadata.uid = data.Id;
    res.metadata.name = data.Name;
    res.metadata.namespace = data.Namespace;
    res.data = {};
    _.forIn(data.Data, (value, key) => res.data[key] = JSON.stringify(value));
    return res;
  }

  static configurationFormValuesToConfigMap(formValues) {
    const res = new KubernetesConfigMap();
    res.Id = formValues.Id;
    res.Name = formValues.Name;
    res.Namespace = formValues.ResourcePool.Namespace.Name;
    if (formValues.IsSimple) {
      res.Data = _.reduce(formValues.Data, (acc, entry) => {
        acc[entry.Key] = entry.Value;
        return acc;
      }, {});
    } else {
      res.Data = YAML.parse(formValues.DataYaml);
    }
    return res;
  }
}

export default KubernetesConfigMapConverter;