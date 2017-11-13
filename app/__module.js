angular.module('portainer', [
  'ui.bootstrap',
  'ui.router',
  'isteven-multi-select',
  'ngCookies',
  'ngSanitize',
  'ngFileUpload',
  'angularUtils.directives.dirPagination',
  'LocalStorageModule',
  'angular-jwt',
  'angular-google-analytics',
  'angular-loading-bar',
  'portainer.templates',
  'portainer.filters',
  'portainer.rest',
  'portainer.helpers',
  'portainer.services',
  'auth',
  'dashboard',
  'config',
  'configs',
  'container',
  'containerConsole',
  'containerLogs',
  'containerStats',
  'containerInspect',
  'serviceLogs',
  'containers',
  'createConfig',
  'createContainer',
  'createNetwork',
  'createRegistry',
  'createSecret',
  'createService',
  'createVolume',
  'createStack',
  'engine',
  'endpoint',
  'endpointAccess',
  'endpoints',
  'events',
  'extension.storidge',
  'image',
  'images',
  'initAdmin',
  'initEndpoint',
  'main',
  'network',
  'networks',
  'node',
  'registries',
  'registry',
  'registryAccess',
  'secrets',
  'secret',
  'service',
  'services',
  'settings',
  'settingsAuthentication',
  'sidebar',
  'stack',
  'stacks',
  'swarm',
  'swarmVisualizer',
  'task',
  'team',
  'teams',
  'templates',
  'user',
  'users',
  'userSettings',
  'volume',
  'volumes',
  'rzModule']);
