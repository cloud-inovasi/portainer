import angular from 'angular';
import _ from 'lodash-es';
import filesizeParser from 'filesize-parser';
import { KubernetesApplicationDataAccessPolicies, KubernetesApplicationDeploymentTypes, KubernetesApplicationPublishingTypes, KubernetesApplicationQuotaDefaults } from 'Kubernetes/models/application/models';
import {
  KubernetesApplicationPublishedPortFormValue,
  KubernetesApplicationEnvironmentVariableFormValue,
  KubernetesApplicationFormValues,
  KubernetesApplicationPersistedFolderFormValue,
  KubernetesApplicationConfigurationFormValue,
  KubernetesApplicationConfigurationFormValueOverridenKey,
  KubernetesApplicationConfigurationFormValueOverridenKeyTypes
} from 'Kubernetes/models/application/formValues';


function megaBytesValue(mem) {
  return Math.floor(mem / 1000 / 1000);
}
class KubernetesCreateApplicationController {
  /* @ngInject */
  constructor($async, $state, Notifications, EndpointProvider, Authentication, KubernetesResourcePoolService, KubernetesApplicationService,
    KubernetesStackService, KubernetesConfigurationService, KubernetesNodeService) {
    this.$async = $async;
    this.$state = $state;
    this.Notifications = Notifications;
    this.EndpointProvider = EndpointProvider;
    this.Authentication = Authentication;
    this.KubernetesResourcePoolService = KubernetesResourcePoolService;
    this.KubernetesApplicationService = KubernetesApplicationService;
    this.KubernetesStackService = KubernetesStackService;
    this.KubernetesConfigurationService = KubernetesConfigurationService;
    this.KubernetesNodeService = KubernetesNodeService;

    this.ApplicationDeploymentTypes = KubernetesApplicationDeploymentTypes;
    this.ApplicationDataAccessPolicies = KubernetesApplicationDataAccessPolicies;
    this.ApplicationPublishingTypes = KubernetesApplicationPublishingTypes;
    this.ApplicationConfigurationFormValueOverridenKeyTypes = KubernetesApplicationConfigurationFormValueOverridenKeyTypes;

    this.onInit = this.onInit.bind(this);
    this.deployApplicationAsync = this.deployApplicationAsync.bind(this);
    this.updateSlidersAsync = this.updateSlidersAsync.bind(this);
    this.updateStacksAsync = this.updateStacksAsync.bind(this);
    this.updateConfigurationsAsync = this.updateConfigurationsAsync.bind(this);
    this.updateStacksAndConfigurationsAsync = this.updateStacksAndConfigurationsAsync.bind(this);
  }

  addConfiguration() {
    let config = new KubernetesApplicationConfigurationFormValue();
    config.SelectedConfiguration = this.configurations[0];
    this.formValues.Configurations.push(config);
  }

  removeConfiguration(index) {
    this.formValues.Configurations.splice(index, 1);
  }

  overrideConfiguration(index) {
    const config = this.formValues.Configurations[index];
    config.Overriden = true;
    config.OverridenKeys = _.map(_.keys(config.SelectedConfiguration.Data), (key) => {
      const res = new KubernetesApplicationConfigurationFormValueOverridenKey()
      res.Key = key;
      return res;
    });
  }

  resetConfiguration(index) {
    const config = this.formValues.Configurations[index];
    config.Overriden = false;
    config.OverridenKeys = [];
  }

  addEnvironmentVariable() {
    this.formValues.EnvironmentVariables.push(new KubernetesApplicationEnvironmentVariableFormValue());
  }

  removeEnvironmentVariable(index) {
    this.formValues.EnvironmentVariables.splice(index, 1);
  }

  hasEnvironmentVariables() {
    return this.formValues.EnvironmentVariables.length > 0;
  }

  addPersistedFolder() {
    let storageClass = {};
    if (this.storageClasses.length > 0) {
      storageClass = this.storageClasses[0];
    }

    this.formValues.PersistedFolders.push(new KubernetesApplicationPersistedFolderFormValue(storageClass));
    this.resetDeploymentType();
  }

  removePersistedFolder(index) {
    this.formValues.PersistedFolders.splice(index, 1);
  }

