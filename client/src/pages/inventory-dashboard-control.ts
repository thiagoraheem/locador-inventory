export type DashboardControlState = {
  autoRefresh: boolean;
  demoMode: boolean;
  inventoryStatus: string | null;
  hasSelectedInventory: boolean;
};

export type DashboardControlAction =
  | { type: "select_inventory"; inventoryStatus: string | null; hasSelectedInventory: boolean }
  | { type: "toggle_auto_refresh"; value: boolean }
  | { type: "toggle_demo_mode"; value: boolean };

export const isClosedInventoryStatus = (status?: string | null) => {
  if (!status) return false;
  const normalizedStatus = status.toLowerCase();
  return (
    normalizedStatus === "closed" ||
    normalizedStatus === "cancelled" ||
    normalizedStatus.includes("closed") ||
    normalizedStatus.includes("completed")
  );
};

export const getInventoryLifecycleLabel = (status?: string | null) => {
  return isClosedInventoryStatus(status) ? "Fechado" : "Em Andamento";
};

export const resolveAutoRefresh = ({
  requestedAutoRefresh,
  demoMode,
  inventoryStatus,
}: {
  requestedAutoRefresh: boolean;
  demoMode: boolean;
  inventoryStatus?: string | null;
}) => {
  if (demoMode) return requestedAutoRefresh;
  if (isClosedInventoryStatus(inventoryStatus)) return false;
  return requestedAutoRefresh;
};

export const validateManualRefresh = ({
  demoMode,
  hasSelectedInventory,
  inventoryStatus,
}: {
  demoMode: boolean;
  hasSelectedInventory: boolean;
  inventoryStatus?: string | null;
}) => {
  if (demoMode) {
    return { allowed: false, reason: "demo_mode" as const };
  }
  if (!hasSelectedInventory) {
    return { allowed: false, reason: "missing_inventory" as const };
  }
  if (isClosedInventoryStatus(inventoryStatus)) {
    return { allowed: false, reason: "inventory_closed" as const };
  }
  return { allowed: true, reason: "ok" as const };
};

export const applyDashboardControlAction = (
  state: DashboardControlState,
  action: DashboardControlAction,
): DashboardControlState => {
  if (action.type === "select_inventory") {
    return {
      ...state,
      inventoryStatus: action.inventoryStatus,
      hasSelectedInventory: action.hasSelectedInventory,
      autoRefresh: resolveAutoRefresh({
        requestedAutoRefresh: state.autoRefresh,
        demoMode: state.demoMode,
        inventoryStatus: action.inventoryStatus,
      }),
    };
  }

  if (action.type === "toggle_auto_refresh") {
    return {
      ...state,
      autoRefresh: resolveAutoRefresh({
        requestedAutoRefresh: action.value,
        demoMode: state.demoMode,
        inventoryStatus: state.inventoryStatus,
      }),
    };
  }

  return {
    ...state,
    demoMode: action.value,
    autoRefresh: resolveAutoRefresh({
      requestedAutoRefresh: state.autoRefresh,
      demoMode: action.value,
      inventoryStatus: state.inventoryStatus,
    }),
  };
};
