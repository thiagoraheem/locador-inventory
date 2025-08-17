import { DashboardSnapshot, DashboardItem, LocationProgress, CountRoundData, DivergenceData } from "../../../shared/dashboard-types";

// Mock data for dashboard testing and development
export const mockDashboardData: DashboardSnapshot = {
  snapshotAt: new Date().toISOString(),
  inventoryId: 1,
  inventoryCode: "INV-2025-001",
  inventoryStatus: "count2_open",
  totals: {
    itemsPlanned: 1250,
    itemsCounted: 937,
    progressPct: 75,
    accuracyPct: 92.5,
    divergenceValueBRL: 28750.50,
    totalValue: 2850000.00,
    expectedValue: 2821249.50,
    finalValue: 2850000.00
  },
  counts: [
    {
      round: 1,
      counted: 1250,
      consistentPct: 100,
      timestamp: Date.now() - 86400000 // 1 day ago
    },
    {
      round: 2,
      counted: 118,
      consistentPct: 90.5,
      timestamp: Date.now() - 43200000 // 12 hours ago
    },
    {
      round: 3,
      counted: 45,
      consistentPct: 88.9,
      timestamp: Date.now() - 21600000 // 6 hours ago
    }
  ] as CountRoundData[],
  byLocation: [
    {
      locationId: 1,
      locationName: "Almoxarifado Central",
      locationCode: "ALM-001",
      progressPct: 85,
      accuracyPct: 94.2,
      itemsPlanned: 450,
      itemsCounted: 383,
      divergenceCount: 12,
      divergenceValue: 8500.25
    },
    {
      locationId: 2,
      locationName: "Oficina de Manutenção",
      locationCode: "MAN-001",
      progressPct: 72,
      accuracyPct: 89.8,
      itemsPlanned: 320,
      itemsCounted: 230,
      divergenceCount: 18,
      divergenceValue: 12750.75
    },
    {
      locationId: 3,
      locationName: "Área de Sucata",
      locationCode: "SUC-001",
      progressPct: 68,
      accuracyPct: 96.1,
      itemsPlanned: 280,
      itemsCounted: 190,
      divergenceCount: 5,
      divergenceValue: 3200.00
    },
    {
      locationId: 4,
      locationName: "Estoque de Peças",
      locationCode: "EST-001",
      progressPct: 78,
      accuracyPct: 91.5,
      itemsPlanned: 200,
      itemsCounted: 134,
      divergenceCount: 8,
      divergenceValue: 4299.50
    }
  ] as LocationProgress[],
  pendingVsDone: {
    pending: 313,
    done: 937,
    inProgress: 45
  },
  divergences: [
    {
      type: "Falta",
      qty: 28,
      valueBRL: 18750.25,
      percentage: 65.2
    },
    {
      type: "Sobra",
      qty: 15,
      valueBRL: 7200.50,
      percentage: 25.0
    },
    {
      type: "Erro de Registro",
      qty: 8,
      valueBRL: 2100.00,
      percentage: 7.3
    },
    {
      type: "Mov. Não Contab.",
      qty: 3,
      valueBRL: 699.75,
      percentage: 2.5
    }
  ] as DivergenceData[],
  adjustments: {
    immediatePct: 65,
    postponedPct: 35,
    totalAdjustments: 54,
    pendingAdjustments: 19
  },
  compliance: {
    scheduleAdherencePct: 87.5,
    movementsBlocked: true,
    preInventoryDone: true,
    needsBOOver20k: true,
    inventoryType: "Cíclico",
    blockSystemMovements: true,
    signedLists: true,
    doubleBlindCounting: true
  },
  items: [
    {
      itemId: "INV-001-0001",
      inventoryItemId: 1001,
      productId: 101,
      productSku: "CP-000123",
      productName: "Bomba Centrífuga 5HP",
      locationId: 1,
      locationName: "Almoxarifado Central",
      categoryId: 1,
      categoryName: "Equipamentos",
      expectedQty: 4,
      count1Qty: 4,
      count2Qty: null,
      count3Qty: null,
      finalQty: 4,
      divergence: {
        type: "Nenhuma",
        quantity: 0,
        valueBRL: 0,
        percentage: 0
      },
      status: "Conforme",
      accuracy: 100,
      costValue: 2500.00,
      totalValue: 10000.00,
      lastCountAt: Date.now() - 86400000,
      lastCountBy: 1
    },
    {
      itemId: "INV-001-0002",
      inventoryItemId: 1002,
      productId: 102,
      productSku: "MT-000456",
      productName: "Motor Elétrico 10HP",
      locationId: 2,
      locationName: "Oficina de Manutenção",
      categoryId: 1,
      categoryName: "Equipamentos",
      expectedQty: 2,
      count1Qty: 1,
      count2Qty: 1,
      count3Qty: null,
      finalQty: 1,
      divergence: {
        type: "Falta",
        quantity: -1,
        valueBRL: 4500.00,
        percentage: 50
      },
      status: "Divergente",
      accuracy: 50,
      costValue: 4500.00,
      totalValue: 9000.00,
      lastCountAt: Date.now() - 43200000,
      lastCountBy: 2
    },
    {
      itemId: "INV-001-0003",
      inventoryItemId: 1003,
      productId: 103,
      productSku: "VL-000789",
      productName: "Válvula Gaveta 4\"",
      locationId: 1,
      locationName: "Almoxarifado Central",
      categoryId: 2,
      categoryName: "Válvulas",
      expectedQty: 12,
      count1Qty: 14,
      count2Qty: 13,
      count3Qty: 13,
      finalQty: 13,
      divergence: {
        type: "Sobra",
        quantity: 1,
        valueBRL: 350.00,
        percentage: 8.3
      },
      status: "Concluído",
      accuracy: 91.7,
      costValue: 350.00,
      totalValue: 4550.00,
      lastCountAt: Date.now() - 21600000,
      lastCountBy: 3
    },
    {
      itemId: "INV-001-0004",
      inventoryItemId: 1004,
      productId: 104,
      productSku: "TB-001234",
      productName: "Tubo de Aço 6m",
      locationId: 3,
      locationName: "Área de Sucata",
      categoryId: 3,
      categoryName: "Materiais",
      expectedQty: 25,
      count1Qty: 25,
      count2Qty: null,
      count3Qty: null,
      finalQty: 25,
      divergence: {
        type: "Nenhuma",
        quantity: 0,
        valueBRL: 0,
        percentage: 0
      },
      status: "Conforme",
      accuracy: 100,
      costValue: 120.00,
      totalValue: 3000.00,
      lastCountAt: Date.now() - 86400000,
      lastCountBy: 1
    },
    {
      itemId: "INV-001-0005",
      inventoryItemId: 1005,
      productId: 105,
      productSku: "FL-005678",
      productName: "Filtro de Óleo Industrial",
      locationId: 4,
      locationName: "Estoque de Peças",
      categoryId: 4,
      categoryName: "Filtros",
      expectedQty: 8,
      count1Qty: 6,
      count2Qty: 7,
      count3Qty: null,
      finalQty: null,
      divergence: {
        type: "Divergência de Contagem",
        quantity: -1,
        valueBRL: 85.00,
        percentage: 12.5
      },
      status: "Recontagem Necessária",
      accuracy: 87.5,
      costValue: 85.00,
      totalValue: 680.00,
      lastCountAt: Date.now() - 43200000,
      lastCountBy: 2
    },
    {
      itemId: "INV-001-0006",
      inventoryItemId: 1006,
      productId: 106,
      productSku: "BR-009876",
      productName: "Broca de Aço Rápido 12mm",
      locationId: 2,
      locationName: "Oficina de Manutenção",
      categoryId: 5,
      categoryName: "Ferramentas",
      expectedQty: 15,
      count1Qty: 15,
      count2Qty: null,
      count3Qty: null,
      finalQty: 15,
      divergence: {
        type: "Nenhuma",
        quantity: 0,
        valueBRL: 0,
        percentage: 0
      },
      status: "Conforme",
      accuracy: 100,
      costValue: 25.50,
      totalValue: 382.50,
      lastCountAt: Date.now() - 86400000,
      lastCountBy: 3
    },
    {
      itemId: "INV-001-0007",
      inventoryItemId: 1007,
      productId: 107,
      productSku: "CB-112233",
      productName: "Cabo Elétrico 2.5mm²",
      locationId: 1,
      locationName: "Almoxarifado Central",
      categoryId: 6,
      categoryName: "Elétricos",
      expectedQty: 100,
      count1Qty: 95,
      count2Qty: 98,
      count3Qty: 97,
      finalQty: 97,
      divergence: {
        type: "Falta",
        quantity: -3,
        valueBRL: 45.00,
        percentage: 3
      },
      status: "Concluído",
      accuracy: 97,
      costValue: 15.00,
      totalValue: 1455.00,
      lastCountAt: Date.now() - 21600000,
      lastCountBy: 1
    },
    {
      itemId: "INV-001-0008",
      inventoryItemId: 1008,
      productId: 108,
      productSku: "PR-445566",
      productName: "Parafuso Sextavado M12x50",
      locationId: 4,
      locationName: "Estoque de Peças",
      categoryId: 7,
      categoryName: "Fixadores",
      expectedQty: 200,
      count1Qty: 205,
      count2Qty: null,
      count3Qty: null,
      finalQty: null,
      divergence: {
        type: "Sobra",
        quantity: 5,
        valueBRL: 12.50,
        percentage: 2.5
      },
      status: "Em Contagem",
      accuracy: 97.5,
      costValue: 2.50,
      totalValue: 512.50,
      lastCountAt: Date.now() - 86400000,
      lastCountBy: 2
    },
    {
      itemId: "INV-001-0009",
      inventoryItemId: 1009,
      productId: 109,
      productSku: "JT-778899",
      productName: "Junta de Vedação 50mm",
      locationId: 3,
      locationName: "Área de Sucata",
      categoryId: 8,
      categoryName: "Vedações",
      expectedQty: 30,
      count1Qty: 30,
      count2Qty: null,
      count3Qty: null,
      finalQty: 30,
      divergence: {
        type: "Nenhuma",
        quantity: 0,
        valueBRL: 0,
        percentage: 0
      },
      status: "Conforme",
      accuracy: 100,
      costValue: 18.75,
      totalValue: 562.50,
      lastCountAt: Date.now() - 86400000,
      lastCountBy: 3
    },
    {
      itemId: "INV-001-0010",
      inventoryItemId: 1010,
      productId: 110,
      productSku: "RL-334455",
      productName: "Rolamento 6205-2RS",
      locationId: 2,
      locationName: "Oficina de Manutenção",
      categoryId: 9,
      categoryName: "Rolamentos",
      expectedQty: 6,
      count1Qty: 4,
      count2Qty: 5,
      count3Qty: null,
      finalQty: null,
      divergence: {
        type: "Divergência de Contagem",
        quantity: -1,
        valueBRL: 125.00,
        percentage: 16.7
      },
      status: "Recontagem Necessária",
      accuracy: 83.3,
      costValue: 125.00,
      totalValue: 625.00,
      lastCountAt: Date.now() - 43200000,
      lastCountBy: 1
    }
  ] as DashboardItem[]
};

