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
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { insertInventorySchema } from "@shared/schema";
import { z } from "zod";

const formSchema = insertInventorySchema.extend({
  startDate: z.string().min(1, "Data de início é obrigatória"),
  endDate: z.string().optional(),
  locationIds: z.array(z.number()).min(1, "Selecione pelo menos um local"),
}).omit({ createdBy: true });

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
      description: "",
      locationIds: [],
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

  const { data: stock } = useQuery({
    queryKey: ["/api/stock"],
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      // Generate unique code if not provided
      const code = data.code || `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      
      // Create inventory
      const inventoryPayload = {
        code,
        typeId: data.typeId,
        startDate: data.startDate,
        endDate: data.endDate,
        description: data.description,
        status: 'OPEN',
      };

      const response = await apiRequest("POST", "/api/inventories", inventoryPayload);
      const inventory = await response.json();

      // Create inventory items for selected locations
      const selectedLocations = data.locationIds;
      const inventoryItems = [];

      for (const locationId of selectedLocations) {
        // Get stock items for this location
        const locationStock = stock?.filter((item: any) => item.locationId === locationId) || [];
        
        for (const stockItem of locationStock) {
          inventoryItems.push({
            inventoryId: inventory.id,
            productId: stockItem.productId,
            locationId: stockItem.locationId,
            expectedQuantity: stockItem.quantity,
            status: 'PENDING',
          });
        }
      }

      // Create inventory items
      for (const item of inventoryItems) {
        await apiRequest("POST", "/api/inventory-items", item);
      }

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
                  <Button type="button" variant="outline" onClick={generateCode}>
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
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Término</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="locationIds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Locais de Estoque *</FormLabel>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-48 overflow-y-auto border rounded-lg p-4">
                {locations?.map((location: any) => (
                  <div key={location.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`location-${location.id}`}
                      checked={field.value?.includes(location.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          field.onChange([...field.value, location.id]);
                        } else {
                          field.onChange(field.value.filter(id => id !== location.id));
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
              <FormMessage />
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
