import { Router } from 'express';
import { SerialDiscrepancyController } from '../controllers/serial-discrepancy.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const controller = new SerialDiscrepancyController();

// Aplicar autenticação a todas as rotas
router.use(authenticateToken);

// GET /api/serial-discrepancies/:inventoryId - Listar divergências de um inventário
router.get('/:inventoryId', async (req, res) => {
  try {
    const inventoryId = parseInt(req.params.inventoryId);
    const type = req.query.type as string;
    const status = req.query.status as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    if (isNaN(inventoryId)) {
      return res.status(400).json({ error: 'ID do inventário inválido' });
    }

    const result = await controller.listDiscrepancies({
      inventoryId,
      type,
      status,
      page,
      limit
    });

    res.json(result);
  } catch (error) {
    console.error('Erro ao listar divergências:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/serial-discrepancies/:inventoryId/summary - Obter resumo das divergências
router.get('/:inventoryId/summary', async (req, res) => {
  try {
    const inventoryId = parseInt(req.params.inventoryId);

    if (isNaN(inventoryId)) {
      return res.status(400).json({ error: 'ID do inventário inválido' });
    }

    const summary = await controller.getSummary(inventoryId);
    res.json(summary);
  } catch (error) {
    console.error('Erro ao obter resumo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/serial-discrepancies/:inventoryId/process - Processar divergências
router.post('/:inventoryId/process', async (req, res) => {
  try {
    const inventoryId = parseInt(req.params.inventoryId);

    if (isNaN(inventoryId)) {
      return res.status(400).json({ error: 'ID do inventário inválido' });
    }

    const result = await controller.processDiscrepancies(inventoryId);
    res.json(result);
  } catch (error) {
    console.error('Erro ao processar divergências:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/serial-discrepancies/:discrepancyId/resolve - Resolver divergência
router.put('/:discrepancyId/resolve', async (req, res) => {
  try {
    const discrepancyId = parseInt(req.params.discrepancyId);
    const { resolutionNotes } = req.body;
    const userId = (req as any).user?.id;

    if (isNaN(discrepancyId)) {
      return res.status(400).json({ error: 'ID da divergência inválido' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    await controller.resolveDiscrepancy(discrepancyId, userId, resolutionNotes);
    res.json({ success: true, message: 'Divergência resolvida com sucesso' });
  } catch (error) {
    console.error('Erro ao resolver divergência:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/serial-discrepancies/:inventoryId/export - Exportar divergências
router.get('/:inventoryId/export', async (req, res) => {
  try {
    const inventoryId = parseInt(req.params.inventoryId);
    const format = req.query.format as string || 'json';

    if (isNaN(inventoryId)) {
      return res.status(400).json({ error: 'ID do inventário inválido' });
    }

    const exportData = await controller.exportDiscrepancies(inventoryId, format);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="divergencias-${inventoryId}.csv"`);
    } else {
      res.setHeader('Content-Type', 'application/json');
    }

    res.send(exportData);
  } catch (error) {
    console.error('Erro ao exportar divergências:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/serial-discrepancies/:inventoryId/migrate-to-erp - Marcar como migrado para ERP
router.post('/:inventoryId/migrate-to-erp', async (req, res) => {
  try {
    const inventoryId = parseInt(req.params.inventoryId);
    const { erpResponse } = req.body;
    const userId = (req as any).user?.id;

    if (isNaN(inventoryId)) {
      return res.status(400).json({ error: 'ID do inventário inválido' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const result = await controller.markAsMigratedToERP(inventoryId, userId.toString(), erpResponse);
    res.json(result);
  } catch (error) {
    console.error('Erro ao marcar como migrado:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;