// Additional mock data for different scenarios
export const mockDashboardDataEmpty: DashboardSnapshot = {
  ...mockDashboardData,
  totals: {
    itemsPlanned: 0,
    itemsCounted: 0,
    progressPct: 0,
    accuracyPct: 0,
    divergenceValueBRL: 0,
    totalValue: 0,
    expectedValue: 0,
    finalValue: 0
  },
  items: []
};

export const mockDashboardDataHighDivergence: DashboardSnapshot = {
  ...mockDashboardData,
  totals: {
    ...mockDashboardData.totals,
    divergenceValueBRL: 45000.00,
    accuracyPct: 78.5
  },
  compliance: {
    ...mockDashboardData.compliance,
    needsBOOver20k: true,
    scheduleAdherencePct: 65.2
  }
};

// Export function to get mock data with optional delay (simulating API call)
export const getMockDashboardData = async (delay: number = 1000): Promise<DashboardSnapshot> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Update snapshot timestamp to current time
      const data = {
        ...mockDashboardData,
        snapshotAt: new Date().toISOString()
      };
      resolve(data);
    }, delay);
  });
};

// Export function to simulate API error
export const getMockDashboardDataWithError = async (delay: number = 1000): Promise<never> => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error("Falha ao carregar dados do dashboard"));
    }, delay);
  });
};

