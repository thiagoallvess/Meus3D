export interface CalculatorValues {
  weight: number;
  filamentCostKg: number;
  totalAuxiliaryCost?: number;
  printTime: number; // in hours
  powerWatts: number;
  kwhCost: number;
  quantity: number;
  packagingCost: number;
  shippingCost: number;
  platformFee: number; // percentage
  otherCosts: number;
  machineHourCost: number;
  postProcessing: number;
  designCost: number;
  failureRate: number; // percentage
  consignedPercentage?: number;
  piecesPerKit?: number;
  salePrice: number;
  salePriceMarketplace: number;
}

export interface CalculatorResults {
  quantity: number;
  filamentCost: number;
  auxiliaryCost: number;
  energyCost: number;
  machineCost: number;
  totalPrintCost: number;
  unitCost: number;
  unitCostProduction: number;
  unitCostTotalFull: number;
  platformFeeValue: number;
  totalPlatformFee: number;
  totalPackagingCost: number;
  totalShippingCost: number;
  totalPostProcessing: number;
  totalDesignCost: number;
  totalOtherCosts: number;
  totalFailureCost: number;
  totalConsignedCost: number;
  unitProfitDirect: number;
  totalProfitDirect: number;
  profitMarginDirect: number;
  totalRevenueDirect: number;
  unitProfitMarketplace: number;
  totalProfitMarketplace: number;
  profitMarginMarketplace: number;
  totalRevenueMarketplace: number;
}

export function computeResults(values: CalculatorValues): CalculatorResults {
  const {
      weight, filamentCostKg, printTime, powerWatts,
      kwhCost, quantity, packagingCost, shippingCost,
      platformFee, otherCosts, machineHourCost,
      postProcessing, designCost, failureRate, salePrice, salePriceMarketplace,
      consignedPercentage
  } = values;

  // Potência em kW = watts / 1000
  const powerKw = powerWatts / 1000;

  // Custo do filamento (lote inteiro)
  const filamentCost = (weight / 1000) * filamentCostKg;
  const totalAuxiliaryCost = values.totalAuxiliaryCost || 0;

  // Custo de energia (lote inteiro)
  const energyCost = printTime * powerKw * kwhCost;

  // Custo da máquina (lote inteiro) = custo_hora * tempo
  const machineCost = machineHourCost * printTime;

  // Custo total de produção (lote inteiro, antes da falha)
  const totalPrintCost = filamentCost + energyCost + machineCost + totalAuxiliaryCost;

  // Multiplicador de falha: reserva para reimpressões
  const failureMultiplier = 1 + (failureRate / 100);

  // Custo de falha total (adicional devido à taxa de falha)
  const totalFailureCost = totalPrintCost * (failureRate / 100);

  // Custos de produção por unidade (por kit ou peça individual)
  const productionCostPerUnit = (totalPrintCost / quantity) * failureMultiplier;

  // Quantidade de peças por unidade (1 para peça avulsa, N para kits)
  const piecesPerUnit = values.piecesPerKit || 1;
  const totalPieces = quantity * piecesPerUnit;

  // Custos operacionais e extras totais
  const totalPackagingCost = packagingCost * quantity;
  const totalShippingCost = shippingCost * quantity;
  const totalPostProcessing = postProcessing * totalPieces;
  const totalDesignCost = designCost * totalPieces;
  const totalOtherCosts = otherCosts;

  // Custos operacionais de mão de obra por unidade vendida (kit ou peça)
  const postProcessingPerUnit = postProcessing * piecesPerUnit;
  const designCostPerUnit = designCost * piecesPerUnit;

  // Custos fixos por unidade (não afetados pela falha)
  const fixedCostPerUnit = packagingCost + shippingCost + (otherCosts / quantity) + postProcessingPerUnit + designCostPerUnit;

  // Custo de produção puro (sem embalagem e frete - usado para venda direta)
  const unitCostProduction = productionCostPerUnit + (otherCosts / quantity) + postProcessingPerUnit + designCostPerUnit;
  
  // Custo total por unidade base (inclui embalagem e frete)
  const unitCostBase = productionCostPerUnit + fixedCostPerUnit;

  // Consignado
  const unitConsignedCost = salePrice * ((consignedPercentage || 0) / 100);
  const totalConsignedCost = unitConsignedCost * quantity;
  
  // Custo total final (incluindo consignado)
  const unitCost = unitCostBase + unitConsignedCost;

  // Direto
  const unitProfitDirect = salePrice - unitCost;
  const totalProfitDirect = unitProfitDirect * quantity;
  const profitMarginDirect = salePrice > 0 ? (unitProfitDirect / salePrice) * 100 : 0;
  const totalRevenueDirect = salePrice * quantity;

  // Valor da taxa da plataforma por unidade
  const platformFeeValue = salePriceMarketplace * (platformFee / 100);
  const totalPlatformFee = platformFeeValue * quantity;

  // Custo total final (incluindo embalagem, frete e taxa da plataforma)
  const unitCostTotalFull = unitCost + platformFeeValue;

  // Marketplace
  const unitProfitMarketplace = salePriceMarketplace - unitCostTotalFull;
  const totalProfitMarketplace = unitProfitMarketplace * quantity;
  const profitMarginMarketplace = salePriceMarketplace > 0 ? (unitProfitMarketplace / salePriceMarketplace) * 100 : 0;
  const totalRevenueMarketplace = salePriceMarketplace * quantity;

  return {
      quantity,
      filamentCost,
      auxiliaryCost: totalAuxiliaryCost,
      energyCost,
      machineCost,
      totalPrintCost,
      unitCost,
      unitCostProduction,
      unitCostTotalFull,
      platformFeeValue,
      totalPlatformFee,
      totalPackagingCost,
      totalShippingCost,
      totalPostProcessing,
      totalDesignCost,
      totalOtherCosts,
      totalFailureCost,
      totalConsignedCost,
      unitProfitDirect,
      totalProfitDirect,
      profitMarginDirect,
      totalRevenueDirect,
      unitProfitMarketplace,
      totalProfitMarketplace,
      profitMarginMarketplace,
      totalRevenueMarketplace
  };
}
