import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Header from "@/components/layout/header";
import { Lock, Calculator, FileText, Shield, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

export default function ParametersRules() {
  return (
    <div className="space-y-6">
      <Header 
        title="Parâmetros / Regras" 
        subtitle="Funcionamento do sistema de inventário e regras de contagem"
      />

      {/* Congelamento de Dados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-blue-600" />
            Congelamento de Dados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700">
            Antes do início de qualquer contagem, os seguintes dados são <strong>congelados</strong> a partir da integração com o sistema externo (Locador ou equivalente):
          </p>
          
          <ul className="list-disc pl-6 space-y-2">
            <li>Lista de produtos com seus respectivos <strong>números de série</strong></li>
            <li>Categorias e grupos/subgrupos dos produtos</li>
            <li>Estoque atual por produto/local</li>
            <li>Endereçamento e locais físicos de armazenamento</li>
          </ul>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              O congelamento ocorre até 24h antes do início do inventário e impede alterações no sistema base enquanto as contagens estiverem ativas.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Regras de Contagem */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-green-600" />
            Regras de Contagem
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Contagem 1 */}
          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
              Contagem 1 
              <Badge variant="destructive">Obrigatória</Badge>
            </h3>
            <ul className="list-disc pl-4 space-y-1">
              <li>Realizada por um primeiro colaborador</li>
              <li>Input manual no sistema com hora e usuário identificados</li>
            </ul>
          </div>

          {/* Contagem 2 */}
          <div className="border-l-4 border-green-500 pl-4">
            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
              Contagem 2 
              <Badge variant="destructive">Obrigatória</Badge>
            </h3>
            <ul className="list-disc pl-4 space-y-1">
              <li>Realizada por um segundo colaborador <strong>diferente do primeiro</strong></li>
              <li>Registrada de forma cega (sem acesso à contagem anterior ou ao estoque congelado)</li>
            </ul>
          </div>

          {/* Comparação */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-3">Comparação entre as duas primeiras contagens:</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                <span className="text-sm">
                  <strong>Se uma das duas contagens (1ª ou 2ª) for igual ao estoque congelado:</strong> o valor do estoque é mantido como correto.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-yellow-600 mt-1 flex-shrink-0" />
                <span className="text-sm">
                  <strong>Se 1ª e 2ª contagens forem iguais entre si, mas diferentes do estoque:</strong> considera-se <strong>divergência válida</strong>, e assume-se o valor da <strong>2ª contagem</strong> como o valor final.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-600 mt-1 flex-shrink-0" />
                <span className="text-sm">
                  <strong>Se houver divergência entre 1ª e 2ª contagens e nenhuma for igual ao estoque congelado:</strong> habilita-se a <strong>3ª contagem obrigatória</strong>.
                </span>
              </div>
            </div>
          </div>

          {/* Contagem 3 */}
          <div className="border-l-4 border-orange-500 pl-4">
            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
              Contagem 3 
              <Badge variant="outline">Condicional</Badge>
            </h3>
            <ul className="list-disc pl-4 space-y-1">
              <li>Executada por um terceiro colaborador designado</li>
              <li>Considerada o <strong>valor final</strong> para aquele item específico</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Cálculo do Resultado Final */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-purple-600" />
            Cálculo do Resultado Final
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-3 text-left font-semibold">Situação</th>
                  <th className="border border-gray-300 p-3 text-left font-semibold">Valor Final Considerado</th>
                  <th className="border border-gray-300 p-3 text-center font-semibold">Divergência?</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 p-3">1ª == 2ª == estoque</td>
                  <td className="border border-gray-300 p-3">Estoque congelado</td>
                  <td className="border border-gray-300 p-3 text-center">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">❌ Não</Badge>
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-300 p-3">1ª ou 2ª == estoque</td>
                  <td className="border border-gray-300 p-3">Estoque congelado</td>
                  <td className="border border-gray-300 p-3 text-center">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">❌ Não</Badge>
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-3">1ª == 2ª ≠ estoque</td>
                  <td className="border border-gray-300 p-3">2ª Contagem</td>
                  <td className="border border-gray-300 p-3 text-center">
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">✅ Sim</Badge>
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-300 p-3">1ª ≠ 2ª ≠ estoque</td>
                  <td className="border border-gray-300 p-3">3ª Contagem (obrigatória)</td>
                  <td className="border border-gray-300 p-3 text-center">
                    <Badge variant="secondary" className="bg-red-100 text-red-800">✅ Sim</Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Relatório Final */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            Relatório Final
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700">
            Ao término do inventário, o sistema deve gerar um relatório completo contendo:
          </p>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Dados do Inventário:</h4>
              <ul className="list-disc pl-4 space-y-1 text-sm">
                <li>Identificação do inventário (tipo, data, filial)</li>
                <li>Listagem de produtos contados</li>
                <li>Quantidade por contagem (1ª, 2ª, 3ª quando houver)</li>
                <li>Estoque congelado</li>
                <li>Valor final assumido</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Análise de Divergências:</h4>
              <ul className="list-disc pl-4 space-y-1 text-sm">
                <li>Divergência (Sim/Não)</li>
                <li>Valor da divergência em quantidade e percentual</li>
                <li>Total de itens com divergência</li>
                <li>% de acuracidade</li>
                <li>Valor financeiro total das sobras e faltas</li>
              </ul>
            </div>
          </div>

          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              O relatório será exportável em <strong>PDF</strong> e <strong>Excel</strong>, com assinatura eletrônica do responsável.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Regras de Segurança */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-600" />
            Regras de Segurança e Rastreabilidade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-6 space-y-2">
            <li>Cada contagem é registrada com usuário, data/hora e localização</li>
            <li>Acesso às contagens é controlado por papel de usuário</li>
            <li>Logs de auditoria são mantidos para todos os ajustes e decisões finais</li>
          </ul>
        </CardContent>
      </Card>

      {/* Footer note */}
      <div className="text-center text-sm text-gray-500 py-4">
        <p>Esta documentação será aprimorada conforme necessidades específicas do sistema.</p>
      </div>
    </div>
  );
}