angular.module('volumes', [])
.controller('VolumesController', ['$scope', '$state', 'Volume', 'Messages',
function ($scope, $state, Volume, Messages) {
  $scope.state = {};
  $scope.state.selectedItemCount = 0;
  $scope.sortType = 'Name';
  $scope.sortReverse = true;
  $scope.config = {
    Name: ''
  };

  $scope.order = function(sortType) {
    $scope.sortReverse = ($scope.sortType === sortType) ? !$scope.sortReverse : false;
    $scope.sortType = sortType;
  };

  $scope.selectItem = function (item) {
    if (item.Checked) {
      $scope.state.selectedItemCount++;
    } else {
      $scope.state.selectedItemCount--;
    }
  };

  $scope.removeDanglingVolumes = function() {
    $('#loadVolumesSpinner').show();
    Volume.query({filters: { "dangling": [ "true" ] }}, function (d) {
      if (d.Volumes) {
        angular.forEach(d.Volumes, function (volume) {
          Volume.remove({name: volume.Name}, function (d) {
            if (d.message) {
              Messages.error("Unable to remove volume", {}, d.message);
            } else {
              Messages.send("Volume deleted", volume.Name);
            }
            $state.go('volumes', {}, {reload: true});
          }, function (e) {
            Messages.error("Failure", e, "Unable to remove volume");
          });
        });
      } else {
        Messages.send("No volumes removed", "No orphaned volumes detected");        
      }
      $('#loadVolumesSpinner').hide();
    }, function (e) {
      $('#loadVolumesSpinner').hide();
      Messages.error("Failure", e, "Unable to retrieve the list of dangling volumes");
    });
  };

  $scope.removeAction = function () {
    $('#loadVolumesSpinner').show();
    var counter = 0;
    var complete = function () {
      counter = counter - 1;
      if (counter === 0) {
        $('#loadVolumesSpinner').hide();
      }
    };
    angular.forEach($scope.volumes, function (volume) {
      if (volume.Checked) {
        counter = counter + 1;
        Volume.remove({name: volume.Name}, function (d) {
          if (d.message) {
            Messages.error("Unable to remove volume", {}, d.message);
          } else {
            Messages.send("Volume deleted", volume.Name);
            var index = $scope.volumes.indexOf(volume);
            $scope.volumes.splice(index, 1);
          }
          complete();
        }, function (e) {
          Messages.error("Failure", e, "Unable to remove volume");
          complete();
        });
      }
    });
  };

  function fetchVolumes() {
    $('#loadVolumesSpinner').show();
    Volume.query({}, function (d) {
      $scope.volumes = d.Volumes;
      $('#loadVolumesSpinner').hide();
    }, function (e) {
      $('#loadVolumesSpinner').hide();
      Messages.error("Failure", e, "Unable to retrieve volumes");
      $scope.volumes = [];
    });
  }
  fetchVolumes();
}]);
