import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(url: string, method: string = "GET", data?: unknown): Promise<unknown> {
  console.log('DEBUG: apiRequest called with:', { url, method, data });
  
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  console.log('DEBUG: Response received:', {
    status: res.status,
    statusText: res.statusText,
    ok: res.ok,
    headers: Object.fromEntries(res.headers.entries())
  });

  await throwIfResNotOk(res);
  
  // Check if response has content
  const contentLength = res.headers.get('content-length');
  const contentType = res.headers.get('content-type');
  
  console.log('DEBUG: Content info:', { contentLength, contentType });
  
  // If no content or content-length is 0, return empty object
  if (contentLength === '0' || !contentType?.includes('application/json')) {
    console.log('DEBUG: No JSON content to parse, returning empty object');
    return {};
  }
  
  // Clone response to read text for debugging
  const responseClone = res.clone();
  const responseText = await responseClone.text();
  console.log('DEBUG: Response text:', responseText);
  
  // If response text is empty, return empty object
  if (!responseText.trim()) {
    console.log('DEBUG: Empty response text, returning empty object');
    return {};
  }
  
  try {
    const jsonResult = await res.json();
    console.log('DEBUG: JSON parsed successfully:', jsonResult);
    return jsonResult;
  } catch (jsonError) {
    console.error('DEBUG: Failed to parse JSON response:', {
      error: jsonError,
      responseText,
      status: res.status,
      headers: Object.fromEntries(res.headers.entries())
    });
    // Failed to parse JSON response
    // Response status and headers logged
    throw new Error('Invalid JSON response from server');
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});