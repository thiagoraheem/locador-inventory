import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { DashboardSnapshot } from '../../../shared/dashboard-types';
import { mockDashboardData } from '../data/mockDashboardData';

interface UseDashboardPollingOptions {
  enabled?: boolean;
  pollingInterval?: number; // em milissegundos
  onError?: (error: Error) => void;
  onSuccess?: (data: DashboardSnapshot) => void;
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

// Função simulada para buscar dados do dashboard
// TODO: Substituir por chamada real à API quando o endpoint estiver disponível
const fetchDashboardData = async (): Promise<DashboardSnapshot> => {
  // Simula delay de rede
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
  
  // Simula possível erro de rede (5% de chance)
  if (Math.random() < 0.05) {
    throw new Error('Erro de conexão com o servidor');
  }
  
  // Retorna dados mock com pequenas variações para simular dados em tempo real
  const baseData = mockDashboardData;
  const variation = () => Math.random() * 0.1 - 0.05; // ±5% de variação
  
  return {
    ...baseData,
    totals: {
      ...baseData.totals,
      itemsPlanned: Math.max(0, Math.floor(baseData.totals.itemsPlanned * (1 + variation()))),
      itemsCounted: Math.max(0, Math.floor(baseData.totals.itemsCounted * (1 + variation()))),
      progressPct: Math.min(100, Math.max(0, baseData.totals.progressPct + variation() * 10)),
      accuracyPct: Math.min(100, Math.max(0, baseData.totals.accuracyPct + variation() * 5)),
      divergenceValueBRL: Math.max(0, baseData.totals.divergenceValueBRL * (1 + variation())),
    },
    pendingVsDone: {
      ...baseData.pendingVsDone,
      pending: Math.max(0, Math.floor(baseData.pendingVsDone.pending * (1 + variation()))),
      done: Math.max(0, Math.floor(baseData.pendingVsDone.done * (1 + variation()))),
    },
    snapshotAt: new Date().toISOString(),
  };
};

export const useDashboardPolling = ({
  enabled = true,
  pollingInterval = 30000, // 30 segundos por padrão
  onError,
  onSuccess,
}: UseDashboardPollingOptions = {}): UseDashboardPollingReturn => {
  const lastUpdatedRef = useRef<Date | null>(null);
  const isPollingRef = useRef(false);

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['dashboard-data'],
    queryFn: fetchDashboardData,
    enabled,
    refetchInterval: isPollingRef.current ? pollingInterval : false,
    refetchIntervalInBackground: true,
    staleTime: pollingInterval / 2, // Considera dados obsoletos após metade do intervalo
    onSuccess: (data) => {
      lastUpdatedRef.current = new Date();
      onSuccess?.(data);
    },
    onError: (error) => {
      onError?.(error as Error);
    },
  });

  const startPolling = () => {
    isPollingRef.current = true;
  };

  const stopPolling = () => {
    isPollingRef.current = false;
  };

  // Inicia o polling automaticamente se habilitado
  useEffect(() => {
    if (enabled) {
      startPolling();
    } else {
      stopPolling();
    }
  }, [enabled]);

  // Cleanup ao desmontar o componente
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  return {
    data,
    isLoading,
    error: error as Error | null,
    refetch,
    lastUpdated: lastUpdatedRef.current,
    isPolling: isPollingRef.current,
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