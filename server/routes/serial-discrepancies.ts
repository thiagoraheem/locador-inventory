import { Router } from 'express';
import { SerialDiscrepancyController } from '../controllers/serial-discrepancy.controller';
import { isAuthenticated } from '../middlewares/auth.middleware';
import { getStorage } from '../db';

const router = Router();

// Função helper para obter controller inicializado
async function getController() {
  const storage = await getStorage();
  return new SerialDiscrepancyController(storage);
}

// Aplicar autenticação a todas as rotas
router.use(isAuthenticated);

// GET /api/serial-discrepancies/summary?inventoryId=X - Obter resumo das divergências
// IMPORTANTE: Esta rota deve vir ANTES da rota /:inventoryId para evitar conflitos
router.get('/summary', async (req, res) => {
  try {
    const controller = await getController();
    await controller.getDiscrepanciesSummary(req, res);
  } catch (error) {
    console.error('Erro ao obter resumo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/serial-discrepancies/:inventoryId - Listar divergências de um inventário
router.get('/:inventoryId', async (req, res) => {
  try {
    const controller = await getController();
    await controller.getDiscrepancies(req, res);
  } catch (error) {
    console.error('Erro ao listar divergências:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/serial-discrepancies/process - Processar divergências
router.post('/process', async (req, res) => {
  try {
    const controller = await getController();
    const { inventoryId } = req.body;
    const parsedInventoryId = parseInt(inventoryId);

    if (!inventoryId || isNaN(parsedInventoryId)) {
      return res.status(400).json({ error: 'ID do inventário inválido' });
    }

    // Criar um objeto request modificado para o controller
    const modifiedReq = {
      ...req,
      params: { inventoryId: parsedInventoryId.toString() }
    };

    await controller.processDiscrepancies(modifiedReq as any, res);
  } catch (error) {
    console.error('Erro ao processar divergências:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/serial-discrepancies/:inventoryId/process - Processar divergências (rota alternativa)
router.post('/:inventoryId/process', async (req, res) => {
  try {
    const controller = await getController();
    const inventoryId = parseInt(req.params.inventoryId);

    if (isNaN(inventoryId)) {
      return res.status(400).json({ error: 'ID do inventário inválido' });
    }

    await controller.processDiscrepancies(req, res);
  } catch (error) {
    console.error('Erro ao processar divergências:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
})

// PUT /api/serial-discrepancies/:discrepancyId/resolve - Resolver divergência
router.put('/:discrepancyId/resolve', async (req, res) => {
  try {
    const controller = await getController();
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
    const controller = await getController();
    await controller.exportDiscrepancies(req, res);
  } catch (error) {
    console.error('Erro ao exportar divergências:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/serial-discrepancies/:inventoryId/migrate-to-erp - Marcar como migrado para ERP
router.post('/:inventoryId/migrate-to-erp', async (req, res) => {
  try {
    const controller = await getController();
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