import { actionCatalog, roleCatalog } from "./pgr-data";
import type { PgrState } from "./pgr-types";

export function getSelectedRoles(state: PgrState) {
  return roleCatalog
    .filter((role) => state.roles[role.id]?.selected && state.roles[role.id].quantity > 0)
    .map((role) => ({ ...role, quantity: state.roles[role.id].quantity }));
}

export function getIncludedActions(state: PgrState) {
  return actionCatalog.filter((action) => {
    const setting = state.actions[action.id];
    if (setting) return setting.included;
    return !action.condition || Boolean(state.scenarios[action.condition]);
  });
}
