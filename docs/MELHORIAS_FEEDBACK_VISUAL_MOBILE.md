# Melhorias para Feedback Visual e Loading States Mobile

## Análise da Estrutura Atual

### Componentes de Feedback Existentes

1. **Toast Notifications** (`hooks/use-toast.ts`, `components/ui/toast.tsx`)
   - Sistema de notificações com variantes (default, destructive)
   - Suporte a swipe gestures
   - Posicionamento responsivo (top mobile, bottom desktop)
   - Duração configurável

2. **Alert Components** (`components/ui/alert.tsx`)
   - Alertas estáticos com variantes (default, destructive)
   - Suporte a ícones e títulos
   - Acessibilidade com role="alert"

3. **Progress Indicators** (`components/ui/progress.tsx`)
   - Barras de progresso básicas
   - Utilizadas em relatórios e validações

4. **Skeleton Loading** (`components/ui/skeleton.tsx`)
   - Componente básico com animate-pulse
   - Usado no sidebar para menu skeleton

5. **Loading Spinners** (Lucide Icons)
   - `Loader2` com `animate-spin`
   - `RefreshCw` para estados de carregamento
   - Utilizados em botões e ações

## Problemas Identificados

### 1. **Loading States Inconsistentes**
- Falta de padrão unificado para loading
- Spinners genéricos sem contexto
- Ausência de skeleton screens para listas
- Loading states não otimizados para touch

### 2. **Feedback Visual Limitado**
- Toasts básicos sem ações contextuais
- Falta de feedback háptico
- Ausência de micro-interações
- Estados de erro pouco informativos

### 3. **UX Mobile Inadequada**
- Componentes não adaptados para diferentes tamanhos de tela
- Falta de gestos touch intuitivos
- Feedback visual insuficiente para ações
- Performance ruim em dispositivos lentos

### 4. **Acessibilidade Limitada**
- Falta de ARIA labels em loading states
- Ausência de alternativas para usuários com deficiência visual
- Feedback sonoro inexistente

## Soluções Propostas

### 1. **Sistema Unificado de Loading States**

```tsx
// Hook para gerenciar estados de loading
interface LoadingState {
  isLoading: boolean;
  loadingType: 'skeleton' | 'spinner' | 'progress' | 'shimmer';
  message?: string;
  progress?: number;
}

function useLoadingState(initialState?: Partial<LoadingState>) {
  const [state, setState] = useState<LoadingState>({
    isLoading: false,
    loadingType: 'spinner',
    ...initialState
  });
  
  const startLoading = (type: LoadingState['loadingType'], message?: string) => {
    setState({ isLoading: true, loadingType: type, message });
  };
  
  const updateProgress = (progress: number) => {
    setState(prev => ({ ...prev, progress }));
  };
  
  const stopLoading = () => {
    setState(prev => ({ ...prev, isLoading: false }));
  };
  
  return { state, startLoading, updateProgress, stopLoading };
}
```

### 2. **Componentes de Loading Otimizados**

```tsx
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

// Skeleton para listas de produtos
function ProductListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        </Card>
      ))}
    </div>
  );
}

// Loading button com estados
function LoadingButton({ 
  isLoading, 
  loadingText, 
  children, 
  variant = "default",
  ...props 
}: LoadingButtonProps) {
  return (
    <Button 
      disabled={isLoading} 
      variant={variant}
      className="min-h-[44px] touch-manipulation"
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingText || "Carregando..."}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

// Shimmer effect para cards
function ShimmerCard({ className }: { className?: string }) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-lg bg-muted",
      "before:absolute before:inset-0",
      "before:-translate-x-full before:animate-[shimmer_2s_infinite]",
      "before:bg-gradient-to-r before:from-transparent",
      "before:via-white/60 before:to-transparent",
      className
    )}>
      <div className="h-32 w-full" />
    </div>
  );
}
```

### 3. **Sistema Avançado de Toasts**

