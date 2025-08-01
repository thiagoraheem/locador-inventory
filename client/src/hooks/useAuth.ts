import { useQuery } from "@tanstack/react-query";

interface AuthUser {
  id: number;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
}

/**
 * React hook that retrieves the current authenticated user from the backend
 * and returns basic auth-related state that the app relies on.
 */
export function useAuth() {
  const {
    data: user,
    isLoading,
    isError,
  } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
    // Do not retry on 401, just return null so UI can redirect to login
    queryFn: async () => {
      const res = await fetch("/api/auth/user", { credentials: "include" });
      if (res.status === 401) {
        return null;
      }
      if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        throw new Error(text);
      }
      return (await res.json()) as AuthUser;
    },
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return {
    user,
    isAuthenticated: Boolean(user),
    isLoading: isLoading && !isError,
    isError,
  } as const;
}
