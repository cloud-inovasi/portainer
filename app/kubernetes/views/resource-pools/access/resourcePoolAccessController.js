import angular from 'angular';
import _ from 'lodash-es';

// import { TeamAccessViewModel, UserAccessViewModel } from 'Portainer/models/access';

class KubernetesResourcePoolAccessController {
  /* @ngInject */
  constructor($async, $state, $transition$, Notifications, KubernetesResourcePoolService, KubernetesServiceAccountService, EndpointProvider, EndpointService, GroupService, AccessService,
    TeamService, KubernetesRoleBindingService) {
    this.$async = $async;
    this.$state = $state;
    this.$transition$ = $transition$;
    this.Notifications = Notifications;
    this.KubernetesResourcePoolService = KubernetesResourcePoolService;
    this.KubernetesRoleBindingService = KubernetesRoleBindingService;
    this.KubernetesServiceAccountService = KubernetesServiceAccountService;

    this.EndpointProvider = EndpointProvider;
    this.EndpointService = EndpointService;
    this.GroupService = GroupService;
    this.AccessService = AccessService;
    this.TeamService = TeamService;

    this.onInit = this.onInit.bind(this);
    this.authorizeAccessAsync = this.authorizeAccessAsync.bind(this);
    this.unauthorizeAccessAsync = this.unauthorizeAccessAsync.bind(this);

    this.unauthorizeAccess = this.unauthorizeAccess.bind(this);
  }

  /**
   * Init
   */
  // TODO: refactor: roles need to be fetched if RBAC is activated on Portainer
  // see porAccessManagementController for more details
  // Extract the fetching code and merge it in AccessService.accesses() function
  async onInit() {
    this.state = {actionInProgress: false};
    this.formValues = {multiselectOutput: []};
    try {
      const name = this.$transition$.params().id;
      const [endpoint, pool, roleBinding] = await Promise.all([
        this.EndpointService.endpoint(this.EndpointProvider.endpointID()),
        this.KubernetesResourcePoolService.resourcePool(name),
        this.KubernetesRoleBindingService.get(name)
      ]);
      const group = await this.GroupService.group(endpoint.GroupId);
      const roles = [];
      const accesses = await this.AccessService.accesses(endpoint, group, roles);
      this.pool = pool;

      this.authorizedUsersAndTeams = _.filter(accesses.authorizedUsersAndTeams,
        (item) => _.find(roleBinding.AuthorizedUsersAndTeams, (user) => item.Id === user.UID));
      this.availableUsersAndTeams = _.without(accesses.authorizedUsersAndTeams, ...this.authorizedUsersAndTeams);
    } catch (err) {
      this.Notifications.error("Failure", err, "Unable to retrieve resource pool information");
    }
  }

  $onInit() {
    return this.$async(this.onInit);
  }

  /**
   * Authorize access
   */
  async authorizeAccessAsync() {
    try {
      this.state.actionInProgress = true;
      const newAccesses = _.concat(this.authorizedUsersAndTeams, this.formValues.multiselectOutput);
      await this.KubernetesRoleBindingService.update(this.pool.Namespace.Name, newAccesses)
      this.Notifications.success("Access successfully created");
      this.$state.reload();
    } catch (err) {
      this.Notifications.error("Failure", err, "Unable to create accesses");
    }
  }

  authorizeAccess() {
    return this.$async(this.authorizeAccessAsync)
  }

  /**
   * 
   */
  async unauthorizeAccessAsync(selectedItems) {
    try {
      this.state.actionInProgress = true;
      const newAccesses = _.without(this.authorizedUsersAndTeams, ...selectedItems);
      await this.KubernetesRoleBindingService.update(this.pool.Namespace.Name, newAccesses)
      this.Notifications.success("Access successfully removed");
      this.$state.reload();
    } catch (err) {
      this.Notifications.error("Failure", err, "Unable to remove accesses");
    } finally {
      this.state.actionInProgress = false;
    }
  }

  unauthorizeAccess(selectedItems) {
    return this.$async(this.unauthorizeAccessAsync, selectedItems);
  }

}

export default KubernetesResourcePoolAccessController;
angular
  .module("portainer.kubernetes")
  .controller("KubernetesResourcePoolAccessController", KubernetesResourcePoolAccessController);
