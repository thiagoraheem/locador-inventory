import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { SelectedInventoryProvider } from "@/contexts/SelectedInventoryContext";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Products from "@/pages/products";
import Categories from "@/pages/categories";
import Locations from "@/pages/locations";
import Stock from "@/pages/stock";
import Inventories from "@/pages/inventories";
import InventoryCounting from "@/pages/inventory-counting";
import InventoryCounts from "@/pages/inventory-counts";
import MobileCounting from "@/pages/mobile-counting";
import InventoryReview from "@/pages/inventory-review";
import InventoryControlBoard from "@/pages/inventory-control-board";
import InventoryControlBoardCP from "@/pages/inventory-control-board-cp";
import InventoryAssetControl from "@/pages/inventory-asset-control";
import ProductListingReport from "@/pages/product-listing-report";
import InventoryDashboardPage from "@/pages/inventory-dashboard";
import AuditLogs from "@/pages/audit-logs";
import Users from "@/pages/users";
import Companies from "@/pages/companies";
import StockItems from "@/pages/stock-items";
import ParametersRules from "@/pages/parameters-rules";
import InventoryTestSuite from "@/pages/inventory-test-suite";
import InventoryFinalReport from "@/pages/inventory-final-report";
import InventoryTestValidation from "@/pages/inventory-test-validation";
import InventoryDetails from "@/pages/inventory-details";
import ApiTests from "@/pages/api-tests";
import MainLayout from "@/components/layout/main-layout";

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Auto-redirect users with "Contador" role to mobile counting screen
  const isContador = user && (
    (user as any).role === 'contador' || 
    (user as any).role === 'Contador' || 
    (user as any).profile === 'contador' || 
    (user as any).profile === 'Contador'
  );

  return (
    <Switch>
      {!isAuthenticated ? (
        <>
          <Route path="/" component={LoginPage} />
          <Route path="/login" component={LoginPage} />
          <Route component={LoginPage} />
        </>
      ) : isContador ? (
        // Contador users get only the mobile counting interface
        <>
          <Route path="/" component={MobileCounting} />
          <Route path="/mobile-counting" component={MobileCounting} />
          <Route path="/inventory-counts-cp" component={MobileCounting} />
          <Route component={MobileCounting} />
        </>
      ) : (
        <MainLayout>
          <Route path="/" component={Dashboard} />
          <Route path="/products" component={Products} />
          <Route path="/categories" component={Categories} />
          <Route path="/locations" component={Locations} />
          <Route path="/stock" component={Stock} />
          <Route path="/inventories" component={Inventories} />
          <Route path="/inventories/:id/details" component={InventoryDetails} />
          <Route path="/inventory-dashboard" component={InventoryDashboardPage} />
          <Route path="/inventory-control-board" component={InventoryControlBoard} />
          <Route path="/inventory-control-board-cp" component={InventoryControlBoardCP} />
          <Route path="/product-listing-report" component={ProductListingReport} />
          <Route path="/inventory-review/:id" component={InventoryReview} />
          <Route path="/inventory-counting/:id" component={InventoryCounting} />
          <Route path="/inventory-counts" component={InventoryCounts} />
          <Route path="/inventory-counts-cp" component={MobileCounting} />
          <Route path="/inventory-assets/:id" component={InventoryAssetControl} />
          <Route path="/audit-logs" component={AuditLogs} />
          <Route path="/api-tests" component={ApiTests} />
          <Route path="/users" component={Users} />
          <Route path="/companies" component={Companies} />
          <Route path="/stock-items" component={StockItems} />
          <Route path="/parameters-rules" component={ParametersRules} />
          <Route path="/inventory-test-suite" component={InventoryTestSuite} />
          <Route path="/inventory-final-report" component={InventoryFinalReport} />
          <Route path="/inventory-test-validation" component={InventoryTestValidation} />
        </MainLayout>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <SelectedInventoryProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </SelectedInventoryProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;