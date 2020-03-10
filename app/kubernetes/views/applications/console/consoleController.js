import angular from 'angular';
import {Terminal} from 'xterm';

class KubernetesApplicationConsoleController {
  /* @ngInject */
  constructor($async, $state, $transition$, Notifications, KubernetesApplicationService, EndpointProvider, LocalStorage) {
    this.$async = $async;
    this.$state = $state;
    this.$transition$ = $transition$;
    this.Notifications = Notifications;
    this.KubernetesApplicationService = KubernetesApplicationService;
    this.EndpointProvider = EndpointProvider;
    this.LocalStorage = LocalStorage;

    this.onInit = this.onInit.bind(this);
  }

  disconnect() {
    this.state.socket.close();
    this.state.term.dispose();
    this.state.connected = false;
  }

  configureSocketAndTerminal(socket, term) {
    socket.onopen = function() {
      const terminal_container = document.getElementById('terminal-container');
      term.open(terminal_container);
      term.setOption('cursorBlink', true);
      term.focus();
    };

    term.on('data', function (data) {
      socket.send(data);
    });

    socket.onmessage = function (msg) {
      term.write(msg.data);
    };

    socket.onerror = function (err) {
      this.disconnect();
      this.Notifications.error("Failure", err, "Websocket connection error");
    }.bind(this);

    this.state.socket.onclose = function () {
      this.disconnect();
    }.bind(this);

    this.state.connected = true;
  }

  connectConsole() {
    const params = {
      token: this.LocalStorage.getJWT(),
      endpointId: this.EndpointProvider.endpointID(),
      namespace: this.application.ResourcePool,
      podName: this.podName,
      containerName: this.application.Pods[0].Containers[0].name,
      command: this.state.command
    };

    let url = window.location.href.split('#')[0] + 'api/websocket/pod?' + (Object.keys(params).map((k) => k + "=" + params[k]).join("&"));
    if (url.indexOf('https') > -1) {
      url = url.replace('https://', 'wss://');
    } else {
      url = url.replace('http://', 'ws://');
    }

    this.state.socket = new WebSocket(url);
    this.state.term = new Terminal();

    this.configureSocketAndTerminal(this.state.socket, this.state.term);
  }

  async onInit() {
    const availableCommands = ['/bin/bash', '/bin/sh'];

    this.state = {
      actionInProgress: false,
      availableCommands: availableCommands,
      command: availableCommands[1],
      connected: false,
      socket: null,
      term: null
    };

    const podName = this.$transition$.params().pod;
    const applicationName = this.$transition$.params().name;
    const namespace = this.$transition$.params().namespace;

    this.podName = podName;

    try {
      this.application = await this.KubernetesApplicationService.get(namespace, applicationName);
    } catch (err) {
      this.Notifications.error('Failure', err, 'Unable to retrieve application logs');
    }
  }

  $onInit() {
    return this.$async(this.onInit);
  }
}

export default KubernetesApplicationConsoleController;
angular.module('portainer.kubernetes').controller('KubernetesApplicationConsoleController', KubernetesApplicationConsoleController);