import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { DashboardSnapshot } from '../../../shared/dashboard-types';

interface UseProcessDashboardOptions {
  enabled?: boolean;
  pollingInterval?: number;
  onError?: (error: Error) => void;
  onSuccess?: (data: DashboardSnapshot) => void;
  dateRange: {
    startDate: Date | null;
    endDate: Date | null;
  };
}

interface UseProcessDashboardReturn {
  data: DashboardSnapshot | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  lastUpdated: Date | null;
  isPolling: boolean;
  startPolling: () => void;
  stopPolling: () => void;
}

const fetchProcessDashboardData = async (
  dateRange: UseProcessDashboardOptions['dateRange']
): Promise<DashboardSnapshot> => {
  if (!dateRange.startDate || !dateRange.endDate) {
    throw new Error('Período não definido');
  }

  const queryParams = new URLSearchParams({
    startDate: dateRange.startDate.toISOString(),
    endDate: dateRange.endDate.toISOString(),
  });

  const res = await fetch(`/api/process-dashboard-snapshot?${queryParams.toString()}`, {
    credentials: 'include',
  });

  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }

  return await res.json();
};

export const useProcessDashboard = ({
  enabled = true,
  pollingInterval = 30000,
  onError,
  onSuccess,
  dateRange,
}: UseProcessDashboardOptions): UseProcessDashboardReturn => {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const isValidRange = dateRange.startDate !== null && dateRange.endDate !== null;

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      '/api/process-dashboard-snapshot',
      dateRange.startDate?.toISOString(),
      dateRange.endDate?.toISOString()
    ],
    queryFn: () => fetchProcessDashboardData(dateRange),
    enabled: enabled && isValidRange,
    refetchInterval: enabled && isPolling && isValidRange ? pollingInterval : false,
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
    if (enabled && isValidRange) {
      startPolling();
    } else {
      stopPolling();
    }
  }, [enabled, isValidRange]);

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
