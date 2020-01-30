package factory

import (
	"fmt"
	"net/http"
	"net/url"

	"github.com/portainer/portainer/api/http/proxy/factory/kubernetes"

	portainer "github.com/portainer/portainer/api"
	"github.com/portainer/portainer/api/crypto"
)

func (factory *ProxyFactory) newKubernetesProxy(endpoint *portainer.Endpoint) (http.Handler, error) {
	switch endpoint.Type {
	case portainer.KubernetesLocalEnvironment:
		return factory.newKubernetesLocalProxy(endpoint)
	case portainer.EdgeAgentOnKubernetesEnvironment:
		return factory.newKubernetesEdgeHTTPProxy(endpoint)
	}

	return factory.newKubernetesAgentHTTPSProxy(endpoint)
}

func (factory *ProxyFactory) newKubernetesLocalProxy(endpoint *portainer.Endpoint) (http.Handler, error) {
	remoteURL, err := url.Parse(endpoint.URL)
	if err != nil {
		return nil, err
	}

	kubecli, err := factory.kubernetesClientFactory.CreateKubeClient(endpoint)
	if err != nil {
		return nil, err
	}

	transport, err := kubernetes.NewLocalTransport(kubecli, factory.teamMembershipService)
	if err != nil {
		return nil, err
	}

	proxy := newSingleHostReverseProxyWithHostHeader(remoteURL)
	proxy.Transport = transport

	return proxy, nil
}

func (factory *ProxyFactory) newKubernetesEdgeHTTPProxy(endpoint *portainer.Endpoint) (http.Handler, error) {
	tunnel := factory.reverseTunnelService.GetTunnelDetails(endpoint.ID)
	endpoint.URL = fmt.Sprintf("http://localhost:%d", tunnel.Port)

	endpointURL, err := url.Parse(endpoint.URL)
	if err != nil {
		return nil, err
	}

	kubecli, err := factory.kubernetesClientFactory.CreateKubeClient(endpoint)
	if err != nil {
		return nil, err
	}

	endpointURL.Scheme = "http"
	proxy := newSingleHostReverseProxyWithHostHeader(endpointURL)
	proxy.Transport = kubernetes.NewEdgeTransport(factory.reverseTunnelService, endpoint.ID, kubecli)

	return proxy, nil
}

func (factory *ProxyFactory) newKubernetesAgentHTTPSProxy(endpoint *portainer.Endpoint) (http.Handler, error) {
	endpointURL := fmt.Sprintf("https://%s", endpoint.URL)
	remoteURL, err := url.Parse(endpointURL)
	if err != nil {
		return nil, err
	}

	remoteURL.Scheme = "https"

	kubecli, err := factory.kubernetesClientFactory.CreateKubeClient(endpoint)
	if err != nil {
		return nil, err
	}

	tlsConfig, err := crypto.CreateTLSConfigurationFromDisk(endpoint.TLSConfig.TLSCACertPath, endpoint.TLSConfig.TLSCertPath, endpoint.TLSConfig.TLSKeyPath, endpoint.TLSConfig.TLSSkipVerify)
	if err != nil {
		return nil, err
	}

	proxy := newSingleHostReverseProxyWithHostHeader(remoteURL)
	proxy.Transport = kubernetes.NewAgentTransport(factory.signatureService, tlsConfig, kubecli)

	return proxy, nil
}