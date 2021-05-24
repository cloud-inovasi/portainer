package dockerhub

import (
	"net/http"

	"github.com/gorilla/mux"
	httperror "github.com/portainer/libhttp/error"
	portainer "github.com/portainer/portainer/api"
	"github.com/portainer/portainer/api/http/security"
)

func hideFields(dockerHub *portainer.DockerHub) {
	dockerHub.Password = ""
}

// Handler is the HTTP handler used to handle DockerHub operations.
type Handler struct {
	*mux.Router
	DataStore         portainer.DataStore
	UserActivityStore portainer.UserActivityStore
}

// NewHandler creates a handler to manage Dockerhub operations.
func NewHandler(bouncer *security.RequestBouncer) *Handler {
	h := &Handler{
		Router: mux.NewRouter(),
	}
	h.Handle("/dockerhub",
		bouncer.RestrictedAccess(httperror.LoggerHandler(h.dockerhubInspect))).Methods(http.MethodGet)
	h.Handle("/dockerhub",
		bouncer.AdminAccess(httperror.LoggerHandler(h.dockerhubUpdate))).Methods(http.MethodPut)

	return h
}