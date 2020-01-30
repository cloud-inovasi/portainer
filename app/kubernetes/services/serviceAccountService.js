import angular from 'angular';
import _ from 'lodash-es';
import PortainerError from 'Portainer/error';

import {KubernetesPortainerServiceAccountNamespace} from 'Kubernetes/models/service-account/models';
import KubernetesServiceAccountConverter from 'Kubernetes/converters/serviceAccount';

class KubernetesServiceAccountService {
  /* @ngInject */
  constructor($async, KubernetesServiceAccounts) {
    this.$async = $async;
    this.KubernetesServiceAccounts = KubernetesServiceAccounts;

    this.listAsync = this.listAsync.bind(this);
    this.getAsync = this.getAsync.bind(this);
    this.createAsync = this.createAsync.bind(this);
  }

  /**
   * LIST
   */
  async listAsync() {
    try {
      const data = await this.KubernetesServiceAccounts(KubernetesPortainerServiceAccountNamespace).get().$promise;
      return _.map(data.items, (item) => KubernetesServiceAccountConverter.apiToServiceAccount(item));
    } catch (err) {
      throw new PortainerError('Unable to retrieve service accounts', err);
    }
  }

  list() {
    return this.$async(this.listAsync);
  }

  /**
   * GET
   */
  async getAsync(payload) {
    try {
      const data = await this.KubernetesServiceAccounts(KubernetesPortainerServiceAccountNamespace).get(payload).$promise;
      return KubernetesServiceAccountConverter.apiToServiceAccount(data);
    } catch (err) {
      throw new PortainerError('Unable to retrieve service account', err);
    }
  }

  get(name) {
    const payload = KubernetesServiceAccountConverter.getPayload(name);
    return this.$async(this.getAsync, payload);
  }

  getForUserOrTeam(userOrTeam) {
    const payload = KubernetesServiceAccountConverter.getForUserOrTeamPayload(userOrTeam);
    return this.$async(this.getAsync, payload);
  }

  /**
   * CREATE
   */
  async createAsync(userOrTeam) {
    try {
      const payload = KubernetesServiceAccountConverter.createPayload(userOrTeam);
      const data = await this.KubernetesServiceAccounts(KubernetesPortainerServiceAccountNamespace).create(payload).$promise;
      return KubernetesServiceAccountConverter.apiToServiceAccount(data);
    } catch (err) {
      throw new PortainerError('Unable to create service account', err);
    }
  }

  create(userOrTeam) {
    return this.$async(this.createAsync, userOrTeam)
  }
}

export default KubernetesServiceAccountService;
angular.module('portainer.kubernetes').service('KubernetesServiceAccountService', KubernetesServiceAccountService);