  addPublishedPort() {
    this.formValues.PublishedPorts.push(new KubernetesApplicationPublishedPortFormValue());
  }

  removePublishedPort(index) {
    this.formValues.PublishedPorts.splice(index, 1);
  }

  storageClassAvailable() {
    return this.storageClasses && this.storageClasses.length > 0;
  }

  hasMultipleStorageClassesAvailable() {
    return this.storageClasses && this.storageClasses.length > 1;
  }

  resetDeploymentType() {
    this.formValues.DeploymentType = this.ApplicationDeploymentTypes.REPLICATED;
  }

  // The data access policy panel is not shown when:
  // * There is not persisted folder specified
  showDataAccessPolicySection() {
    return this.formValues.PersistedFolders.length !== 0;
  }

  // A global deployment is not available when either:
  // * For each persisted folder specified, if one of the storage object only supports the RWO access mode
  // * The data access policy is set to ISOLATED
  supportGlobalDeployment() {
    if (this.formValues.PersistedFolders.length === 0) {
      return true;
    }

    const hasRWOOnly = _.find(this.formValues.PersistedFolders, (item) => _.isEqual(item.StorageClass.AccessModes, ["RWO"]));
    if (hasRWOOnly) {
      return false;
    }

    return this.formValues.DataAccessPolicy !== this.ApplicationDataAccessPolicies.ISOLATED;
  }

  // A scalable deployment is available when either:
  // * No persisted folders are specified
  // * The access policy is set to shared and for each persisted folders specified, all the associated storage objects support at least the ROX or RWX access mode
  // * The access policy is set to isolated
  supportScalableReplicaDeployment() {
    if (this.formValues.PersistedFolders.length === 0) {
      return true;
    }

    if (this.formValues.DataAccessPolicy === this.ApplicationDataAccessPolicies.ISOLATED) {
      return true;
    }

    const hasRWOOnly = _.find(this.formValues.PersistedFolders, (item) => _.isEqual(item.StorageClass.AccessModes, ["RWO"]));
    if (hasRWOOnly) {
      return false;
    }

    return true;
  }

  // For each persisted folders, returns the non scalable deployments options (storage class that only supports RWO)
  getNonScalableStorage() {
    let storageOptions = [];

    for (let i = 0; i < this.formValues.PersistedFolders.length; i++) {
      const folder = this.formValues.PersistedFolders[i];

      if (_.isEqual(folder.StorageClass.AccessModes, ["RWO"])) {
        storageOptions.push(folder.StorageClass.Name);
      }

    }

    return _.uniq(storageOptions).join(", ");
  }

  enforceReplicaCountMinimum() {
    if (this.formValues.ReplicaCount === null) {
      this.formValues.ReplicaCount = 1;
    }
  }

  resourceReservationsOverflow() {
    const instances = this.formValues.ReplicaCount;
    const cpu = this.formValues.CpuLimit;
    const maxCpu = this.state.sliders.cpu.max;
    const memory = this.formValues.MemoryLimit;
    const maxMemory = this.state.sliders.memory.max;

    if (cpu * instances > maxCpu) {
      return true;
    }

    if (memory * instances > maxMemory) {
      return true;
    }

    return false;
  }

  publishViaLoadBalancerEnabled() {
    return this.state.useLoadBalancer;
  }

  async deployApplicationAsync() {
    this.state.actionInProgress = true;
    try {
      this.formValues.ApplicationOwner = this.Authentication.getUserDetails().username;
      _.remove(this.formValues.Configurations, (item) => item.SelectedConfiguration === undefined);
      await this.KubernetesApplicationService.create(this.formValues);
      this.Notifications.success('Application successfully deployed', this.formValues.Name);
      this.$state.go('kubernetes.applications');
    } catch (err) {
      this.Notifications.error('Failure', err, 'Unable to create application');
    } finally {
      this.state.actionInProgress = false;
    }
  }

  deployApplication() {
    return this.$async(this.deployApplicationAsync);
  }

  resourceQuotaCapacityExceeded() {
    return !this.state.sliders.memory.max || !this.state.sliders.cpu.max;
  }

