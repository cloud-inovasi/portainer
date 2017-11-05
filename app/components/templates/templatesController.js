angular.module('templates', [])
.controller('TemplatesController', ['$scope', '$q', '$state', '$transition$', '$anchorScroll', '$filter', 'ContainerService', 'ContainerHelper', 'ImageService', 'NetworkService', 'TemplateService', 'TemplateHelper', 'VolumeService', 'Notifications', 'Pagination', 'ResourceControlService', 'Authentication', 'FormValidator', 'SettingsService', 'StackService',
function ($scope, $q, $state, $transition$, $anchorScroll, $filter, ContainerService, ContainerHelper, ImageService, NetworkService, TemplateService, TemplateHelper, VolumeService, Notifications, Pagination, ResourceControlService, Authentication, FormValidator, SettingsService, StackService) {
  $scope.state = {
    selectedTemplate: null,
    showAdvancedOptions: false,
    hideDescriptions: $transition$.params().hide_descriptions,
    formValidationError: '',
    showDeploymentSelector: false,
    filters: {
      Categories: '!',
      Platform: '!',
      Type: 'container'
    }
  };

  $scope.formValues = {
    network: '',
    name: '',
    AccessControlData: new AccessControlFormData()
  };

  $scope.addVolume = function () {
    $scope.state.selectedTemplate.Volumes.push({ containerPath: '', name: '', readOnly: false, type: 'auto' });
  };

  $scope.removeVolume = function(index) {
    $scope.state.selectedTemplate.Volumes.splice(index, 1);
  };

  $scope.addPortBinding = function() {
    $scope.state.selectedTemplate.Ports.push({ hostPort: '', containerPort: '', protocol: 'tcp' });
  };

  $scope.removePortBinding = function(index) {
    $scope.state.selectedTemplate.Ports.splice(index, 1);
  };

  $scope.addExtraHost = function() {
    $scope.state.selectedTemplate.Hosts.push('');
  };

  $scope.removeExtraHost = function(index) {
    $scope.state.selectedTemplate.Hosts.splice(index, 1);
  };

  function validateForm(accessControlData, isAdmin) {
    $scope.state.formValidationError = '';
    var error = '';
    error = FormValidator.validateAccessControl(accessControlData, isAdmin);

    if (error) {
      $scope.state.formValidationError = error;
      return false;
    }
    return true;
  }

  function createContainerFromTemplate(template, userId, accessControlData) {
    var templateConfiguration = createTemplateConfiguration(template);
    var generatedVolumeCount = TemplateHelper.determineRequiredGeneratedVolumeCount(template.Volumes);
    var generatedVolumeIds = [];
    VolumeService.createXAutoGeneratedLocalVolumes(generatedVolumeCount)
    .then(function success(data) {
      var volumeResourceControlQueries = [];
      angular.forEach(data, function (volume) {
        var volumeId = volume.Id;
        generatedVolumeIds.push(volumeId);
      });
      TemplateService.updateContainerConfigurationWithVolumes(templateConfiguration, template, data);
      return ImageService.pullImage(template.Image, { URL: template.Registry }, true);
    })
    .then(function success(data) {
      return ContainerService.createAndStartContainer(templateConfiguration);
    })
    .then(function success(data) {
      var containerIdentifier = data.Id;
      return ResourceControlService.applyResourceControl('container', containerIdentifier, userId, accessControlData, generatedVolumeIds);
    })
    .then(function success() {
      Notifications.success('Container successfully created');
      $state.go('containers', {}, {reload: true});
    })
    .catch(function error(err) {
      Notifications.error('Failure', err, err.msg);
    })
    .finally(function final() {
      $('#createResourceSpinner').hide();
    });
  }

  function createStackFromTemplate(template, userId, accessControlData) {
    var stackName = $scope.formValues.name;

    for (var i = 0; i < template.Env.length; i++) {
      var envvar = template.Env[i];
      if (envvar.set) {
        envvar.value = envvar.set;
      }
    }

    StackService.createStackFromGitRepository(stackName, template.Repository.url, template.Repository.stackfile, template.Env)
    .then(function success() {
      Notifications.success('Stack successfully created');
    })
    .catch(function error(err) {
      Notifications.warning('Deployment error', err.err.data.err);
    })
    .then(function success(data) {
      return ResourceControlService.applyResourceControl('stack', stackName, userId, accessControlData, []);
    })
    .then(function success() {
      $state.go('stacks', {}, {reload: true});
    })
    .finally(function final() {
      $('#createResourceSpinner').hide();
    });
  }

  $scope.createTemplate = function() {
    $('#createResourceSpinner').show();

    var userDetails = Authentication.getUserDetails();
    var userId = userDetails.ID;
    var accessControlData = $scope.formValues.AccessControlData;
    var isAdmin = userDetails.role === 1 ? true : false;

    if (!validateForm(accessControlData, isAdmin)) {
      $('#createResourceSpinner').hide();
      return;
    }

    var template = $scope.state.selectedTemplate;
    var templatesKey = $scope.templatesKey;

    if (template.Type === 'stack') {
      createStackFromTemplate(template, userId, accessControlData);
    } else {
      createContainerFromTemplate(template, userId, accessControlData);
    }
  };

  $scope.unselectTemplate = function() {
    var currentTemplateIndex = $scope.state.selectedTemplate.index;
    $('#template_' + currentTemplateIndex).toggleClass('template-container--selected');
    $scope.state.selectedTemplate = null;
  };

  $scope.selectTemplate = function(index, pos) {
    if ($scope.state.selectedTemplate && $scope.state.selectedTemplate.index !== index) {
      $scope.unselectTemplate();
    }

    var templates = $filter('filter')($scope.templates, $scope.state.filters, true);
    var template = templates[pos];
    if (template === $scope.state.selectedTemplate) {
      $scope.unselectTemplate();
    } else {
      selectTemplate(index, pos, templates);
    }
  };

  function selectTemplate(index, pos, filteredTemplates) {
    $('#template_' + index).toggleClass('template-container--selected');
    var selectedTemplate = filteredTemplates[pos];
    $scope.state.selectedTemplate = selectedTemplate;

    if (selectedTemplate.Network) {
      $scope.formValues.network = _.find($scope.availableNetworks, function(o) { return o.Name === selectedTemplate.Network; });
    } else {
      $scope.formValues.network = _.find($scope.availableNetworks, function(o) { return o.Name === 'bridge'; });
    }

    $anchorScroll('view-top');
  }

  function createTemplateConfiguration(template) {
    var network = $scope.formValues.network;
    var name = $scope.formValues.name;
    var containerMapping = determineContainerMapping(network);
    return TemplateService.createTemplateConfiguration(template, name, network, containerMapping);
  }

  function determineContainerMapping(network) {
    var endpointProvider = $scope.applicationState.endpoint.mode.provider;
    var containerMapping = 'BY_CONTAINER_IP';
    if (endpointProvider === 'DOCKER_SWARM' && network.Scope === 'global') {
      containerMapping = 'BY_SWARM_CONTAINER_NAME';
    } else if (network.Name !== 'bridge') {
      containerMapping = 'BY_CONTAINER_NAME';
    }
    return containerMapping;
  }

  $scope.updateCategories = function(templates, type) {
    $scope.state.filters.Categories = '!';
    updateCategories(templates, type);
  };

  function updateCategories(templates, type) {
    var availableCategories = [];
    angular.forEach(templates, function(template) {
      if (template.Type === type) {
        availableCategories = availableCategories.concat(template.Categories);
      }
    });
    $scope.availableCategories = _.sortBy(_.uniq(availableCategories));
  }

  function initTemplates(templatesKey, type, provider, apiVersion) {
    $q.all({
      templates: TemplateService.getTemplates(templatesKey),
      containers: ContainerService.containers(0),
      volumes: VolumeService.getVolumes(),
      networks: NetworkService.networks(
        provider === 'DOCKER_STANDALONE' || provider === 'DOCKER_SWARM_MODE',
        false,
        provider === 'DOCKER_SWARM_MODE' && apiVersion >= 1.25,
        provider === 'DOCKER_SWARM'),
      settings: SettingsService.publicSettings()
    })
    .then(function success(data) {
      var templates =  data.templates;
      // var availableCategories = [];
      // angular.forEach($scope.templates, function(template) {
      //   availableCategories = availableCategories.concat(template.Categories);
      // });
      //
      // $scope.availableCategories = _.sortBy(_.uniq(availableCategories));
      updateCategories(templates, type);
      $scope.templates = templates;
      $scope.runningContainers = data.containers;
      $scope.availableVolumes = data.volumes.Volumes;
      var networks = data.networks;
      $scope.availableNetworks = networks;
      $scope.globalNetworkCount = networks.length;
      var settings = data.settings;
      $scope.allowBindMounts = settings.AllowBindMountsForRegularUsers;
    })
    .catch(function error(err) {
      $scope.templates = [];
      Notifications.error('Failure', err, 'An error occured during apps initialization.');
    })
    .finally(function final(){
      $('#loadingViewSpinner').hide();
    });
  }

  // function initStackTemplates(templatesKey) {
  //   TemplateService.getTemplates(templatesKey)
  //   .then(function success(data) {
  //     $scope.templates = data;
  //     var availableCategories = [];
  //     angular.forEach($scope.templates, function(template) {
  //       availableCategories = availableCategories.concat(template.Categories);
  //     });
  //     $scope.availableCategories = _.sortBy(_.uniq(availableCategories));
  //   })
  //   .catch(function error(err) {
  //     $scope.templates = [];
  //     Notifications.error('Failure', err, 'Unable to retrieve stack templates.');
  //   })
  //   .finally(function final(){
  //     $('#loadingViewSpinner').hide();
  //   });
  // }

  function initView() {
    var templatesKey = $transition$.params().key;
    $scope.templatesKey = templatesKey;

    var userDetails = Authentication.getUserDetails();
    $scope.isAdmin = userDetails.role === 1 ? true : false;

    var endpointMode = $scope.applicationState.endpoint.mode;
    var apiVersion = $scope.applicationState.endpoint.apiVersion;

    if (endpointMode.provider === 'DOCKER_SWARM_MODE' && endpointMode.role === 'MANAGER' && apiVersion >= 1.25) {
      $scope.state.filters.Type = 'stack';
      $scope.state.showDeploymentSelector = true;
    }
    // ng-if="applicationState.endpoint.apiVersion >= 1.25 && applicationState.endpoint.mode.provider === 'DOCKER_SWARM_MODE' && applicationState.endpoint.mode.role === 'MANAGER'"


    // if (templatesKey === 'stacks') {
    //   $scope.state.deployment = 'stack';
    //   initStackTemplates(templatesKey);
    // } else {
    //   initContainerTemplates(templatesKey);
    // }

    initTemplates(templatesKey, $scope.state.filters.Type, endpointMode.provider, apiVersion);
  }

  initView();
}]);
