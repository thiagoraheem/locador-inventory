import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Products from "@/pages/products";
import Locations from "@/pages/locations";
import Stock from "@/pages/stock";
import Inventories from "@/pages/inventories";
import InventoryCounting from "@/pages/inventory-counting";
import InventoryReview from "@/pages/inventory-review";
import AuditLogs from "@/pages/audit-logs";
import MainLayout from "@/components/layout/main-layout";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <MainLayout>
          <Route path="/" component={Dashboard} />
          <Route path="/products" component={Products} />
          <Route path="/locations" component={Locations} />
          <Route path="/stock" component={Stock} />
          <Route path="/inventories" component={Inventories} />
          <Route path="/inventory-counting/:id" component={InventoryCounting} />
          <Route path="/inventory-review/:id" component={InventoryReview} />
          <Route path="/audit-logs" component={AuditLogs} />
        </MainLayout>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
