import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  LayoutDashboard,
  Package,
  Warehouse,
  Layers,
  ClipboardList,
  History,
  LogOut,
  User,
  Box,
  Building,
  Package2,
  X,
  ChevronDown,
  ChevronRight,
  Settings,
  FileText,
  BarChart3,
  Users,
  FolderOpen,
  TestTube,
  Globe,
  AlertTriangle,
} from "lucide-react";

interface SidebarProps {
  isOpen?: boolean;
  isMobile?: boolean;
  onClose?: () => void;
}

interface NavigationItem {
  name: string;
  href?: string;
  icon: any;
  children?: NavigationItem[];
  /** If true, only users with role Administrator can see this item */
  adminOnly?: boolean;
}

const navigation: NavigationItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  {
    name: "Cadastros",
    icon: FolderOpen,
    children: [
      { name: "Usuários", href: "/users", icon: User },
      { name: "Empresas", href: "/companies", icon: Building },
      { name: "Categorias", href: "/categories", icon: Layers },
      { name: "Produtos", href: "/products", icon: Package },
      { name: "Locais de Estoque", href: "/locations", icon: Warehouse },
      { name: "Controle de Patrimônio", href: "/stock-items", icon: Package2 },
    ],
  },
  { name: "Controle de Estoque", href: "/stock", icon: Box },
  {
    name: "Inventários",
    icon: ClipboardList,
    children: [
      { name: "Inventários", href: "/inventories", icon: ClipboardList },
      { name: "Dashboard Analítico", href: "/inventory-dashboard", icon: BarChart3 },
      {
        name: "Contagens",
        icon: BarChart3,
        children: [
          { name: "Contagem em Lista", href: "/inventory-counts", icon: FileText },
          {
            name: "Contagem Individual",
            href: "/inventory-counts-cp",
            icon: FileText,
          }/*,
          {
            name: "Contagem de Itens",
            href: "/inventory-counting",
            icon: ClipboardList,
          },
          {
            name: "Suite de Testes",
            href: "/inventory-test-suite",
            icon: FileText,
            adminOnly: true,
          },
          {
            name: "Validação de Fluxos",
            href: "/inventory-test-validation",
            icon: TestTube,
            adminOnly: true,
          },*/
        ],
      },
      {
        name: "Mesa de Controle",
        href: "/inventory-control-board",
        icon: Settings,
      },
      {
        name: "Mesa de Controle CP",
        href: "/inventory-control-board-cp",
        icon: Settings,
      },
      {
        name: "Relatórios",
        icon: BarChart3,
        children: [
          {
            name: "Listagem de Produtos",
            href: "/product-listing-report",
            icon: FileText,
          },
          {
            name: "Relatório de Inventário Fechado",
            href: "/inventory-final-report",
            icon: FileText,
          },
        ],
      },
      {
        name: "Divergências de Números de Série",
        href: "/serial-discrepancies",
        icon: AlertTriangle,
      },
      {
        name: "Parâmetros / Regras",
        href: "/parameters-rules",
        icon: FileText,
      },
    ],
  },
  { name: "Logs de Auditoria", href: "/audit-logs", icon: History },
  { name: "Testes API", href: "/api-tests", icon: Globe, adminOnly: true },
];

export default function Sidebar({
  isOpen = true,
  isMobile = false,
  onClose,
}: SidebarProps) {
  const { user } = useAuth();
  const [location] = useLocation();
  const { toast } = useToast();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpanded = (itemName: string) => {
    setExpandedItems((prev) =>
      prev.includes(itemName)
        ? prev.filter((name) => name !== itemName)
        : [...prev, itemName],
    );
  };

  const renderNavigationItem = (item: NavigationItem, level: number = 0) => {
     // Hide admin-only items for non-admin users
     if (item.adminOnly) {
       const role = (user as any)?.role?.toString()?.toLowerCase();
       const isAdmin = role === "administrador" || role === "admin" || role === "administrator";
       if (!isAdmin) return null;
     }
    const isExpanded = expandedItems.includes(item.name);
    const hasChildren = item.children && item.children.length > 0;
    const isActive = item.href && location === item.href;
    const Icon = item.icon;

    return (
      <div key={item.name} className={`${level > 0 ? "ml-4" : ""}`}>
        {item.href ? (
          <Link href={item.href}>
            <div
              onClick={isMobile ? onClose : undefined}
              className={`flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                isActive
                  ? "text-primary bg-primary/10 border-r-2 border-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
              </div>
            </div>
          </Link>
        ) : (
          <button
            onClick={() => toggleExpanded(item.name)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <div className="flex items-center space-x-3">
              <Icon className="w-4 h-4" />
              <span>{item.name}</span>
            </div>
            {hasChildren &&
              (isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              ))}
          </button>
        )}

        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children!.map((child) =>
              renderNavigationItem(child, level + 1),
            )}
          </div>
        )}
      </div>
    );
  };

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Erro ao fazer logout");
      }

      return response.json();
    },
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear();

      // Clear any local storage items if they exist
      localStorage.clear();
      sessionStorage.clear();

      toast({
        title: "Logout realizado com sucesso",
        description: "Você foi desconectado do sistema.",
      });

      // Force redirect to login after a short delay
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    },
    onError: () => {
      // Even if logout fails on server, clear client state and redirect
      queryClient.clear();
      localStorage.clear();
      sessionStorage.clear();

      toast({
        title: "Logout realizado",
        description: "Você foi desconectado do sistema.",
      });

      // Force redirect to login
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    },
  });

  return (
    <aside
      className={cn(
        "w-64 bg-background shadow-sm border-r border-border flex flex-col min-h-screen transition-transform duration-300 ease-in-out",
        isMobile ? "fixed top-0 left-0 z-30" : "relative",
        isMobile && !isOpen ? "-translate-x-full" : "translate-x-0",
      )}
    >
      {/* Logo Section */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Box className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Locador</h1>
              <p className="text-xs text-muted-foreground">Módulo de Inventário</p>
            </div>
          </div>
          {isMobile && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 py-4">
        <div className="space-y-1 px-4">
          {navigation.map((item) => renderNavigationItem(item))}
        </div>
      </nav>

      {/* User Profile Section */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {(user as any)?.firstName || (user as any)?.username}{" "}
              {(user as any)?.lastName}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {(user as any)?.role || "Usuário"}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          <LogOut className="h-4 w-4 mr-2" />
          {logoutMutation.isPending ? "Saindo..." : "Sair"}
        </Button>
      </div>
    </aside>
  );
}
