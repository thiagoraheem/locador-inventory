import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import DataTable from "@/components/data-table";
import { Plus, Search, Edit, Trash2, RotateCcw, Users as UsersIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import type { User } from "@shared/schema";

const formSchema = insertUserSchema.extend({
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional(),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  if (data.password && data.password !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

const roleLabels = {
  admin: "Administrador",
  consulta: "Consulta",
  contador: "Contador",
  gerente: "Gerente",
  supervisor: "Supervisor",
};

export default function Users() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
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

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users", searchQuery, showInactive],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (showInactive) params.set('includeInactive', 'true');
      
      const response = await fetch(`/api/users?${params}`);
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    retry: false,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      email: "",
      firstName: "",
      lastName: "",
      role: "consulta",
      isActive: true,
      password: "",
      confirmPassword: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const { confirmPassword, ...userData } = data;
      if (selectedUser) {
        await apiRequest("PUT", `/api/users/${selectedUser.id}`, userData);
      } else {
        await apiRequest("POST", "/api/users", userData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsFormOpen(false);
      form.reset();
      setSelectedUser(null);
      toast({
        title: "Sucesso",
        description: selectedUser ? "Usuário atualizado com sucesso!" : "Usuário criado com sucesso!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Erro",
        description: "Erro ao salvar usuário",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Sucesso",
        description: "Usuário desativado com sucesso!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Erro",
        description: "Erro ao desativar usuário",
        variant: "destructive",
      });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PUT", `/api/users/${id}`, { isActive: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Sucesso",
        description: "Usuário reativado com sucesso!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Erro",
        description: "Erro ao reativar usuário",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    mutation.mutate(data);
  };

  const columns = [
    {
      header: "Usuário",
      accessorKey: "username",
      sortable: true,
    },
    {
      header: "Nome Completo",
      accessorKey: "fullName",
      sortable: true,
      cell: (value: any, row: User) => `${row.firstName} ${row.lastName}`,
    },
    {
      header: "Email",
      accessorKey: "email",
      sortable: true,
    },
    {
      header: "Perfil",
      accessorKey: "role",
      sortable: true,
      cell: (value: string) => (
        <Badge variant="outline">
          {roleLabels[value as keyof typeof roleLabels] || value}
        </Badge>
      ),
    },
    {
      header: "Status",
      accessorKey: "isActive",
      cell: (value: boolean) => (
        <Badge variant={value ? "default" : "secondary"}>
          {value ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
    {
      header: "Ações",
      accessorKey: "actions",
      cell: (value: any, row: User) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedUser(row);
              form.reset({
                ...row,
                password: "",
                confirmPassword: "",
              });
              setIsFormOpen(true);
            }}
            className="btn-mobile"
          >
            <Edit className="h-4 w-4" />
          </Button>
          {row.isActive ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteMutation.mutate(row.id)}
              disabled={deleteMutation.isPending}
              className="btn-mobile"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => reactivateMutation.mutate(row.id)}
              disabled={reactivateMutation.isPending}
              className="text-green-600 hover:text-green-700 btn-mobile"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (usersLoading) {
    return (
      <div>
        <Header title="Usuários" subtitle="Gerenciamento de usuários do sistema" />
        <div className="space-y-6 p-4 md:p-6">
          <Card className="mobile-card">
            <CardContent className="p-4 sm:p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Usuários" subtitle="Gerenciamento de usuários do sistema" />
      
      <div className="space-y-6 p-4 md:p-6">
        <Card className="mobile-card">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <CardTitle className="flex items-center">
                <UsersIcon className="h-5 w-5 mr-2" />
                Lista de Usuários
              </CardTitle>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
                <div className="relative">
                  <Input
                    placeholder="Filtrar usuários..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:w-64 pl-10"
                  />
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      onClick={() => {
                        setSelectedUser(null);
                        form.reset({
                          username: "",
                          email: "",
                          firstName: "",
                          lastName: "",
                          role: "consulta",
                          isActive: true,
                          password: "",
                          confirmPassword: "",
                        });
                      }}
                      className="w-full sm:w-auto btn-mobile"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Usuário
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl mx-4 sm:mx-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {selectedUser ? "Editar Usuário" : "Novo Usuário"}
                      </DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nome de Usuário *</FormLabel>
                                <FormControl>
                                  <Input placeholder="usuario123" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email *</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="usuario@exemplo.com" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nome *</FormLabel>
                                <FormControl>
                                  <Input placeholder="João" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Sobrenome *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Silva" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Perfil de Acesso *</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o perfil" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="admin">Administrador</SelectItem>
                                  <SelectItem value="gerente">Gerente</SelectItem>
                                  <SelectItem value="supervisor">Supervisor</SelectItem>
                                  <SelectItem value="contador">Contador</SelectItem>
                                  <SelectItem value="consulta">Consulta</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  {selectedUser ? "Nova Senha (deixe em branco para manter)" : "Senha *"}
                                </FormLabel>
                                <FormControl>
                                  <Input type="password" placeholder="******" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Confirmar Senha</FormLabel>
                                <FormControl>
                                  <Input type="password" placeholder="******" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="flex justify-end space-x-3">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setIsFormOpen(false);
                              form.reset();
                              setSelectedUser(null);
                            }}
                            className="btn-mobile"
                          >
                            Cancelar
                          </Button>
                          <Button type="submit" disabled={mutation.isPending} className="btn-mobile">
                            {mutation.isPending ? "Salvando..." : "Salvar"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <div className="flex items-center space-x-2 mt-4 sm:mt-0">
              <Switch
                id="show-inactive"
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              <Label htmlFor="show-inactive" className="text-sm text-gray-600">
                Mostrar usuários desativados
              </Label>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="table-container">
              <DataTable
                data={users || []}
                columns={columns}
                searchQuery={searchQuery}
                isLoading={usersLoading}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}