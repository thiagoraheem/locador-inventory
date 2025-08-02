import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle2, Copy, Play } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";

interface ApiResponse {
  status: number;
  statusText: string;
  data: any;
  error?: string;
  time: number;
}

export default function ApiTests() {
  const [baseUrl, setBaseUrl] = useState<string>(API_BASE_URL);
  const [apiUrl, setApiUrl] = useState<string>(`${baseUrl}/api/Estoque/verificar-congelamento`);
  const [method, setMethod] = useState<string>("GET");
  const [headers, setHeaders] = useState<string>("");
  const [body, setBody] = useState<string>("");
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [authToken, setAuthToken] = useState<string>("");
  
  // Função para atualizar a URL base e ajustar a URL atual
  const updateBaseUrl = (newBaseUrl: string) => {
    const path = apiUrl.replace(baseUrl, "");
    setBaseUrl(newBaseUrl);
    setApiUrl(newBaseUrl + path);
  };

  const handleApiCall = async () => {
    setIsLoading(true);
    setResponse(null);
    
    const startTime = performance.now();
    
    try {
      const requestOptions: RequestInit = {
        method,
        headers: headers ? JSON.parse(headers) : {},
        body: method !== "GET" && body ? body : undefined,
      };

      const response = await fetch(apiUrl, requestOptions);
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      setResponse({
        status: response.status,
        statusText: response.statusText,
        data,
        time: Math.round(responseTime),
      });
    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      setResponse({
        status: 0,
        statusText: "Error",
        data: null,
        error: error instanceof Error ? error.message : String(error),
        time: Math.round(responseTime),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Testes de API</h1>
        <div className="flex items-center space-x-2">
          <Input 
            className="w-64" 
            placeholder="URL Base da API" 
            value={baseUrl} 
            onChange={(e) => updateBaseUrl(e.target.value)} 
          />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => updateBaseUrl(API_BASE_URL)}
          >
            Restaurar Padrão
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Requisição</CardTitle>
            <CardDescription>Configure os parâmetros da requisição</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <div className="w-1/4">
                <select 
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </div>
              <div className="flex-1">
                <Input 
                  placeholder="URL da API" 
                  value={apiUrl} 
                  onChange={(e) => setApiUrl(e.target.value)} 
                />
              </div>
            </div>
            
            <Tabs defaultValue="headers" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="headers">Headers</TabsTrigger>
                <TabsTrigger value="body">Body</TabsTrigger>
              </TabsList>
              <TabsContent value="headers" className="space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">Formato JSON: {"{ \"Content-Type\": \"application/json\" }"}</p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const headerObj = headers ? JSON.parse(headers) : {};
                      headerObj["Authorization"] = `Bearer ${authToken}`;
                      setHeaders(JSON.stringify(headerObj, null, 2));
                    }}
                    disabled={!authToken}
                  >
                    Adicionar Token
                  </Button>
                </div>
                <div className="space-y-2">
                  <Input
                    placeholder="Token JWT (sem o prefixo Bearer)"
                    value={authToken}
                    onChange={(e) => setAuthToken(e.target.value)}
                    className="mb-2"
                  />
                  <textarea
                    className="w-full min-h-[120px] p-3 rounded-md border border-input bg-background text-sm resize-none"
                    placeholder="Insira os headers em formato JSON"
                    value={headers}
                    onChange={(e) => setHeaders(e.target.value)}
                  />
                </div>
              </TabsContent>
              <TabsContent value="body" className="space-y-2">
                <p className="text-sm text-muted-foreground">Corpo da requisição (para POST, PUT, PATCH)</p>
                <textarea
                  className="w-full min-h-[150px] p-3 rounded-md border border-input bg-background text-sm resize-none"
                  placeholder="Insira o corpo da requisição"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  disabled={method === "GET"}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleApiCall} 
              disabled={isLoading || !apiUrl}
              className="w-full"
            >
              {isLoading ? (
                <span className="flex items-center">Carregando...</span>
              ) : (
                <span className="flex items-center">
                  <Play className="mr-2 h-4 w-4" /> Executar
                </span>
              )}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resposta</CardTitle>
            <CardDescription>
              {response ? (
                <div className="flex items-center space-x-2">
                  <span>Status: </span>
                  {response.status >= 200 && response.status < 300 ? (
                    <Badge variant="success" className="flex items-center">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      {response.status} {response.statusText}
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="flex items-center">
                      <AlertCircle className="mr-1 h-3 w-3" />
                      {response.status} {response.statusText}
                    </Badge>
                  )}
                  <span className="text-sm text-muted-foreground">
                    Tempo: {response.time}ms
                  </span>
                </div>
              ) : (
                "Aguardando requisição"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {response ? (
              <div className="space-y-4">
                {response.error ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erro</AlertTitle>
                    <AlertDescription>{response.error}</AlertDescription>
                  </Alert>
                ) : (
                  <div className="relative">
                    <ScrollArea className="h-[300px] w-full rounded-md border p-4 bg-muted/50">
                      <pre className="text-sm">
                        {typeof response.data === "object"
                          ? JSON.stringify(response.data, null, 2)
                          : response.data}
                      </pre>
                    </ScrollArea>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 bg-background"
                      onClick={() => copyToClipboard(JSON.stringify(response.data, null, 2))}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px] border rounded-md bg-muted/20">
                <p className="text-muted-foreground">Nenhuma resposta para exibir</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Endpoints Disponíveis</CardTitle>
          <CardDescription>Lista de endpoints para teste</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">Estoque</h3>
              <Separator className="my-2" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 border rounded-md hover:bg-accent cursor-pointer" 
                  onClick={() => {
                    setApiUrl(`${baseUrl}/api/Estoque/verificar-congelamento`);
                    setMethod("GET");
                    setBody("");
                  }}>
                  <div className="flex items-center space-x-2">
                    <Badge>GET</Badge>
                    <span className="font-medium">Verificar Congelamento</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">/api/Estoque/verificar-congelamento</p>
                </div>
                
                <div className="p-4 border rounded-md hover:bg-accent cursor-pointer" 
                  onClick={() => {
                    setApiUrl(`${baseUrl}/api/Estoque/congelar`);
                    setMethod("PATCH");
                    setBody("true"); // ou "false" para descongelar
                  }}>
                  <div className="flex items-center space-x-2">
                    <Badge>PATCH</Badge>
                    <span className="font-medium">Congelar Estoque</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">/api/Estoque/congelar</p>
                  <p className="text-xs text-muted-foreground mt-1">Body: boolean (true/false)</p>
                </div>
                
                <div className="p-4 border rounded-md hover:bg-accent cursor-pointer" 
                  onClick={() => {
                    setApiUrl(`${baseUrl}/api/Estoque/atualizar`);
                    setMethod("PATCH");
                    setBody(JSON.stringify({
                      "codProduto": "PROD123",
                      "quantidade": 10,
                      "localEstoque": 1,
                      "codInventario": "INV001"
                    }, null, 2));
                  }}>
                  <div className="flex items-center space-x-2">
                    <Badge>PATCH</Badge>
                    <span className="font-medium">Atualizar Estoque</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">/api/Estoque/atualizar</p>
                  <p className="text-xs text-muted-foreground mt-1">Body: AtualizarEstoqueRequest</p>
                </div>
                
                <div className="p-4 border rounded-md hover:bg-accent cursor-pointer" 
                  onClick={() => {
                    setApiUrl(`${baseUrl}/api/Estoque/atualizar-lista`);
                    setMethod("PATCH");
                    setBody(JSON.stringify([
                      {
                        "codProduto": "PROD123",
                        "quantidade": 10,
                        "localEstoque": 1,
                        "codInventario": "INV001"
                      },
                      {
                        "codProduto": "PROD456",
                        "quantidade": 5,
                        "localEstoque": 2,
                        "codInventario": "INV001"
                      }
                    ], null, 2));
                  }}>
                  <div className="flex items-center space-x-2">
                    <Badge>PATCH</Badge>
                    <span className="font-medium">Atualizar Lista de Estoque</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">/api/Estoque/atualizar-lista</p>
                  <p className="text-xs text-muted-foreground mt-1">Body: Array de AtualizarEstoqueRequest</p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium">Configuração</h3>
              <Separator className="my-2" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-md">
                  <h4 className="font-medium mb-2">URL Base da API</h4>
                  <div className="text-sm">
                    <p className="mb-2">A URL base da API é configurada através da variável de ambiente:</p>
                    <pre className="text-xs bg-muted p-2 rounded-md mt-1 overflow-auto">
{`VITE_API_BASE_URL=http://54.232.194.197:5001`}
                    </pre>
                    <p className="mt-2 text-xs text-muted-foreground">Você pode alterar temporariamente a URL base usando o campo no topo da página.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium">Esquemas (Schemas)</h3>
              <Separator className="my-2" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-md">
                  <h4 className="font-medium mb-2">AtualizarEstoqueRequest</h4>
                  <pre className="text-xs bg-muted p-2 rounded-md overflow-auto">
{`{
  "codProduto": "string",
  "quantidade": 0,
  "localEstoque": 0,
  "codInventario": "string"
}`}
                  </pre>
                </div>
                
                <div className="p-4 border rounded-md">
                  <h4 className="font-medium mb-2">Autenticação</h4>
                  <div className="text-sm">
                    <p className="mb-2">Esta API utiliza autenticação JWT com o esquema Bearer.</p>
                    <p className="text-xs text-muted-foreground">Exemplo de header:</p>
                    <pre className="text-xs bg-muted p-2 rounded-md mt-1 overflow-auto">
{`{
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}