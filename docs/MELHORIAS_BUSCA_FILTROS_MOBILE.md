# Melhorias para Busca e Filtros Mobile

## Análise dos Componentes Atuais

### Problemas Identificados

1. **Busca Limitada em Mobile**
   - Campos de busca pequenos para telas touch
   - Falta de autocomplete otimizado para mobile
   - Sem sugestões visuais ou histórico de busca
   - Resultados não otimizados para visualização mobile

2. **Filtros Inadequados para Touch**
   - Múltiplos `Select` ocupam muito espaço horizontal
   - Filtros avançados não são acessíveis em mobile
   - Falta de filtros rápidos por gestos
   - Sem persistência de filtros aplicados

3. **UX de Filtros Complexa**
   - Muitos filtros simultâneos confundem o usuário
   - Falta de indicadores visuais de filtros ativos
   - Sem opção de salvar combinações de filtros
   - Limpeza de filtros não é intuitiva

4. **Performance em Listas Grandes**
   - Busca sem debounce adequado
   - Filtros não otimizados para grandes datasets
   - Sem virtualização para resultados extensos
   - Loading states inadequados

## Soluções Propostas

### 1. **Busca Inteligente Mobile-First**
```tsx
import { Command, CommandInput, CommandList, CommandItem, CommandGroup } from "@/components/ui/command";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

// Busca global otimizada para mobile
function MobileSearchCommand({ onSelect }: MobileSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["global-search", searchTerm],
    queryFn: () => globalSearch(searchTerm),
    enabled: searchTerm.length >= 2,
    staleTime: 30000
  });
  
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-start text-muted-foreground h-12"
        >
          <Search className="h-4 w-4 mr-2" />
          Buscar produtos, locais, categorias...
        </Button>
      </SheetTrigger>
      
      <SheetContent side="top" className="h-[90vh]">
        <SheetHeader>
          <SheetTitle>Busca Global</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6">
          <Command className="border rounded-lg">
            <CommandInput 
              placeholder="Digite para buscar..."
              value={searchTerm}
              onValueChange={setSearchTerm}
              className="h-14 text-base"
            />
            
            <ScrollArea className="h-[60vh]">
              <CommandList>
                {/* Buscas recentes */}
                {!searchTerm && recentSearches.length > 0 && (
                  <CommandGroup heading="Buscas Recentes">
                    {recentSearches.map((term, index) => (
                      <CommandItem
                        key={index}
                        onSelect={() => {
                          setSearchTerm(term);
                        }}
                        className="h-12"
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        {term}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                
                {/* Resultados por categoria */}
                {searchResults?.products && searchResults.products.length > 0 && (
                  <CommandGroup heading="Produtos">
                    {searchResults.products.map((product) => (
                      <CommandItem
                        key={product.id}
                        onSelect={() => {
                          onSelect({ type: 'product', item: product });
                          addToRecentSearches(searchTerm);
                          setIsOpen(false);
                        }}
                        className="h-16 flex-col items-start"
                      >
                        <div className="flex items-center w-full">
                          <Package className="h-4 w-4 mr-2 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{product.name}</div>
                            <div className="text-sm text-muted-foreground">
                              SKU: {product.sku}
                            </div>
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                
                {searchResults?.locations && searchResults.locations.length > 0 && (
                  <CommandGroup heading="Locais">
                    {searchResults.locations.map((location) => (
                      <CommandItem
                        key={location.id}
                        onSelect={() => {
                          onSelect({ type: 'location', item: location });
                          addToRecentSearches(searchTerm);
                          setIsOpen(false);
                        }}
                        className="h-12"
                      >
                        <MapPin className="h-4 w-4 mr-2" />
                        {location.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                
                {/* Loading state */}
                {isLoading && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                )}
                
                {/* Empty state */}
                {searchTerm && !isLoading && !searchResults?.products?.length && !searchResults?.locations?.length && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum resultado encontrado</p>
                    <p className="text-sm">Tente termos diferentes</p>
                  </div>
                )}
              </CommandList>
            </ScrollArea>
          </Command>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

### 2. **Filtros Avançados em Sheet**
```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Painel de filtros avançados
function AdvancedFiltersSheet({ onFiltersChange, activeFilters }: AdvancedFiltersProps) {
  const [filters, setFilters] = useState(activeFilters);
  const [hasChanges, setHasChanges] = useState(false);
  
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          Filtros
          {Object.keys(activeFilters).length > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {Object.keys(activeFilters).length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent side="right" className="w-full sm:w-96">
        <SheetHeader>
          <SheetTitle>Filtros Avançados</SheetTitle>
        </SheetHeader>
        
        <Tabs defaultValue="basic" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Básico</TabsTrigger>
            <TabsTrigger value="advanced">Avançado</TabsTrigger>
            <TabsTrigger value="saved">Salvos</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic" className="space-y-6 mt-6">
            {/* Status Filter */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Status</label>
              <div className="grid grid-cols-2 gap-2">
                {statusOptions.map((status) => (
                  <Button
                    key={status.value}
                    variant={filters.status === status.value ? "default" : "outline"}
                    onClick={() => updateFilter('status', status.value)}
                    className="h-12 flex-col gap-1"
                  >
                    <status.icon className="h-4 w-4" />
                    <span className="text-xs">{status.label}</span>
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Category Filter */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Categorias</label>
              <ScrollArea className="h-32">
                <div className="space-y-2">
                  {categories?.map((category) => (
                    <div key={category.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`category-${category.id}`}
                        checked={filters.categories?.includes(category.id)}
                        onCheckedChange={(checked) => {
                          const newCategories = checked
                            ? [...(filters.categories || []), category.id]
                            : filters.categories?.filter(id => id !== category.id) || [];
                          updateFilter('categories', newCategories);
                        }}
                      />
                      <label 
                        htmlFor={`category-${category.id}`}
                        className="text-sm flex-1 cursor-pointer"
                      >
                        {category.name}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            
            {/* Location Filter */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Locais</label>
              <Select 
                value={filters.location || "all"} 
                onValueChange={(value) => updateFilter('location', value)}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Selecionar local" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Locais</SelectItem>
                  {locations?.map((location) => (
                    <SelectItem key={location.id} value={location.id.toString()}>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {location.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
          
          <TabsContent value="advanced" className="space-y-6 mt-6">
            {/* Date Range */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Período</label>
              <RadioGroup 
                value={filters.dateRange || "all"}
                onValueChange={(value) => updateFilter('dateRange', value)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="today" id="today" />
                  <label htmlFor="today" className="text-sm">Hoje</label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="week" id="week" />
                  <label htmlFor="week" className="text-sm">Esta semana</label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="month" id="month" />
                  <label htmlFor="month" className="text-sm">Este mês</label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="custom" />
                  <label htmlFor="custom" className="text-sm">Personalizado</label>
                </div>
              </RadioGroup>
            </div>
            
            {/* Quantity Range */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Quantidade</label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="Mín"
                  value={filters.minQuantity || ""}
                  onChange={(e) => updateFilter('minQuantity', e.target.value)}
                  className="h-12"
                />
                <Input
                  type="number"
                  placeholder="Máx"
                  value={filters.maxQuantity || ""}
                  onChange={(e) => updateFilter('maxQuantity', e.target.value)}
                  className="h-12"
                />
              </div>
            </div>
            
            {/* Boolean Filters */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Apenas com divergências</label>
                <Switch 
                  checked={filters.onlyDivergent || false}
                  onCheckedChange={(checked) => updateFilter('onlyDivergent', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Incluir inativos</label>
                <Switch 
                  checked={filters.includeInactive || false}
                  onCheckedChange={(checked) => updateFilter('includeInactive', checked)}
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="saved" className="space-y-4 mt-6">
            {/* Saved Filter Presets */}
            <div className="space-y-2">
              {savedFilters.map((preset) => (
                <Button
                  key={preset.id}
                  variant="outline"
                  className="w-full justify-start h-12"
                  onClick={() => applyFilterPreset(preset)}
                >
                  <Bookmark className="h-4 w-4 mr-2" />
                  <div className="flex-1 text-left">
                    <div className="font-medium">{preset.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {preset.description}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
            
            {/* Save Current Filters */}
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => saveCurrentFilters()}
              disabled={!hasChanges}
            >
              <Save className="h-4 w-4 mr-2" />
              Salvar Filtros Atuais
            </Button>
          </TabsContent>
        </Tabs>
        
        {/* Actions */}
        <div className="flex gap-2 mt-6 pt-6 border-t">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => clearAllFilters()}
          >
            Limpar Tudo
          </Button>
          
          <Button 
            className="flex-1"
            onClick={() => applyFilters()}
            disabled={!hasChanges}
          >
            Aplicar ({getFilterCount()} filtros)
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

### 3. **Filtros Rápidos com Chips**
```tsx
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

// Filtros rápidos como chips
function QuickFilters({ activeFilters, onFilterChange, onFilterRemove }: QuickFiltersProps) {
  const quickFilterOptions = [
    { key: 'status', value: 'pending', label: 'Pendentes', icon: Clock },
    { key: 'status', value: 'completed', label: 'Concluídos', icon: CheckCircle },
    { key: 'status', value: 'divergent', label: 'Divergentes', icon: AlertTriangle },
    { key: 'special', value: 'recent', label: 'Recentes', icon: Calendar },
    { key: 'special', value: 'favorites', label: 'Favoritos', icon: Star },
  ];
  
  return (
    <div className="space-y-3">
      {/* Quick Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {quickFilterOptions.map((option) => {
          const isActive = activeFilters[option.key] === option.value;
          const Icon = option.icon;
          
          return (
            <Button
              key={`${option.key}-${option.value}`}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (isActive) {
                  onFilterRemove(option.key);
                } else {
                  onFilterChange(option.key, option.value);
                }
              }}
              className="h-8"
            >
              <Icon className="h-3 w-3 mr-1" />
              {option.label}
            </Button>
          );
        })}
      </div>
      
      {/* Active Filters Display */}
      {Object.keys(activeFilters).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {Object.entries(activeFilters).map(([key, value]) => {
            if (!value || value === 'all') return null;
            
            return (
              <Badge 
                key={key} 
                variant="secondary" 
                className="h-6 text-xs pr-1"
              >
                {getFilterLabel(key, value)}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                  onClick={() => onFilterRemove(key)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            );
          })}
          
          {Object.keys(activeFilters).length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFilterRemove('all')}
              className="h-6 text-xs text-muted-foreground"
            >
              Limpar todos
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
```

### 4. **Busca com Sugestões Inteligentes**
```tsx
// Busca com autocomplete e sugestões
function SmartSearchInput({ onSearch, placeholder }: SmartSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const debouncedSearch = useDebounce(searchTerm, 300);
  
  const { data: searchSuggestions } = useQuery({
    queryKey: ["search-suggestions", debouncedSearch],
    queryFn: () => getSearchSuggestions(debouncedSearch),
    enabled: debouncedSearch.length >= 2,
    staleTime: 60000
  });
  
  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          className="pl-10 pr-10 h-12 text-base"
        />
        
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              onSearch("");
            }}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {/* Suggestions Dropdown */}
      {showSuggestions && searchSuggestions && searchSuggestions.length > 0 && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto">
          <CardContent className="p-0">
            {searchSuggestions.map((suggestion, index) => (
              <div
                key={index}
                className="px-4 py-3 hover:bg-accent cursor-pointer border-b last:border-b-0"
                onClick={() => {
                  setSearchTerm(suggestion);
                  onSearch(suggestion);
                  setShowSuggestions(false);
                }}
              >
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{suggestion}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

## Breakpoints e Responsividade

### Mobile Portrait (até 480px)
- Busca em tela cheia com Sheet
- Filtros em tabs verticais
- Chips de filtros em uma coluna
- Botões de ação em largura total

### Mobile Landscape (481px - 768px)
- Busca em modal menor
- Filtros em grid 2x2
- Chips de filtros em duas colunas
- Botões de ação lado a lado

### Tablet (769px - 1024px)
- Busca inline com dropdown
- Filtros em sidebar lateral
- Chips de filtros em linha
- Layout híbrido desktop/mobile

## Componentes Shadcn UI Utilizados

### Busca e Navegação
- `Command` - Busca com autocomplete
- `Sheet` - Painéis laterais e modais
- `ScrollArea` - Listas com scroll otimizado
- `Tabs` - Organização de filtros

### Filtros e Seleção
- `Select` - Dropdowns de filtro
- `Checkbox` - Seleção múltipla
- `RadioGroup` - Seleção única
- `Switch` - Filtros booleanos
- `Badge` - Chips de filtros ativos

### Feedback e Estados
- `Button` - Ações e filtros rápidos
- `Input` - Campos de busca
- `Card` - Containers de resultados
- `Separator` - Divisores visuais

## Funcionalidades Adicionais

### Persistência e Performance
- **Local Storage**: Salvar filtros e buscas recentes
- **Query Caching**: Cache inteligente com React Query
- **Debounce**: Otimização de requisições de busca
- **Virtualização**: Para listas grandes de resultados

### UX Avançada
- **Gestos Touch**: Swipe para limpar filtros
- **Atalhos**: Busca rápida com gestos
- **Feedback Háptico**: Confirmações em mobile
- **Estados de Loading**: Skeletons e spinners

### Acessibilidade
- **Navegação por Teclado**: Suporte completo
- **Screen Readers**: Labels e descrições adequadas
- **Alto Contraste**: Suporte a temas acessíveis
- **Tamanhos Touch**: Botões com 44px mínimo

## Próximos Passos

1. **Implementar busca global mobile-first**
2. **Criar sistema de filtros avançados**
3. **Adicionar filtros rápidos com chips**
4. **Implementar persistência de filtros**
5. **Otimizar performance para grandes datasets**
6. **Adicionar sugestões inteligentes**
7. **Implementar gestos touch para filtros**
8. **Criar presets de filtros salvos**