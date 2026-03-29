import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { DashboardSnapshot } from '../../../shared/dashboard-types';
import { mockDashboardData } from '../data/mockDashboardData';

interface UseDashboardPollingOptions {
  enabled?: boolean;
  pollingInterval?: number;
  onError?: (error: Error) => void;
  onSuccess?: (data: DashboardSnapshot) => void;
  inventoryContext?: {
    id?: number | null;
    code?: string | null;
    status?: string | null;
  };
}

interface UseDashboardPollingReturn {
  data: DashboardSnapshot | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  lastUpdated: Date | null;
  isPolling: boolean;
  startPolling: () => void;
  stopPolling: () => void;
}

const isClosedInventoryStatus = (status?: string | null) => {
  if (!status) return false;
  const normalizedStatus = status.toLowerCase();
  return (
    normalizedStatus === 'closed' ||
    normalizedStatus === 'cancelled' ||
    normalizedStatus.includes('closed') ||
    normalizedStatus.includes('completed')
  );
};

const fetchDashboardData = async (
  inventoryContext?: UseDashboardPollingOptions['inventoryContext'],
): Promise<DashboardSnapshot> => {
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

  if (Math.random() < 0.05) {
    throw new Error('Erro de conexão com o servidor');
  }

  const baseData = mockDashboardData;
  const seed = Math.max(0, Number(inventoryContext?.id ?? baseData.inventoryId ?? 0));
  const variation = () => Math.random() * 0.1 - 0.05;
  const selectedStatus = inventoryContext?.status || baseData.inventoryStatus;
  const selectedCode = inventoryContext?.code?.trim()
    ? inventoryContext.code.trim()
    : `${baseData.inventoryCode}-${seed || 1}`;
  const isClosed = isClosedInventoryStatus(selectedStatus);
  const plannedItems = Math.max(1, Math.floor(baseData.totals.itemsPlanned * (1 + ((seed % 7) - 3) * 0.03)));
  const countedForOpen = Math.max(0, Math.floor(plannedItems * (0.55 + (seed % 35) / 100)));
  const countedForClosed = plannedItems;
  const countedItems = isClosed ? countedForClosed : Math.min(plannedItems, countedForOpen);
  const pendingItems = Math.max(0, plannedItems - countedItems);
  const doneItems = Math.max(0, countedItems - Math.floor((seed % 9) * 0.5));

  return {
    ...baseData,
    inventoryId: seed || baseData.inventoryId,
    inventoryCode: selectedCode,
    inventoryStatus: (selectedStatus || baseData.inventoryStatus) as DashboardSnapshot['inventoryStatus'],
    totals: {
      ...baseData.totals,
      itemsPlanned: plannedItems,
      itemsCounted: countedItems,
      progressPct: plannedItems > 0 ? Number(((countedItems / plannedItems) * 100).toFixed(1)) : 0,
      accuracyPct: isClosed
        ? Math.min(100, Math.max(0, baseData.totals.accuracyPct + 1.5))
        : Math.min(100, Math.max(0, baseData.totals.accuracyPct + variation() * 5)),
      divergenceValueBRL: Math.max(0, baseData.totals.divergenceValueBRL * (1 + variation())),
    },
    pendingVsDone: {
      ...baseData.pendingVsDone,
      pending: pendingItems,
      done: doneItems,
      inProgress: Math.max(0, countedItems - doneItems),
    },
    snapshotAt: new Date().toISOString(),
  };
};

export const useDashboardPolling = ({
  enabled = true,
  pollingInterval = 30000, // 30 segundos por padrão
  onError,
  onSuccess,
  inventoryContext,
}: UseDashboardPollingOptions = {}): UseDashboardPollingReturn => {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['dashboard-data', inventoryContext?.id ?? 'default'],
    queryFn: () => fetchDashboardData(inventoryContext),
    enabled,
    refetchInterval: enabled && isPolling ? pollingInterval : false,
    refetchIntervalInBackground: true,
    staleTime: pollingInterval / 2,
    onSuccess: (data) => {
      setLastUpdated(new Date());
      onSuccess?.(data);
    },
    onError: (error) => {
      onError?.(error as Error);
    },
  });

  const startPolling = () => {
    setIsPolling(true);
  };

  const stopPolling = () => {
    setIsPolling(false);
  };

  useEffect(() => {
    if (enabled) {
      startPolling();
    } else {
      stopPolling();
    }
  }, [enabled]);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  return {
    data,
    isLoading,
    error: error as Error | null,
    refetch: () => {
      void refetch();
    },
    lastUpdated,
    isPolling,
    startPolling,
    stopPolling,
  };
};

// Hook auxiliar para controle manual do polling
export const useDashboardPollingControl = () => {
  const pollingRef = useRef<{
    start: () => void;
    stop: () => void;
    isPolling: boolean;
  } | null>(null);

  const registerPollingControl = (control: {
    start: () => void;
    stop: () => void;
    isPolling: boolean;
  }) => {
    pollingRef.current = control;
  };

  const startPolling = () => {
    pollingRef.current?.start();
  };

  const stopPolling = () => {
    pollingRef.current?.stop();
  };

  const isPolling = pollingRef.current?.isPolling ?? false;

  return {
    registerPollingControl,
    startPolling,
    stopPolling,
    isPolling,
  };
};

// Hook para detectar quando o usuário está ativo/inativo
export const useUserActivity = (inactiveThreshold = 300000) => { // 5 minutos
  const lastActivityRef = useRef(Date.now());
  const isActiveRef = useRef(true);

  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
      isActiveRef.current = true;
    };

    const checkActivity = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;
      isActiveRef.current = timeSinceLastActivity < inactiveThreshold;
    };

    // Eventos que indicam atividade do usuário
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Verifica atividade a cada minuto
    const interval = setInterval(checkActivity, 60000);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
      clearInterval(interval);
    };
  }, [inactiveThreshold]);

  return {
    isActive: isActiveRef.current,
    lastActivity: lastActivityRef.current,
  };
};
