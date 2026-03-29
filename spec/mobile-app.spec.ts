export const mobileAppSpec = {
  actor: "courier",

  modules: [
    "auth",
    "servicios",
    "tracking",
    "evidencia",
    "liquidaciones"
  ],

  rules: {
    mustFollowServiceStateMachine: true,
    mustUseBackendAPI: true,
    mustHandleOfflineMode: true,
    mustBeMultiTenant: true
  }
};
