import angular from 'angular';
import _ from 'lodash-es';
import filesizeParser from 'filesize-parser';

class KubernetesClusterController {
  /* @ngInject */
  constructor($async, Notifications, KubernetesNodeService) {
    this.$async = $async;
    this.Notifications = Notifications;
    this.KubernetesNodeService = KubernetesNodeService;

    this.getNodes = this.getNodes.bind(this);
    this.getNodesAsync = this.getNodesAsync.bind(this);
  }

  async getNodesAsync() {
    try {
      const nodes = await this.KubernetesNodeService.nodes();
      _.forEach(nodes, (node) => node.Memory = filesizeParser(node.Memory));
      this.nodes = nodes;
    } catch (err) {
      this.Notifications.error('Failure', err, 'Unable to retrieve nodes');
    }
  }

  getNodes() {
    return this.$async(this.getNodesAsync);
  }

  async $onInit() {
    this.getNodes();
  }
}

export default KubernetesClusterController;
angular.module('portainer.kubernetes').controller('KubernetesClusterController', KubernetesClusterController);