```tsx
import { toast } from "@/hooks/use-toast";
import { CheckCircle, AlertTriangle, XCircle, Info, Undo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

// Toast com ações e feedback visual
interface ToastAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "destructive" | "outline";
}

interface EnhancedToastOptions {
  title: string;
  description?: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'loading';
  duration?: number;
  actions?: ToastAction[];
  progress?: number;
  persistent?: boolean;
}

function showEnhancedToast(options: EnhancedToastOptions) {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
    loading: Loader2
  };
  
  const Icon = icons[options.type];
  const iconClass = options.type === 'loading' ? 'animate-spin' : '';
  
  return toast({
    title: (
      <div className="flex items-center gap-2">
        <Icon className={cn("h-5 w-5", iconClass, {
          "text-green-600": options.type === 'success',
          "text-red-600": options.type === 'error',
          "text-yellow-600": options.type === 'warning',
          "text-blue-600": options.type === 'info' || options.type === 'loading'
        })} />
        <span>{options.title}</span>
      </div>
    ),
    description: (
      <div className="space-y-3">
        {options.description && (
          <p className="text-sm text-muted-foreground">
            {options.description}
          </p>
        )}
        
        {options.progress !== undefined && (
          <div className="space-y-1">
            <Progress value={options.progress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {options.progress}% concluído
            </p>
          </div>
        )}
        
        {options.actions && options.actions.length > 0 && (
          <div className="flex gap-2 pt-2">
            {options.actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || "outline"}
                size="sm"
                onClick={action.onClick}
                className="h-8 text-xs"
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    ),
    duration: options.persistent ? Infinity : (options.duration || 5000),
    className: cn({
      "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950": options.type === 'success',
      "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950": options.type === 'error',
      "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950": options.type === 'warning',
      "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950": options.type === 'info' || options.type === 'loading'
    })
  });
}

// Exemplos de uso
function showCountingSuccess(productName: string, quantity: number, onUndo?: () => void) {
  showEnhancedToast({
    type: 'success',
    title: 'Contagem Registrada',
    description: `${productName}: ${quantity} unidades`,
    actions: onUndo ? [{
      label: 'Desfazer',
      onClick: onUndo,
      variant: 'outline'
    }] : undefined
  });
}

function showSyncProgress(completed: number, total: number) {
  const progress = Math.round((completed / total) * 100);
  
  showEnhancedToast({
    type: 'loading',
    title: 'Sincronizando dados...',
    description: `${completed}/${total} itens processados`,
    progress,
    persistent: true
  });
}
```

### 4. **Componentes de Estado de Erro**

```tsx
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Estado de erro com ações de recuperação
function ErrorState({ 
  title, 
  description, 
  onRetry, 
  onGoBack,
  type = 'generic'
}: ErrorStateProps) {
  const errorIcons = {
    network: WifiOff,
    generic: AlertTriangle,
    timeout: RefreshCw
  };
  
  const Icon = errorIcons[type];
  
  return (
    <Card className="p-8 text-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/20">
          <Icon className="h-8 w-8 text-red-600 dark:text-red-400" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {description}
          </p>
        </div>
        
        <div className="flex gap-3">
          {onRetry && (
            <Button onClick={onRetry} className="min-h-[44px]">
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar Novamente
            </Button>
          )}
          
          {onGoBack && (
            <Button variant="outline" onClick={onGoBack} className="min-h-[44px]">
              Voltar
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

// Estado vazio com ação
function EmptyState({ 
  title, 
  description, 
  actionLabel, 
  onAction,
  icon: Icon = Package
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        {description}
      </p>
      
      {onAction && (
        <Button onClick={onAction} className="min-h-[44px]">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
```

### 5. **Micro-interações e Animações**