  async updateSlidersAsync() {
    try {
      const quota = this.formValues.ResourcePool.Quota;
      let minCpu, maxCpu, minMemory, maxMemory = 0;
      if (quota) {
        this.state.resourcePoolHasQuota = true;
        if (quota.CpuLimit) {
          minCpu = KubernetesApplicationQuotaDefaults.CpuLimit;
          maxCpu = quota.CpuLimit - quota.CpuLimitUsed;
        } else {
          minCpu = 0;
          maxCpu = this.state.nodes.cpu;
        }
        if (quota.MemoryLimit) {
          minMemory = KubernetesApplicationQuotaDefaults.MemoryLimit;
          maxMemory = quota.MemoryLimit - quota.MemoryLimitUsed;
        } else {
          minMemory = 0;
          maxMemory = this.state.nodes.memory;
        }
      } else {
        this.state.resourcePoolHasQuota = false;
        minCpu = 0;
        maxCpu = this.state.nodes.cpu;
        minMemory = 0;
        maxMemory = this.state.nodes.memory;
      }
      this.state.sliders.memory.min = minMemory;
      this.state.sliders.memory.max = megaBytesValue(maxMemory);
      this.state.sliders.cpu.min = minCpu;
      this.state.sliders.cpu.max = _.round(maxCpu, 2);
      this.formValues.CpuLimit = minCpu;
      this.formValues.MemoryLimit = minMemory;
    } catch (err) {
      this.Notifications.error('Failure', err, 'Unable to update resources selector');
    }
  }

  updateSliders() {
    return this.$async(this.updateSlidersAsync);
  }

  async updateStacksAsync() {
    try {
      const namespace = this.formValues.ResourcePool.Namespace.Name;
      this.stacks = await this.KubernetesStackService.get(namespace);
    } catch (err) {
      this.Notifications.error('Failure', err, 'Unable to retrieve stacks');
    }
  }

  updateStacks() {
    return this.$async(this.updateStacksAsync);
  }

  async updateConfigurationsAsync() {
    try {
      const namespace = this.formValues.ResourcePool.Namespace.Name;
      this.configurations = await this.KubernetesConfigurationService.get(namespace);
    } catch (err) {
      this.Notifications.error('Failure', err, 'Unable to retrieve configurations');
    }
  }

  updateConfigurations() {
    return this.$async(this.updateConfigurationsAsync);
  }

  async updateStacksAndConfigurationsAsync() {
    await Promise.all([
      this.updateStacks(),
      this.updateConfigurations()
    ]);
  }

  updateStacksAndConfigurations() {
    return this.$async(this.updateStacksAndConfigurationsAsync);
  }

  onResourcePoolSelectionChange() {
    this.updateSliders();
    this.updateStacksAndConfigurations();
    this.formValues.Configurations = [];
  }

  async onInit() {
    try {
      this.formValues = new KubernetesApplicationFormValues();

      this.state = {
        actionInProgress: false,
        useLoadBalancer: false,
        sliders: {
          cpu: {
            min: 0,
            max: 0
          },
          memory: {
            min: 0,
            max: 0,
          },
        },
        nodes: {
          memory: 0,
          cpu: 0
        },
        resourcePoolHasQuota: false,
      };

      const [resourcePools, nodes] = await Promise.all([
        this.KubernetesResourcePoolService.get(),
        this.KubernetesNodeService.get()
      ]);

      _.forEach(nodes, (item) => {
        this.state.nodes.memory += filesizeParser(item.Memory);
        this.state.nodes.cpu += item.CPU;
      });
      this.resourcePools = resourcePools;
      this.formValues.ResourcePool = this.resourcePools[0];
      await this.updateSliders();

      const endpoint = this.EndpointProvider.currentEndpoint();
      this.storageClasses = endpoint.Kubernetes.Configuration.StorageClasses;
      this.state.useLoadBalancer = endpoint.Kubernetes.Configuration.UseLoadBalancer;
      await this.updateStacksAndConfigurations();
    } catch (err) {
      this.Notifications.error('Failure', err, 'Unable to load view data');
    }
  }

  $onInit() {
    return this.$async(this.onInit);
  }
}

export default KubernetesCreateApplicationController;
angular.module('portainer.kubernetes').controller('KubernetesCreateApplicationController', KubernetesCreateApplicationController);