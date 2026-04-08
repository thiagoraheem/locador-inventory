import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { DashboardSnapshot } from '../../../shared/dashboard-types';

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

const fetchDashboardData = async (
  inventoryContext?: UseDashboardPollingOptions['inventoryContext'],
): Promise<DashboardSnapshot> => {
  const inventoryId = inventoryContext?.id;
  if (!inventoryId) {
    throw new Error('Inventário não selecionado');
  }

  const res = await fetch(`/api/inventories/${inventoryId}/dashboard-snapshot`, {
    credentials: 'include',
  });

  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }

  return await res.json();
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
    queryKey: ['/api/inventories', inventoryContext?.id ?? 'default', 'dashboard-snapshot'],
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
