import { Request, Response } from 'express';
import { SimpleStorage } from '../simple-storage';
import { asyncHandler } from '../utils/async-handler';

export interface SerialDiscrepancy {
  id: number;
  inventoryId: number;
  serialNumber: string;
  productId: number;
  productSku: string;
  productName: string;
  expectedLocationId?: number;
  expectedLocationCode?: string;
  expectedLocationName?: string;
  foundLocationId?: number;
  foundLocationCode?: string;
  foundLocationName?: string;
  discrepancyType: 'LOCATION_MISMATCH' | 'NOT_FOUND' | 'UNEXPECTED_FOUND';
  status: 'PENDING' | 'RESOLVED' | 'MIGRATED_TO_ERP';
  foundBy?: string;
  foundAt?: Date;
  countStage?: string;
  notes?: string;
  resolutionNotes?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  migratedToERP: boolean;
  migratedAt?: Date;
  migratedBy?: string;
  erpResponse?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SerialDiscrepancySummary {
  totalDiscrepancies: number;
  locationMismatches: number;
  notFound: number;
  unexpectedFound: number;
  byStatus: {
    pending: number;
    resolved: number;
    migratedToERP: number;
  };
}

export class SerialDiscrepancyController {
  constructor(private storage: SimpleStorage) {}

  // Listar todas as divergências de um inventário
  getDiscrepancies = asyncHandler(async (req: Request, res: Response) => {
    const inventoryId = parseInt(req.params.inventoryId);
    const { type, status, page = 1, limit = 50 } = req.query;

    if (!inventoryId) {
      return res.status(400).json({ error: 'ID do inventário é obrigatório' });
    }

    try {
      const discrepancies = await this.storage.getSerialDiscrepancies({
        inventoryId,
        type: type as string,
        status: status as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      });

      res.json(discrepancies);
    } catch (error) {
      console.error('Erro ao buscar divergências:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Obter resumo das divergências
  getDiscrepanciesSummary = asyncHandler(async (req: Request, res: Response) => {
    const inventoryId = parseInt(req.params.inventoryId);

    if (!inventoryId) {
      return res.status(400).json({ error: 'ID do inventário é obrigatório' });
    }

    try {
      const summary = await this.storage.getSerialDiscrepanciesSummary(inventoryId);
      res.json(summary);
    } catch (error) {
      console.error('Erro ao buscar resumo de divergências:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Processar divergências de um inventário
  processDiscrepancies = asyncHandler(async (req: Request, res: Response) => {
    const inventoryId = parseInt(req.params.inventoryId);
    const userId = req.user?.id;

    if (!inventoryId) {
      return res.status(400).json({ error: 'ID do inventário é obrigatório' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    try {
      const result = await this.storage.processSerialDiscrepancies(inventoryId);
      
      // Log da operação
      console.log(`Divergências processadas para inventário ${inventoryId} por usuário ${userId}:`, result);
      
      res.json({
        success: true,
        message: 'Divergências processadas com sucesso',
        ...result
      });
    } catch (error) {
      console.error('Erro ao processar divergências:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Marcar divergência como resolvida
  resolveDiscrepancy = asyncHandler(async (req: Request, res: Response) => {
    const discrepancyId = parseInt(req.params.id);
    const { resolutionNotes } = req.body;
    const userId = req.user?.id;

    if (!discrepancyId) {
      return res.status(400).json({ error: 'ID da divergência é obrigatório' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    try {
      await this.storage.resolveSerialDiscrepancy(discrepancyId, userId, resolutionNotes);
      
      res.json({
        success: true,
        message: 'Divergência marcada como resolvida'
      });
    } catch (error) {
      console.error('Erro ao resolver divergência:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Exportar divergências para Excel/CSV
  exportDiscrepancies = asyncHandler(async (req: Request, res: Response) => {
    const inventoryId = parseInt(req.params.inventoryId);
    const { format = 'csv', type, status } = req.query;

    if (!inventoryId) {
      return res.status(400).json({ error: 'ID do inventário é obrigatório' });
    }

    try {
      const discrepancies = await this.storage.getSerialDiscrepancies({
        inventoryId,
        type: type as string,
        status: status as string,
        page: 1,
        limit: 10000 // Exportar todos
      });

      if (format === 'csv') {
        const csvContent = this.generateCSV(discrepancies.items);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="divergencias-serie-${inventoryId}.csv"`);
        res.send(csvContent);
      } else {
        res.json(discrepancies.items);
      }
    } catch (error) {
      console.error('Erro ao exportar divergências:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Marcar divergências como migradas para ERP
  markAsMigratedToERP = asyncHandler(async (req: Request, res: Response) => {
    const inventoryId = parseInt(req.params.inventoryId);
    const { erpResponse } = req.body;
    const userId = req.user?.id;

    if (!inventoryId) {
      return res.status(400).json({ error: 'ID do inventário é obrigatório' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    try {
      const result = await this.storage.markDiscrepanciesAsMigrated(inventoryId, userId.toString(), erpResponse);
      
      res.json({
        success: true,
        message: 'Divergências marcadas como migradas para ERP',
        migratedCount: result.migratedCount
      });
    } catch (error) {
      console.error('Erro ao marcar divergências como migradas:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Método auxiliar para gerar CSV
  private generateCSV(discrepancies: SerialDiscrepancy[]): string {
    const headers = [
      'Número de Série',
      'Produto (SKU)',
      'Produto (Nome)',
      'Tipo de Divergência',
      'Local Esperado',
      'Local Encontrado',
      'Status',
      'Encontrado Por',
      'Data Encontrado',
      'Observações'
    ];

    const rows = discrepancies.map(d => [
      d.serialNumber,
      d.productSku,
      d.productName,
      this.getDiscrepancyTypeLabel(d.discrepancyType),
      d.expectedLocationName || 'N/A',
      d.foundLocationName || 'N/A',
      this.getStatusLabel(d.status),
      d.foundBy || 'N/A',
      d.foundAt ? new Date(d.foundAt).toLocaleString('pt-BR') : 'N/A',
      d.notes || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }

  private getDiscrepancyTypeLabel(type: string): string {
    switch (type) {
      case 'LOCATION_MISMATCH': return 'Local Diferente';
      case 'NOT_FOUND': return 'Não Encontrado';
      case 'UNEXPECTED_FOUND': return 'Encontrado Inesperado';
      default: return type;
    }
  }

  private getStatusLabel(status: string): string {
    switch (status) {
      case 'PENDING': return 'Pendente';
      case 'RESOLVED': return 'Resolvido';
      case 'MIGRATED_TO_ERP': return 'Migrado para ERP';
      default: return status;
    }
  }
}