import angular from 'angular';
import _ from 'lodash-es';
import filesizeParser from 'filesize-parser';

class KubernetesClusterNodeController {
    /* @ngInject */
    constructor(
        $async,
        $state,
        $transition$,
        Notifications,
        KubernetesNodeService,
        KubernetesEventService,
        KubernetesPodService,
        KubernetesApplicationService
    ) {
        this.$async = $async;
        this.$state = $state;
        this.$transition$ = $transition$;
        this.Notifications = Notifications;
        this.KubernetesNodeService = KubernetesNodeService;
        this.KubernetesEventService = KubernetesEventService;
        this.KubernetesPodService = KubernetesPodService;
        this.KubernetesApplicationService = KubernetesApplicationService;

        this.onInit = this.onInit.bind(this);
        this.getNode = this.getNode.bind(this);
        this.getNodeAsync = this.getNodeAsync.bind(this);
        this.getEvents = this.getEvents.bind(this);
        this.getEventsAsync = this.getEventsAsync.bind(this);
        this.getPods = this.getPods.bind(this);
        this.getPodsAsync = this.getPodsAsync.bind(this);
        this.getApplications = this.getApplications.bind(this);
        this.getApplicationsAsync = this.getApplicationsAsync.bind(this);

        this.computeNodeStatus = this.computeNodeStatus.bind(this);
        this.computeMemoryUsage = this.computeMemoryUsage.bind(this);
        this.usageLevelInfo = this.usageLevelInfo.bind(this);
    }

    async getNodeAsync() {
        try {
            this.state.dataLoading = true;
            const nodeName = this.$transition$.params().name;
            this.node = await this.KubernetesNodeService.get(nodeName);
            this.computeNodeStatus();
        } catch (err) {
            this.Notifications.error(
                'Failure',
                err,
                'Unable to retrieve node'
            );
        } finally {
            this.state.dataLoading = false;
        }
    }

    getNode() {
        return this.$async(this.getNodeAsync);
    }

    async getEventsAsync() {
        try {
            this.state.eventsLoading = true;
            this.events = await this.KubernetesEventService.events(this.node.Name);
        } catch (err) {
            this.Notifications.error(
                'Failure',
                err,
                'Unable to retrieve node events'
            );
        } finally {
            this.state.eventsLoading = false;
        }
    }

    getEvents() {
        return this.$async(this.getEventsAsync);
    }

    async getPodsAsync() {
        try {
            this.state.podsLoading = true;
            const pods = await this.KubernetesPodService.pods();
            this.pods = _.filter(pods, pod => pod.Node === this.node.Name);
            this.computeMemoryUsage();
        } catch (err) {
            this.Notifications.error(
                'Failure',
                err,
                'Unable to retrieve pods'
            );
        } finally {
            this.state.podsLoading = false;
        }
    }

    getPods() {
        return this.$async(this.getPodsAsync);
    }

    async getApplicationsAsync() {
        try {
            this.state.applicationsLoading = true;
            const applications = await this.KubernetesApplicationService.applications();
            this.applications = _.filter(applications, (app) => {
                app.MemoryReservation = 0;
                app.CPUReservation = 0;
                return _.filter(this.pods, (pod) => {
                    if (_.startsWith(pod.Metadata.name, app.Name)) {
                        const usage = { Memory: 0, CPU: 0 };
                        let podUsage = _.reduce(pod.Containers, (acc, container) => {
                            if (container.resources && container.resources.requests) {
                                if (container.resources.requests.memory) {
                                    acc.Memory += filesizeParser(container.resources.requests.memory, { base: 10 });
                                }
                                if (container.resources.requests.cpu) {
                                    let cpu = parseInt(container.resources.requests.cpu);
                                    if (_.endsWith(container.resources.requests.cpu, 'm')) {
                                        cpu /= 1000;
                                    }
                                    acc.CPU += cpu;
                                }
                            }
                            return acc;
                        }, usage);

                        app.MemoryReservation += podUsage.Memory;
                        app.CPUReservation += podUsage.CPU;
                        return app;
                    }
                });
            })
        } catch (err) {
            this.Notifications.error(
                'Failure',
                err,
                'Unable to retrieve applications'
            );
        } finally {
            this.state.applicationsLoading = false;
        }
    }

    getApplications() {
        return this.$async(this.getApplicationsAsync);
    }

    async onInit() {
        this.state = {
            activeTab: 0,
            dataLoading: true,
            eventsLoading: true,
            podsLoading: true,
            applicationsLoading: true
        };

        this.getNode().then(() => {
            this.getEvents();
            this.getPods().then(() => {
                this.getApplications();
            });
        });
    }

    $onInit() {
        return this.$async(this.onInit);
    }

    computeNodeStatus() {
        this.NodeStatus = this.node.Status;
        if (this.NodeStatus !== 'Unhealthy') {
            _.forEach(this.node.Conditions, (condition) => {
                if (condition.type === 'MemoryPressure' && condition.status === true) {
                    this.NodeStatus = 'Warning';
                    this.NodeStatusMessage = 'Node memory is running low';
                }

                if (condition.type === 'PIDPressure' && condition.status === true) {
                    this.NodeStatus = 'Warning';
                    this.NodeStatusMessage = 'Too many processes running on the node';
                }

                if (condition.type === 'DiskPressure' && condition.status === true) {
                    this.NodeStatus = 'Warning';
                    this.NodeStatusMessage = 'Node disk capacity is running low';
                }

                if (condition.type === 'NetworkUnavailable' && condition.status === true) {
                    this.NodeStatus = 'Warning';
                    this.NodeStatusMessage = 'Incorrect node network configuration';
                }
            });
        }
    }

    computeMemoryUsage() {
        const reservation = { Memory: 0, CPU: 0 };

        this.Reservation = _.reduce(this.pods, (acc, pod) => {
            const reservation = { Memory: 0, CPU: 0 };
            let podReservation = _.reduce(pod.Containers, (acc, container) => {
                if (container.resources && container.resources.requests) {
                    if (container.resources.requests.memory) {
                        acc.Memory += filesizeParser(container.resources.requests.memory, { base: 10 });
                    }
                    if (container.resources.requests.cpu) {
                        let cpu = parseInt(container.resources.requests.cpu);
                        if (_.endsWith(container.resources.requests.cpu, 'm')) {
                            cpu /= 1000;
                        }
                        acc.CPU += cpu;
                    }
                }
                return acc;
            }, reservation);

            acc.Memory += podReservation.Memory;
            acc.CPU += podReservation.CPU;
            return acc;
        }, reservation);

        this.Limits = {
            Memory: filesizeParser(this.node.Memory),
            CPU: this.node.CPU
        };

        this.Usage = {
            Memory: 0,
            CPU: 0
        };

        if (this.Limits.CPU && this.Limits.Memory) {
            this.Usage.Memory = this.Reservation.Memory / this.Limits.Memory * 100;
            this.Usage.CPU = this.Reservation.CPU / this.Limits.CPU * 100;
        }
    }

    usageLevelInfo(usage) {
        if (usage >= 80) {
            return 'danger';
        } else if (usage > 50 && usage < 80) {
            return 'warning';
        } else {
            return 'success';
        }
    }
}

export default KubernetesClusterNodeController;
angular.module(
    'portainer.kubernetes'
).controller(
    'KubernetesClusterNodeController',
    KubernetesClusterNodeController
);