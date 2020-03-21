import { rawResponse } from 'Kubernetes/rest/response/transform';

angular.module('portainer.kubernetes')
.factory('KubernetesDaemonSets', ['$resource', 'API_ENDPOINT_ENDPOINTS', 'EndpointProvider',
  function KubernetesDaemonSetsFactory($resource, API_ENDPOINT_ENDPOINTS, EndpointProvider) {
    'use strict';
    return function (namespace) {
      const url = API_ENDPOINT_ENDPOINTS + '/:endpointId/kubernetes/apis/apps/v1'
        + (namespace ? '/namespaces/:namespace' : '') + '/daemonsets/:id/:action';
      return $resource(url,
        {
          endpointId: EndpointProvider.endpointID,
          namespace: namespace
        },
        {
          get: { method: 'GET', timeout: 15000 },
          getYaml: {
            method: 'GET',
            headers: {
              'Accept': 'application/yaml'
            },
            transformResponse: rawResponse
          },
          create: { method: 'POST' },
          update: { method: 'PUT' },
          delete: { method: 'DELETE' }
        }
      );
    };
  }
]);