// Mock empty dashboard data for initial state
export const mockEmptyDashboard: DashboardSnapshot = {
  snapshotAt: new Date().toISOString(),
  inventoryId: 0,
  inventoryCode: "",
  inventoryStatus: "planning",
  totals: {
    itemsPlanned: 0,
    itemsCounted: 0,
    progressPct: 0,
    accuracyPct: 0,
    divergenceValueBRL: 0,
    totalValue: 0,
    expectedValue: 0,
    finalValue: 0
  },
  counts: [],
  byLocation: [],
  byStatus: {
    pending: 0,
    counted: 0,
    divergent: 0,
    consistent: 0
  },
  divergences: [],
  compliance: {
    processCompliancePct: 0,
    auditCompliancePct: 0,
    timeCompliancePct: 0,
    overallCompliancePct: 0
  },
  items: []
};

// Mock dashboard data with high divergence for testing
export const mockHighDivergenceDashboard: DashboardSnapshot = {
  ...mockDashboardData,
  totals: {
    ...mockDashboardData.totals,
    accuracyPct: 65.2,
    divergenceValueBRL: 125750.80,
    progressPct: 88
  },
  byLocation: mockDashboardData.byLocation.map(location => ({
    ...location,
    accuracyPct: Math.max(50, location.accuracyPct - 25),
    divergenceCount: location.divergenceCount * 3,
    divergenceValue: location.divergenceValue * 4.5
  })),
  compliance: {
    processCompliancePct: 72,
    auditCompliancePct: 68,
    timeCompliancePct: 85,
    overallCompliancePct: 75
  }
};

export default mockDashboardData;