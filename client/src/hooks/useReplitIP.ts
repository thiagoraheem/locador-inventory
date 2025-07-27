
import { useQuery } from "@tanstack/react-query";

export function useReplitIP() {
  return useQuery({
    queryKey: ['/api/check-ip'],
    queryFn: async () => {
      const response = await fetch('/api/check-ip');
      if (!response.ok) {
        throw new Error('Failed to fetch IP');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });
}
