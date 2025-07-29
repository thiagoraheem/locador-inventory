import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Warehouse, ClipboardList, History } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">LOCADOR</h1>
              <p className="text-gray-600">Módulo de Inventário</p>
            </div>
          </div>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto">
            Plataforma completa para controle de estoque com processo de contagem em três etapas, 
            logs de auditoria e gerenciamento completo de fluxo de trabalho.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="text-center">
              <Package className="h-8 w-8 text-primary mx-auto mb-2" />
              <CardTitle className="text-lg">Gestão de Produtos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 text-center">
                Cadastro e controle completo de produtos com SKU, categorias e detalhes.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <Warehouse className="h-8 w-8 text-primary mx-auto mb-2" />
              <CardTitle className="text-lg">Locais de Estoque</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 text-center">
                Gerenciamento de múltiplos locais de armazenamento e suas capacidades.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <ClipboardList className="h-8 w-8 text-primary mx-auto mb-2" />
              <CardTitle className="text-lg">Inventários</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 text-center">
                Processo de contagem em três etapas para máxima precisão nos inventários.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <History className="h-8 w-8 text-primary mx-auto mb-2" />
              <CardTitle className="text-lg">Auditoria</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 text-center">
                Logs completos de auditoria para rastreamento de todas as operações.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Login Button */}
        <div className="text-center">
          <Button 
            size="lg" 
            onClick={() => window.location.href = '/api/login'}
            className="px-8 py-3 text-lg"
          >
            Fazer Login
          </Button>
          <p className="text-sm text-gray-600 mt-4">
            Entre com sua conta para acessar o sistema
          </p>
        </div>

        {/* Benefits */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
            Principais Benefícios
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
            <div>
              <strong className="text-gray-900">Controle Preciso:</strong> Sistema de três contagens 
              garante máxima precisão nos inventários.
            </div>
            <div>
              <strong className="text-gray-900">Auditoria Completa:</strong> Rastreamento detalhado 
              de todas as operações realizadas.
            </div>
            <div>
              <strong className="text-gray-900">Interface Profissional:</strong> Design moderno e 
              intuitivo para uso empresarial.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
