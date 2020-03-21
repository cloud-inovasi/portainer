import { rawResponse } from 'Kubernetes/rest/response/transform';

angular.module('portainer.kubernetes')
  .factory('KubernetesNodes', ['$resource', 'API_ENDPOINT_ENDPOINTS', 'EndpointProvider',
    function KubernetesNodesFactory($resource, API_ENDPOINT_ENDPOINTS, EndpointProvider) {
      'use strict';
      return function () {
        const url = API_ENDPOINT_ENDPOINTS + '/:endpointId/kubernetes/api/v1/nodes/:id/:action';
        return $resource(url,
          {
            endpointId: EndpointProvider.endpointID,
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