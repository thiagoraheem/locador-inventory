import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  LayoutDashboard, 
  Package, 
  Warehouse, 
  Layers, 
  ClipboardList, 
  History,
  LogOut,
  User,
  Box
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Produtos", href: "/products", icon: Package },
  { name: "Categorias", href: "/categories", icon: Layers },
  { name: "Locais de Estoque", href: "/locations", icon: Warehouse },
  { name: "Controle de Estoque", href: "/stock", icon: Box },
  { name: "Inventários", href: "/inventories", icon: ClipboardList },
  { name: "Logs de Auditoria", href: "/audit-logs", icon: History },
  { name: "Usuários", href: "/users", icon: User },
];

export default function Sidebar() {
  const { user } = useAuth();
  const [location] = useLocation();
  const { toast } = useToast();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Erro ao fazer logout');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.clear();
      toast({
        title: "Logout realizado com sucesso",
        description: "Você foi desconectado do sistema.",
      });
    },
    onError: () => {
      toast({
        title: "Erro no logout",
        description: "Houve um problema ao sair do sistema.",
        variant: "destructive",
      });
    },
  });

  return (
    <aside className="w-64 bg-white shadow-md border-r border-gray-200 flex flex-col">
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Box className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">InventoryPro</h1>
            <p className="text-xs text-gray-600">Sistema de Estoque</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-4">
          {navigation.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <li key={item.name}>
                <Link href={item.href}>
                  <a
                    className={`flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? "text-primary bg-primary/10 border-r-2 border-primary"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </a>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Profile Section */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-gray-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">
              {user?.firstName || user?.username} {user?.lastName}
            </p>
            <p className="text-xs text-gray-600 capitalize">{user?.role || 'Usuário'}</p>
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