```tsx
// Componente com feedback visual ao toque
function TouchFeedbackButton({ 
  children, 
  onPress, 
  hapticFeedback = true,
  ...props 
}: TouchFeedbackButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  
  const handleTouchStart = () => {
    setIsPressed(true);
    if (hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(10); // Feedback háptico leve
    }
  };
  
  const handleTouchEnd = () => {
    setIsPressed(false);
    onPress?.();
  };
  
  return (
    <Button
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      className={cn(
        "transition-all duration-150 touch-manipulation",
        "active:scale-95 active:brightness-90",
        isPressed && "scale-95 brightness-90"
      )}
      {...props}
    >
      {children}
    </Button>
  );
}

// Animação de sucesso para ações
function SuccessAnimation({ onComplete }: { onComplete?: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);
  
  return (
    <div className="flex items-center justify-center p-8">
      <div className="relative">
        <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400 animate-bounce" />
        </div>
        
        {/* Ripple effect */}
        <div className="absolute inset-0 rounded-full bg-green-200 dark:bg-green-800 animate-ping opacity-75" />
      </div>
    </div>
  );
}
```

## Breakpoints Específicos por Dispositivo

```css
/* Mobile Portrait: até 480px */
@media (max-width: 480px) {
  .toast-mobile {
    position: fixed;
    top: 1rem;
    left: 1rem;
    right: 1rem;
    bottom: auto;
  }
  
  .loading-overlay {
    backdrop-filter: blur(2px);
  }
  
  .touch-target {
    min-height: 44px;
    min-width: 44px;
  }
}

/* Mobile Landscape: 481px - 767px */
@media (min-width: 481px) and (max-width: 767px) {
  .toast-mobile {
    max-width: 400px;
    margin: 0 auto;
  }
  
  .skeleton-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
}

/* Tablet: 768px - 1024px */
@media (min-width: 768px) and (max-width: 1024px) {
  .toast-tablet {
    position: fixed;
    bottom: 1rem;
    right: 1rem;
    max-width: 420px;
  }
  
  .loading-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Desktop: 1024px+ */
@media (min-width: 1024px) {
  .toast-desktop {
    position: fixed;
    bottom: 1rem;
    right: 1rem;
    max-width: 420px;
  }
  
  .hover-effects:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
}
```

## Componentes Shadcn UI Utilizados

1. **Toast** - Notificações com swipe e ações
2. **Alert** - Alertas contextuais e estados de erro
3. **Progress** - Barras de progresso e indicadores
4. **Skeleton** - Loading placeholders
5. **Card** - Containers para estados vazios e erros
6. **Button** - Botões com loading states
7. **Badge** - Indicadores de status
8. **Dialog** - Modais de confirmação
9. **Sheet** - Painéis laterais para ações
10. **Separator** - Divisores visuais

## Funcionalidades Adicionais

### 1. **Feedback Háptico**
- Vibração leve para ações de sucesso
- Feedback diferenciado para erros
- Suporte a diferentes intensidades

### 2. **Persistência de Estado**
- Cache de loading states
- Recuperação após reconexão
- Sincronização offline

### 3. **Performance Otimizada**
- Lazy loading de componentes
- Debounce para ações repetitivas
- Virtualização para listas grandes

### 4. **Acessibilidade**
- ARIA labels para loading states
- Suporte a screen readers
- Navegação por teclado
- Alto contraste

### 5. **Gestos Touch**
- Swipe para dismissar toasts
- Pull-to-refresh em listas
- Long press para ações contextuais
- Pinch-to-zoom em imagens

## Próximos Passos

1. ✅ Análise completa dos componentes atuais
2. 🔄 Implementar hook useLoadingState
3. 🔄 Criar componentes de skeleton otimizados
4. 🔄 Desenvolver sistema avançado de toasts
5. 🔄 Implementar estados de erro e vazio
6. 🔄 Adicionar micro-interações
7. 🔄 Implementar feedback háptico
8. 🔄 Otimizar performance para mobile
9. 🔄 Testar em diferentes dispositivos
10. 🔄 Adicionar testes de acessibilidade

## Benefícios Esperados

- **UX Consistente**: Feedback visual padronizado em toda aplicação
- **Performance Otimizada**: Loading states eficientes e responsivos
- **Touch-Friendly**: Interações otimizadas para dispositivos móveis
- **Acessibilidade**: Suporte completo a tecnologias assistivas
- **Engagement**: Micro-interações que melhoram a experiência
- **Confiabilidade**: Estados de erro claros e ações de recuperação