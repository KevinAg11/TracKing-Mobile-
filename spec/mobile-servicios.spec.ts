export const mobileServiciosSpec = {

  actions: [
    "acceptService",
    "startService",
    "markInTransit",
    "completeService"
  ],

  constraints: {
    mustFollowStateMachine: true,
    mustValidateCurrentState: true
  },

  ui: {
    mustShowStatus: true,
    mustShowRoute: true
  }

};
