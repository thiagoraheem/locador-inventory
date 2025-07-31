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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { insertInventorySchema, type InsertInventory } from "@shared/schema";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";

// Extended schema for form validation
const inventoryFormSchema = insertInventorySchema.extend({
  startDate: z.date(),
  endDate: z.date().optional(),
  predictedEndDate: z.date().optional(),
});

type InventoryFormData = z.infer<typeof inventoryFormSchema>;

interface InventoryFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function InventoryForm({ onSuccess, onCancel }: InventoryFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch inventory types
  const { data: inventoryTypes, isLoading: typesLoading } = useQuery({
    queryKey: ["/api/inventory-types"],
    retry: false,
  });

  // Fetch locations
  const { data: locations, isLoading: locationsLoading } = useQuery({
    queryKey: ["/api/locations"],
    retry: false,
  });

  // Fetch categories
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/categories"],
    retry: false,
  });

  const form = useForm<InventoryFormData>({
    resolver: zodResolver(inventoryFormSchema),
    defaultValues: {
      typeId: 1,
      status: "planning",
      startDate: new Date(),
      description: "",
      isToBlockSystem: false,
      selectedLocationIds: [],
      selectedCategoryIds: [],
      createdBy: user?.id || 1,
    },
  });

  const createInventoryMutation = useMutation({
    mutationFn: async (data: InventoryFormData) => {
      // Convert dates to timestamps
      const inventoryData: InsertInventory = {
        ...data,
        startDate: data.startDate.getTime(),
        endDate: data.endDate ? data.endDate.getTime() : undefined,
        predictedEndDate: data.predictedEndDate ? data.predictedEndDate.getTime() : undefined,
        createdBy: user?.id || 1,
      };

      return await apiRequest("/api/inventories", {
        method: "POST",
        body: JSON.stringify(inventoryData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Inventário criado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inventories"] });
      form.reset();
      onSuccess?.();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Sessão expirada",
          description: "Faça login novamente",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar inventário",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InventoryFormData) => {
    createInventoryMutation.mutate(data);
  };

  const isLoading = typesLoading || locationsLoading || categoriesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando...</span>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="typeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Inventário</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(Number(value))}
                  defaultValue={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {inventoryTypes?.map((type: any) => (
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

          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código (opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="Será gerado automaticamente se vazio" {...field} />
                </FormControl>
                <FormDescription>
                  Se não informado, será gerado automaticamente
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data de Início</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "dd/MM/yyyy")
                        ) : (
                          <span>Selecione a data</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date("1900-01-01")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data de Fim (opcional)</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "dd/MM/yyyy")
                        ) : (
                          <span>Selecione a data</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date("1900-01-01")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="predictedEndDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Previsão de Término (opcional)</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "dd/MM/yyyy")
                        ) : (
                          <span>Selecione a data</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date("1900-01-01")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Descrição do inventário..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Location Selection */}
        <FormField
          control={form.control}
          name="selectedLocationIds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Locais Selecionados</FormLabel>
              <FormDescription>
                Selecione os locais que serão incluídos no inventário
              </FormDescription>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto border rounded p-3">
                {locations?.map((location: any) => (
                  <div key={location.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`location-${location.id}`}
                      checked={field.value?.includes(location.id) || false}
                      onCheckedChange={(checked) => {
                        const currentValues = field.value || [];
                        if (checked) {
                          field.onChange([...currentValues, location.id]);
                        } else {
                          field.onChange(
                            currentValues.filter((id) => id !== location.id)
                          );
                        }
                      }}
                    />
                    <Label
                      htmlFor={`location-${location.id}`}
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      {location.name}
                    </Label>
                  </div>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Category Selection */}
        <FormField
          control={form.control}
          name="selectedCategoryIds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categorias Selecionadas</FormLabel>
              <FormDescription>
                Selecione as categorias que serão incluídas no inventário
              </FormDescription>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto border rounded p-3">
                {categories?.map((category: any) => (
                  <div key={category.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${category.id}`}
                      checked={field.value?.includes(category.id) || false}
                      onCheckedChange={(checked) => {
                        const currentValues = field.value || [];
                        if (checked) {
                          field.onChange([...currentValues, category.id]);
                        } else {
                          field.onChange(
                            currentValues.filter((id) => id !== category.id)
                          );
                        }
                      }}
                    />
                    <Label
                      htmlFor={`category-${category.id}`}
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      {category.name}
                    </Label>
                  </div>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Block System Option */}
        <FormField
          control={form.control}
          name="isToBlockSystem"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Bloquear Sistema</FormLabel>
                <FormDescription>
                  Bloqueia movimentações de estoque durante o inventário
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

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={createInventoryMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={createInventoryMutation.isPending}
          >
            {createInventoryMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Criar Inventário
          </Button>
        </div>
      </form>
    </Form>
  );
}