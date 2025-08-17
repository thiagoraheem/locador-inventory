import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useShowMoney } from "../../contexts/ShowMoneyContext";
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Shield, 
  FileCheck, 
  Lock,
  TrendingUp,
  Calendar,
  Users
} from "lucide-react";
import { CompliancePanelProps, ComplianceData } from "../../../../shared/dashboard-types";

const CompliancePanel: React.FC<CompliancePanelProps> = ({
  data,
  title = "Processo e Conformidade",
  showDetails = true,
  loading = false,
  className
}) => {
  const { showMoney } = useShowMoney();
  if (loading) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
          <Skeleton className="h-4 sm:h-5 w-36 sm:w-48" />
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-3 sm:space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-3 w-3 sm:h-4 sm:w-4 rounded" />
                <Skeleton className="h-3 sm:h-4 w-24 sm:w-32" />
              </div>
              <Skeleton className="h-4 sm:h-5 w-12 sm:w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const getComplianceStatus = (compliance: ComplianceData) => {
    const issues = [];
    
    if (compliance.scheduleAdherencePct < 90) {
      issues.push("Aderência ao cronograma baixa");
    }
    
    if (!compliance.preInventoryDone) {
      issues.push("Pré-inventário não concluído");
    }
    
    if (compliance.movementsBlocked === false) {
      issues.push("Movimentações não bloqueadas");
    }
    
    if (compliance.needsBOOver20k) {
      issues.push(showMoney ? "Necessário BO para itens > R$ 20k" : "Necessário BO para itens > *** ");
    }
    
    return {
      isCompliant: issues.length === 0,
      issues,
      score: Math.max(0, 100 - (issues.length * 25))
    };
  };

  const complianceStatus = getComplianceStatus(data);

  const ComplianceItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    status: boolean | number;
    type?: "boolean" | "percentage";
    critical?: boolean;
  }> = ({ icon, label, status, type = "boolean", critical = false }) => {
    const isGood = type === "boolean" ? status === true : (status as number) >= 90;
    const isWarning = type === "percentage" && (status as number) >= 70 && (status as number) < 90;
    
    return (
      <div className="flex items-center justify-between py-1 sm:py-2">
        <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
          <div className={cn(
            "p-1 rounded-full flex-shrink-0",
            isGood ? "bg-green-100 text-green-600" : 
            isWarning ? "bg-yellow-100 text-yellow-600" : 
            "bg-red-100 text-red-600"
          )}>
            {icon}
          </div>
          <span className="text-xs sm:text-sm font-medium truncate">{label}</span>
        </div>
        
        <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
          {type === "percentage" ? (
            <>
              <span className="text-xs sm:text-sm text-muted-foreground">
                {(status as number).toFixed(1)}%
              </span>
              <Badge 
                variant={isGood ? "default" : isWarning ? "secondary" : "destructive"}
                className="text-xs"
                size="sm"
              >
                {isGood ? "OK" : isWarning ? "Atenção" : "Crítico"}
              </Badge>
            </>
          ) : (
            <Badge 
              variant={status ? "default" : critical ? "destructive" : "secondary"}
              className="text-xs"
              size="sm"
            >
              {status ? "Sim" : "Não"}
            </Badge>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg font-semibold truncate">{title}</CardTitle>
          <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
            <Badge 
              variant={complianceStatus.isCompliant ? "default" : "destructive"}
              className="text-xs"
              size="sm"
            >
              {complianceStatus.isCompliant ? "Conforme" : "Não Conforme"}
            </Badge>
            <span className="text-xs sm:text-sm text-muted-foreground">
              {complianceStatus.score}%
            </span>
          </div>
        </div>
        
        {!complianceStatus.isCompliant && (
          <Progress 
            value={complianceStatus.score} 
            className="h-1 sm:h-2 mt-2"
          />
        )}
      </CardHeader>
      
      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-1">
        <ComplianceItem
          icon={<Calendar className="h-4 w-4" />}
          label="Aderência ao Cronograma"
          status={data.scheduleAdherencePct}
          type="percentage"
        />
        
        <ComplianceItem
          icon={<Lock className="h-4 w-4" />}
          label="Movimentações Bloqueadas"
          status={data.movementsBlocked}
          critical
        />
        
        <ComplianceItem
          icon={<FileCheck className="h-4 w-4" />}
          label="Pré-inventário Concluído"
          status={data.preInventoryDone}
          critical
        />
        
        <ComplianceItem
          icon={<Shield className="h-4 w-4" />}
          label={showMoney ? "BO para Itens > R$ 20k" : "BO para Itens > ***"}
          status={!data.needsBOOver20k}
        />
        
        {showDetails && complianceStatus.issues.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Pendências:</h4>
            {complianceStatus.issues.map((issue, index) => (
              <Alert key={index} className="py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {issue}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Specialized Compliance Panel variants
export const ProcessStatusPanel: React.FC<{
  inventoryStarted: boolean;
  inventoryCompleted: boolean;
  reportsGenerated: boolean;
  auditCompleted: boolean;
  loading?: boolean;
  className?: string;
}> = ({ 
  inventoryStarted, 
  inventoryCompleted, 
  reportsGenerated, 
  auditCompleted, 
  loading, 
  className 
}) => {
  const steps = [
    { label: "Inventário Iniciado", status: inventoryStarted, icon: <Clock className="h-4 w-4" /> },
    { label: "Contagem Concluída", status: inventoryCompleted, icon: <CheckCircle className="h-4 w-4" /> },
    { label: "Relatórios Gerados", status: reportsGenerated, icon: <FileCheck className="h-4 w-4" /> },
    { label: "Auditoria Finalizada", status: auditCompleted, icon: <Shield className="h-4 w-4" /> }
  ];

  const completedSteps = steps.filter(step => step.status).length;
  const progress = (completedSteps / steps.length) * 100;

  if (loading) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Status do Processo</CardTitle>
          <Badge variant="outline" className="text-xs">
            {completedSteps}/{steps.length} Etapas
          </Badge>
        </div>
        <Progress value={progress} className="h-2 mt-2" />
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center space-x-3">
              <div className={cn(
                "p-2 rounded-full",
                step.status ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
              )}>
                {step.status ? <CheckCircle className="h-4 w-4" /> : step.icon}
              </div>
              <span className={cn(
                "text-sm font-medium",
                step.status ? "text-foreground" : "text-muted-foreground"
              )}>
                {step.label}
              </span>
              <div className="flex-1" />
              {step.status && (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export const SecurityCompliancePanel: React.FC<{
  accessControlEnabled: boolean;
  auditLogEnabled: boolean;
  dataEncrypted: boolean;
  backupCompleted: boolean;
  lastBackup?: string;
  loading?: boolean;
  className?: string;
}> = ({ 
  accessControlEnabled, 
  auditLogEnabled, 
  dataEncrypted, 
  backupCompleted, 
  lastBackup,
  loading, 
  className 
}) => {
  const securityItems = [
    { 
      label: "Controle de Acesso", 
      status: accessControlEnabled, 
      icon: <Users className="h-4 w-4" />,
      critical: true
    },
    { 
      label: "Log de Auditoria", 
      status: auditLogEnabled, 
      icon: <FileCheck className="h-4 w-4" />,
      critical: true
    },
    { 
      label: "Dados Criptografados", 
      status: dataEncrypted, 
      icon: <Shield className="h-4 w-4" />,
      critical: true
    },
    { 
      label: "Backup Atualizado", 
      status: backupCompleted, 
      icon: <CheckCircle className="h-4 w-4" />,
      critical: false
    }
  ];

  const criticalIssues = securityItems.filter(item => item.critical && !item.status).length;
  const isSecure = criticalIssues === 0;

  if (loading) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Segurança e Conformidade</CardTitle>
          <Badge 
            variant={isSecure ? "default" : "destructive"}
            className="text-xs"
          >
            {isSecure ? "Seguro" : `${criticalIssues} Crítico(s)`}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-2">
        {securityItems.map((item, index) => (
          <div key={index} className="flex items-center justify-between py-1">
            <div className="flex items-center space-x-3">
              <div className={cn(
                "p-1 rounded-full",
                item.status ? "bg-green-100 text-green-600" : 
                item.critical ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-600"
              )}>
                {item.icon}
              </div>
              <span className="text-sm font-medium">{item.label}</span>
            </div>
            
            <Badge 
              variant={item.status ? "default" : item.critical ? "destructive" : "secondary"}
              className="text-xs"
            >
              {item.status ? "OK" : item.critical ? "Crítico" : "Atenção"}
            </Badge>
          </div>
        ))}
        
        {lastBackup && (
          <div className="mt-4 pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Último backup: {new Date(lastBackup).toLocaleString('pt-BR')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CompliancePanel;