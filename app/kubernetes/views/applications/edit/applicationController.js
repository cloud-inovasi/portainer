import angular from 'angular';
import _ from 'lodash-es';
import {KubernetesApplicationDeploymentTypes} from 'Kubernetes/models/application/models';

class KubernetesApplicationController {
  /* @ngInject */
  constructor($async, $state, clipboard, Notifications, KubernetesApplicationService, KubernetesEventService) {
    this.$async = $async;
    this.$state = $state;
    this.clipboard = clipboard;
    this.Notifications = Notifications;
    this.KubernetesApplicationService = KubernetesApplicationService;
    this.KubernetesEventService = KubernetesEventService;

    this.onInit = this.onInit.bind(this);
    this.getApplication = this.getApplication.bind(this);
    this.getApplicationAsync = this.getApplicationAsync.bind(this);
    this.getEvents = this.getEvents.bind(this);
    this.getEventsAsync = this.getEventsAsync.bind(this);
    this.copyLoadBalancerIP = this.copyLoadBalancerIP.bind(this);
  }

  async getEventsAsync() {
    try {
      this.state.eventsLoading = true;
      const events = await this.KubernetesEventService.get(this.application.ResourcePool);
      this.events = _.filter(events, (event) => event.Involved.uid === this.application.Id
        || event.Involved.uid === this.application.ServiceId
        || _.find(this.application.Pods, (pod) => pod.Id === event.Involved.uid) !== undefined);
    } catch (err) {
      this.Notifications.error('Failure', err, 'Unable to retrieve application related events');
    } finally {
      this.state.eventsLoading = false;
    }
  }

  getEvents() {
    return this.$async(this.getEventsAsync);
  }

  copyLoadBalancerIP() {
    this.clipboard.copyText(this.application.LoadBalancerIPAddress);
    $('#copyNotificationLB').show().fadeOut(2500);
  }

  async getApplicationAsync() {
      try {
        this.state.dataLoading = true;
        const applicationName = this.$transition$.params().name;
        const namespace = this.$transition$.params().namespace;
        this.application = await this.KubernetesApplicationService.get(namespace, applicationName);
      } catch (err) {
        this.Notifications.error('Failure', err, 'Unable to retrieve application details');
      } finally {
        this.state.dataLoading = false;
      }
  }

  getApplication() {
    return this.$async(this.getApplicationAsync);
  }

  showEditor() {
    this.state.showEditorTab = true;
  }

  async onInit() {
    this.state = {
      activeTab: 0,
      showEditorTab: false,
      DisplayedPanel: 'pods',
      eventsLoading: true,
      dataLoading: true
    };

    this.KubernetesApplicationDeploymentTypes = KubernetesApplicationDeploymentTypes;
    this.getApplication().then(() => this.getEvents());
  }

  $onInit() {
    return this.$async(this.onInit);
  }
}

export default KubernetesApplicationController;
angular.module('portainer.kubernetes').controller('KubernetesApplicationController', KubernetesApplicationController);