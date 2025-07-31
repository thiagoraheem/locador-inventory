import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { insertInventorySchema } from "@shared/schema";
import { z } from "zod";

const formSchema = insertInventorySchema
  .extend({
    startDate: z.string().min(1, "Data de início é obrigatória"),
    endDate: z.string().optional(),
    predictedEndDate: z.string().min(1, "Data de previsão é obrigatória"),
    selectedLocationIds: z
      .array(z.number())
      .min(1, "Selecione pelo menos um local"),
    selectedCategoryIds: z
      .array(z.number())
      .min(1, "Selecione pelo menos uma categoria"),
    isToBlockSystem: z.boolean().optional(),
  })
  .omit({ createdBy: true });

interface InventoryFormProps {
  onSuccess?: () => void;
}

export default function InventoryForm({ onSuccess }: InventoryFormProps) {
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: "",
      typeId: 0,
      startDate: "",
      endDate: "",
      predictedEndDate: "",
      description: "",
      isToBlockSystem: false,
      selectedLocationIds: [],
      selectedCategoryIds: [],
    },
  });

  const { data: inventoryTypes } = useQuery({
    queryKey: ["/api/inventory-types"],
    retry: false,
  });

  const { data: locations } = useQuery({
    queryKey: ["/api/locations"],
    retry: false,
  });

  const { data: products } = useQuery({
    queryKey: ["/api/products"],
    retry: false,
  });

  const { data: categories } = useQuery({
    queryKey: ["/api/categories"],
    retry: false,
  });

  const { data: stock } = useQuery({
    queryKey: ["/api/stock"],
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      // Generate unique code if not provided
      const code =
        data.code ||
        `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

      // Create inventory
      const inventoryPayload = {
        code,
        typeId: data.typeId,
        startDate: new Date(data.startDate).getTime(),
        endDate: data.endDate ? new Date(data.endDate).getTime() : null,
        predictedEndDate: data.predictedEndDate
          ? new Date(data.predictedEndDate).getTime()
          : null,
        description: data.description,
        status: "open",
        isToBlockSystem: data.isToBlockSystem || false,
        selectedLocationIds: data.selectedLocationIds,
        selectedCategoryIds: data.selectedCategoryIds,
      };

      const response = await apiRequest(
        "POST",
        "/api/inventories",
        inventoryPayload,
      );
      const inventory = await response.json();

      return inventory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventories"] });
      toast({
        title: "Sucesso",
        description: "Inventário criado com sucesso!",
      });
      onSuccess?.();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Você não está autenticado. Faça login novamente...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Erro ao criar inventário",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    mutation.mutate(data);
  };

  const generateCode = () => {
    const code = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    form.setValue("code", code);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código do Inventário</FormLabel>
                <div className="flex space-x-2">
                  <FormControl>
                    <Input placeholder="INV-2024-001" {...field} />
                  </FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateCode}
                  >
                    Gerar
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="typeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Inventário *</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(parseInt(value))}
                  value={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Array.isArray(inventoryTypes) &&
                      inventoryTypes.map((type: any) => (
                        <SelectItem key={type.id} value={type.id.toString()}>
                          {type.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Início *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="predictedEndDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Previsão de Término *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="selectedLocationIds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Locais de Estoque *</FormLabel>
                <div className="max-h-48 overflow-y-auto border rounded-lg p-4">
                  <div className="mb-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const allLocationIds = Array.isArray(locations)
                          ? locations.map((l: any) => l.id)
                          : [];
                        field.onChange(
                          field.value?.length === allLocationIds.length
                            ? []
                            : allLocationIds,
                        );
                      }}
                    >
                      {field.value?.length ===
                      (Array.isArray(locations) ? locations.length : 0)
                        ? "Desmarcar Todos"
                        : "Selecionar Todos"}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {Array.isArray(locations) &&
                      locations.map((location: any) => (
                        <div
                          key={location.id}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`location-${location.id}`}
                            checked={field.value?.includes(location.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                field.onChange([...field.value, location.id]);
                              } else {
                                field.onChange(
                                  field.value.filter(
                                    (id) => id !== location.id,
                                  ),
                                );
                              }
                            }}
                          />
                          <Label
                            htmlFor={`location-${location.id}`}
                            className="text-sm cursor-pointer"
                          >
                            {location.name}
                          </Label>
                        </div>
                      ))}
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="selectedCategoryIds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categorias *</FormLabel>
                <div className="max-h-48 overflow-y-auto border rounded-lg p-4">
                  <div className="mb-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const allCategoryIds = Array.isArray(categories)
                          ? categories.map((c: any) => c.id)
                          : [];
                        field.onChange(
                          field.value?.length === allCategoryIds.length
                            ? []
                            : allCategoryIds,
                        );
                      }}
                    >
                      {field.value?.length ===
                      (Array.isArray(categories) ? categories.length : 0)
                        ? "Desmarcar Todos"
                        : "Selecionar Todos"}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {Array.isArray(categories) &&
                      categories.map((category: any) => (
                        <div
                          key={category.id}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`category-${category.id}`}
                            checked={field.value?.includes(category.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                field.onChange([...field.value, category.id]);
                              } else {
                                field.onChange(
                                  field.value.filter(
                                    (id) => id !== category.id,
                                  ),
                                );
                              }
                            }}
                          />
                          <Label
                            htmlFor={`category-${category.id}`}
                            className="text-sm cursor-pointer"
                          >
                            {category.name}
                          </Label>
                        </div>
                      ))}
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="isToBlockSystem"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">
                  Bloquear movimentação de estoque
                </FormLabel>
                <FormDescription>
                  Quando ativado, impede movimentações no estoque durante o
                  inventário
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Descrição opcional do inventário..."
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-end space-x-4">
          <Button type="button" variant="outline" onClick={onSuccess}>
            Cancelar
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Criando..." : "Criar Inventário"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
