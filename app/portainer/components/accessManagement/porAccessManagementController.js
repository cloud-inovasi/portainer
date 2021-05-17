import _ from 'lodash-es';

import angular from 'angular';
import { TeamAccessViewModel, UserAccessViewModel } from 'Portainer/models/access';

class PorAccessManagementController {
  /* @ngInject */
  constructor(Notifications, AccessService) {
    this.Notifications = Notifications;
    this.AccessService = AccessService;

    this.unauthorizeAccess = this.unauthorizeAccess.bind(this);
    this.updateAction = this.updateAction.bind(this);
  }

  updateAction() {
    const entity = this.accessControlledEntity;
    const oldUserAccessPolicies = entity.UserAccessPolicies;
    const oldTeamAccessPolicies = entity.TeamAccessPolicies;
    const updatedUserAccesses = _.filter(this.authorizedUsersAndTeams, { Updated: true, Type: 'user', Inherited: false });
    const updatedTeamAccesses = _.filter(this.authorizedUsersAndTeams, { Updated: true, Type: 'team', Inherited: false });

    const accessPolicies = this.AccessService.generateAccessPolicies(oldUserAccessPolicies, oldTeamAccessPolicies, updatedUserAccesses, updatedTeamAccesses);
    this.accessControlledEntity.UserAccessPolicies = accessPolicies.userAccessPolicies;
    this.accessControlledEntity.TeamAccessPolicies = accessPolicies.teamAccessPolicies;
    this.updateAccess();
  }

  authorizeAccess() {
    const entity = this.accessControlledEntity;
    const oldUserAccessPolicies = entity.UserAccessPolicies;
    const oldTeamAccessPolicies = entity.TeamAccessPolicies;
    const selectedUserAccesses = _.filter(this.formValues.multiselectOutput, (access) => access.Type === 'user');
    const selectedTeamAccesses = _.filter(this.formValues.multiselectOutput, (access) => access.Type === 'team');

    const accessPolicies = this.AccessService.generateAccessPolicies(oldUserAccessPolicies, oldTeamAccessPolicies, selectedUserAccesses, selectedTeamAccesses, 0);
    this.accessControlledEntity.UserAccessPolicies = accessPolicies.userAccessPolicies;
    this.accessControlledEntity.TeamAccessPolicies = accessPolicies.teamAccessPolicies;
    this.updateAccess();
  }

  unauthorizeAccess(selectedAccesses) {
    const entity = this.accessControlledEntity;
    const userAccessPolicies = entity.UserAccessPolicies;
    const teamAccessPolicies = entity.TeamAccessPolicies;
    const selectedUserAccesses = _.filter(selectedAccesses, (access) => access.Type === 'user');
    const selectedTeamAccesses = _.filter(selectedAccesses, (access) => access.Type === 'team');
    _.forEach(selectedUserAccesses, (access) => delete userAccessPolicies[access.Id]);
    _.forEach(selectedTeamAccesses, (access) => delete teamAccessPolicies[access.Id]);
    this.updateAccess();
  }

  async $onInit() {
    try {
      const entity = this.accessControlledEntity;
      const parent = this.inheritFrom;

      const data = await this.AccessService.accesses(entity, parent, this.roles);
      if (this.entityType === 'registry' && this.endpoint) {
        const endpointUsers = this.endpoint.UserAccessPolicies;
        const endpointTeams = this.endpoint.TeamAccessPolicies;
        data.availableUsersAndTeams = _.filter(data.availableUsersAndTeams, (userOrTeam) => {
          const userRole = userOrTeam instanceof UserAccessViewModel && endpointUsers[userOrTeam.Id];
          const teamRole = userOrTeam instanceof TeamAccessViewModel && endpointTeams[userOrTeam.Id];
          if (!userRole && !teamRole) {
            return false;
          }
          const roleId = (userRole && userRole.RoleId) || (teamRole && teamRole.RoleId);
          const role = _.find(this.roles, { Id: roleId });
          return role && (role.Authorizations['DockerImageCreate'] || role.Authorizations['DockerImagePush']) && !role.Authorizations['EndpointResourcesAccess'];
        });
      }
      this.availableUsersAndTeams = _.orderBy(data.availableUsersAndTeams, 'Name', 'asc');
      this.authorizedUsersAndTeams = data.authorizedUsersAndTeams;
    } catch (err) {
      this.availableUsersAndTeams = [];
      this.authorizedUsersAndTeams = [];
      this.Notifications.error('Failure', err, 'Unable to retrieve accesses');
    }
  }
}

export default PorAccessManagementController;
angular.module('portainer.app').controller('porAccessManagementController', PorAccessManagementController);
