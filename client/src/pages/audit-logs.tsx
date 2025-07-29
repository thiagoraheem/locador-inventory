import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/layout/header";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/data-table";
import { Search, Filter, Download } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AuditLogs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: auditLogs, isLoading: logsLoading } = useQuery({
    queryKey: ["/api/audit-logs"],
    retry: false,
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <Badge variant="default" className="bg-green-100 text-green-800">Criar</Badge>;
      case 'UPDATE':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Atualizar</Badge>;
      case 'DELETE':
        return <Badge variant="default" className="bg-red-100 text-red-800">Excluir</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const getEntityBadge = (entityType: string) => {
    const colors = {
      'PRODUCT': 'bg-purple-100 text-purple-800',
      'LOCATION': 'bg-orange-100 text-orange-800',
      'STOCK': 'bg-green-100 text-green-800',
      'INVENTORY': 'bg-blue-100 text-blue-800',
      'COUNT': 'bg-yellow-100 text-yellow-800',
    };

    const labels = {
      'PRODUCT': 'Produto',
      'LOCATION': 'Local',
      'STOCK': 'Estoque',
      'INVENTORY': 'Inventário',
      'COUNT': 'Contagem',
    };

    return (
      <Badge 
        variant="default" 
        className={colors[entityType as keyof typeof colors] || 'bg-gray-100 text-gray-800'}
      >
        {labels[entityType as keyof typeof labels] || entityType}
      </Badge>
    );
  };

  const formatJsonData = (data: any) => {
    if (!data) return "-";
    
    if (typeof data === 'object') {
      return Object.entries(data)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
    }
    
    return String(data);
  };

  const columns = [
    {
      header: "Data/Hora",
      accessorKey: "timestamp",
      sortable: true,
      cell: (value: string) => new Date(value).toLocaleString(),
    },
    {
      header: "Usuário",
      accessorKey: "user.firstName",
      sortable: true,
      cell: (value: string, row: any) => {
        const user = row.user;
        if (!user) return 'Sistema';
        
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        return fullName || user.email || user.username || 'Sistema';
      },
    },
    {
      header: "Ação",
      accessorKey: "action",
      sortable: true,
      cell: (value: string) => getActionBadge(value),
    },
    {
      header: "Entidade",
      accessorKey: "entityType",
      sortable: true,
      cell: (value: string) => getEntityBadge(value),
    },
    {
      header: "ID da Entidade",
      accessorKey: "entityId",
      sortable: true,
    },
    {
      header: "Alterações",
      accessorKey: "newValues",
      cell: (value: any, row: any) => {
        if (row.action === 'CREATE') {
          return (
            <div className="max-w-xs truncate">
              <span className="text-green-600 font-medium">Criado: </span>
              <span className="text-sm">{formatJsonData(value)}</span>
            </div>
          );
        } else if (row.action === 'UPDATE') {
          return (
            <div className="max-w-xs truncate">
              <span className="text-blue-600 font-medium">Atualizado: </span>
              <span className="text-sm">{formatJsonData(value)}</span>
            </div>
          );
        } else if (row.action === 'DELETE') {
          return (
            <div className="max-w-xs truncate">
              <span className="text-red-600 font-medium">Excluído: </span>
              <span className="text-sm">{formatJsonData(row.oldValues)}</span>
            </div>
          );
        }
        return "-";
      },
    },
  ];

  // Filter logs based on search and filters
  const filteredLogs = auditLogs?.filter((log: any) => {
    const matchesSearch = !searchQuery || 
      log.user?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entityType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entityId.includes(searchQuery);

    const matchesAction = !actionFilter || actionFilter === "all-actions" || log.action === actionFilter;
    const matchesEntity = !entityFilter || entityFilter === "all-entities" || log.entityType === entityFilter;

    return matchesSearch && matchesAction && matchesEntity;
  }) || [];

  const handleExport = () => {
    toast({
      title: "Exportação",
      description: "Funcionalidade de exportação em desenvolvimento",
    });
  };

  return (
    <div>
      <Header title="Logs de Auditoria" subtitle="Histórico de operações do sistema" />
      
      <div className="space-y-6 p-4 md:p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Registros de Auditoria</CardTitle>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Input
                  placeholder="Pesquisar logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
              
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-actions">Todas as ações</SelectItem>
                  <SelectItem value="CREATE">Criar</SelectItem>
                  <SelectItem value="UPDATE">Atualizar</SelectItem>
                  <SelectItem value="DELETE">Excluir</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por entidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-entities">Todas as entidades</SelectItem>
                  <SelectItem value="PRODUCT">Produto</SelectItem>
                  <SelectItem value="LOCATION">Local</SelectItem>
                  <SelectItem value="STOCK">Estoque</SelectItem>
                  <SelectItem value="INVENTORY">Inventário</SelectItem>
                  <SelectItem value="COUNT">Contagem</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total de Logs</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {auditLogs?.length || 0}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-600">Criações</p>
                <p className="text-2xl font-semibold text-green-900">
                  {auditLogs?.filter((log: any) => log.action === 'CREATE').length || 0}
                </p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-600">Atualizações</p>
                <p className="text-2xl font-semibold text-blue-900">
                  {auditLogs?.filter((log: any) => log.action === 'UPDATE').length || 0}
                </p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-red-600">Exclusões</p>
                <p className="text-2xl font-semibold text-red-900">
                  {auditLogs?.filter((log: any) => log.action === 'DELETE').length || 0}
                </p>
              </div>
            </div>

            {/* Table */}
            <DataTable
              data={filteredLogs}
              columns={columns}
              searchQuery={searchQuery}
              isLoading={logsLoading}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
