import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useInventoryTypes } from "@/hooks/use-inventory-types";
import { useLocations } from "@/hooks/use-locations";
import { useCategories } from "@/hooks/use-categories";
import { ProductSelector } from "@/components/ProductSelector";
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

const createFormSchema = (inventoryTypes: any[]) => insertInventorySchema
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
    selectedProductIds: z.array(z.number()).optional(),
    isToBlockSystem: z.boolean().optional(),
  })
  .omit({ createdBy: true })
  .refine(
    (data) => {
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.predictedEndDate);
      return endDate >= startDate;
    },
    {
      message: "Data de término deve ser igual ou posterior à data de início",
      path: ["predictedEndDate"],
    },
  )
  .refine(
    (data) => {
      const inventoryType = inventoryTypes?.find(type => type.id === data.typeId);
      
      if (inventoryType?.name === 'Rotativo') {
        return data.selectedProductIds && data.selectedProductIds.length > 0;
      }
      return true;
    },
    {
      message: "Selecione pelo menos um produto para inventário rotativo",
      path: ["selectedProductIds"],
    },
  );

interface InventoryFormProps {
  onSuccess?: () => void;
}

export default function InventoryForm({ onSuccess }: InventoryFormProps) {
  const { toast } = useToast();

  const { data: inventoryTypes } = useQuery({
    queryKey: ["/api/inventory-types"],
    retry: false,
  });

  const formSchema = useMemo(() => {
    return createFormSchema(inventoryTypes || []);
  }, [inventoryTypes]);
  
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
      selectedProductIds: [],
    },
  });

  // Watch values and memoize them to prevent unnecessary re-renders
  const watchedTypeId = form.watch('typeId');
  const watchedCategoryIds = form.watch('selectedCategoryIds');
  
  const memoizedCategoryIds = useMemo(() => watchedCategoryIds, [JSON.stringify(watchedCategoryIds)]);
  const isRotativoType = useMemo(() => {
    return inventoryTypes?.find(type => type.id === watchedTypeId)?.name === 'Rotativo';
  }, [inventoryTypes, watchedTypeId]);

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
      console.log('🚀 MUTATION START - Dados do formulário:', data);
      
      // Generate unique code if not provided
      const code =
        data.code ||
        `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

      // Create inventory
      const inventoryPayload = {
        code: data.code,
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
        selectedProductIds: data.selectedProductIds,
      };

      console.log('📦 PAYLOAD PREPARADO:', inventoryPayload);

      try {
        const inventory = await apiRequest(
          "/api/inventories",
          "POST",
          inventoryPayload,
        );
        
        console.log('✅ RESPOSTA DA API:', inventory);
        return inventory;
      } catch (error) {
        console.error('❌ ERRO NA API REQUEST:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('🎉 MUTATION SUCCESS - Dados retornados:', data);
      queryClient.invalidateQueries({ queryKey: ["/api/inventories"] });
      toast({
        title: "Sucesso",
        description: "Inventário criado com sucesso!",
      });
      onSuccess?.();
    },
    onError: (error) => {
      console.error('💥 MUTATION ERROR:', error);
      console.error('💥 ERROR STACK:', error.stack);
      console.error('💥 ERROR MESSAGE:', error.message);
      
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
        description: `Erro ao criar inventário: ${error.message}`,
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

        {/* Product Selector - Only for Rotativo inventory type */}
        {isRotativoType && (
          <FormField
            control={form.control}
            name="selectedProductIds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Produtos Específicos *</FormLabel>
                <FormControl>
                  <ProductSelector
                    selectedCategoryIds={memoizedCategoryIds}
                    selectedProductIds={field.value || []}
                    onProductSelectionChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

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
