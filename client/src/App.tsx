import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Products from "@/pages/products";
import Categories from "@/pages/categories";
import Locations from "@/pages/locations";
import Stock from "@/pages/stock";
import Inventories from "@/pages/inventories";
import InventoryCounting from "@/pages/inventory-counting";
import InventoryReview from "@/pages/inventory-review";
import InventoryControlBoard from "@/pages/inventory-control-board";
import InventoryAssetControl from "@/pages/inventory-asset-control";
import AuditLogs from "@/pages/audit-logs";
import Users from "@/pages/users";
import Companies from "@/pages/companies";
import StockItems from "@/pages/stock-items";
import MainLayout from "@/components/layout/main-layout";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={LoginPage} />
      ) : (
        <MainLayout>
          <Route path="/" component={Dashboard} />
          <Route path="/products" component={Products} />
          <Route path="/categories" component={Categories} />
          <Route path="/locations" component={Locations} />
          <Route path="/stock" component={Stock} />
          <Route path="/inventories" component={Inventories} />
          <Route path="/inventory-control-board" component={InventoryControlBoard} />
          <Route path="/inventory-review/:id" component={InventoryReview} />
          <Route path="/inventory-counting/:id" component={InventoryCounting} />
          <Route path="/inventory-assets/:id" component={InventoryAssetControl} />
          <Route path="/audit-logs" component={AuditLogs} />
          <Route path="/users" component={Users} />
          <Route path="/companies" component={Companies} />
          <Route path="/stock-items" component={StockItems} />
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