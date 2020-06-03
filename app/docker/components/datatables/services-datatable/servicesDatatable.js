angular.module('portainer.docker').component('servicesDatatable', {
  templateUrl: './servicesDatatable.html',
  controller: 'ServicesDatatableController',
  bindings: {
    titleText: '@',
    titleIcon: '@',
    dataset: '<',
    tableKey: '@',
    orderBy: '@',
    reverseOrder: '<',
    nodes: '<',
    agentProxy: '<',
    showUpdateAction: '<',
    showAddAction: '<',
    showStackColumn: '<',
    showTaskLogsButton: '<',
    refreshCallback: '<',
  },
});
