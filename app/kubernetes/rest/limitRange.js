angular.module('portainer.kubernetes')
.factory('KubernetesLimitRanges', ['$resource', 'API_ENDPOINT_ENDPOINTS', 'EndpointProvider',
  function KubernetesLimitRangesFactory($resource, API_ENDPOINT_ENDPOINTS, EndpointProvider) {
    'use strict';
    return $resource(API_ENDPOINT_ENDPOINTS + '/:endpointId/kubernetes/api/v1/namespaces/:namespace/limitranges/:id/:action',
      {
        endpointId: EndpointProvider.endpointID
      },
      {
        query: { method: 'GET', timeout: 15000 },
        create: { method: 'POST', params: { namespace: '@metadata.namespace' } },
        delete: { method: 'DELETE'}
      });
  }]);