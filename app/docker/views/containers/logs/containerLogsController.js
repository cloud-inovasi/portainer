angular.module('portainer.docker')
.controller('ContainerLogsController', ['$scope', '$transition$', '$interval', 'ContainerService', 'Notifications', 'HttpRequestHelper',
function ($scope, $transition$, $interval, ContainerService, Notifications, HttpRequestHelper) {
  $scope.state = {
    refreshRate: 3,
    lineCount: 100,
    sinceTimestamp: "1970-01-01T00:00:00",
    displayTimestamps: false
  };

  $scope.changeLogCollection = function(logCollectionStatus) {
    if (!logCollectionStatus) {
      stopRepeater();
    } else {
      setUpdateRepeater(!$scope.container.Config.Tty);
    }
  };

  $scope.$on('$destroy', function() {
    stopRepeater();
  });

  function stopRepeater() {
    var repeater = $scope.repeater;
    if (angular.isDefined(repeater)) {
      $interval.cancel(repeater);
      repeater = null;
    }
  }

  function setUpdateRepeater(skipHeaders) {
    var refreshRate = $scope.state.refreshRate;
    $scope.repeater = $interval(function() {
      ContainerService.logs($transition$.params().id, 1, 1, $scope.state.displayTimestamps ? 1 : 0, strToTimestamp($scope.state.sinceTimestamp), $scope.state.lineCount, skipHeaders)
      .then(function success(data) {
        $scope.logs = data;
      })
      .catch(function error(err) {
        stopRepeater();
        Notifications.error('Failure', err, 'Unable to retrieve container logs');
      });
    }, refreshRate * 1000);
  }

  function startLogPolling(skipHeaders) {
    ContainerService.logs($transition$.params().id, 1, 1, $scope.state.displayTimestamps ? 1 : 0, strToTimestamp($scope.state.sinceTimestamp), $scope.state.lineCount, skipHeaders)
    .then(function success(data) {
      $scope.logs = data;
      setUpdateRepeater(skipHeaders);
    })
    .catch(function error(err) {
      stopRepeater();
      Notifications.error('Failure', err, 'Unable to retrieve container logs');
    });
  }

  function initView() {
    HttpRequestHelper.setPortainerAgentTargetHeader($transition$.params().nodeName);
    ContainerService.container($transition$.params().id)
    .then(function success(data) {
      var container = data;
      $scope.container = container;
      startLogPolling(!container.Config.Tty);
    })
    .catch(function error(err) {
      Notifications.error('Failure', err, 'Unable to retrieve container information');
    });
  }

  initView();
}]);
