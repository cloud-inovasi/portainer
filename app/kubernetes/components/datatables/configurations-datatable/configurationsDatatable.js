angular.module('portainer.kubernetes').component('kubernetesConfigurationsDatatable', {
  templateUrl: './configurationsDatatable.html',
  controller: 'GenericDatatableController',
  bindings: {
    titleText: '@',
    titleIcon: '@',
    dataset: '<',
    tableKey: '@',
    orderBy: '@',
    refreshCallback: '<',
    removeAction: '<'
  }
});