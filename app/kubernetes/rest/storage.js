import { rawResponse } from 'Kubernetes/rest/response/transform';

angular.module('portainer.kubernetes')
  .factory('KubernetesStorage', ['$resource', 'API_ENDPOINT_ENDPOINTS', 'EndpointProvider',
    function KubernetesStorageFactory($resource, API_ENDPOINT_ENDPOINTS, EndpointProvider) {
      'use strict';
      return function () {
        const url = API_ENDPOINT_ENDPOINTS + '/:endpointId/kubernetes/apis/storage.k8s.io/v1/storageclasses/:id/:action';
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