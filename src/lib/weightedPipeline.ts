export enum DealStage {
  // Early Stage - Initial Contact
  LEAD_GENERATED = 'LEAD_GENERATED',
  INITIAL_CONTACT = 'INITIAL_CONTACT',
  NEEDS_ANALYSIS = 'NEEDS_ANALYSIS',

  // Qualification Stage - Understanding Requirements
  PROSPECTING = 'PROSPECTING',
  QUALIFICATION = 'QUALIFICATION',
  VALUE_PROPOSITION = 'VALUE_PROPOSITION',

  // Solution Development - Preparing Offer
  PROPOSAL_PREPARATION = 'PROPOSAL_PREPARATION',
  PROPOSAL = 'PROPOSAL',
  PROPOSAL_REVIEW = 'PROPOSAL_REVIEW',

  // Negotiation & Commitment
  NEGOTIATION = 'NEGOTIATION',
  CONTRACT_REVIEW = 'CONTRACT_REVIEW',
  FINAL_APPROVAL = 'FINAL_APPROVAL',

  // Closed Stages
  CLOSED_WON = 'CLOSED_WON',
  CLOSED_LOST = 'CLOSED_LOST',

  // Special States
  ON_HOLD = 'ON_HOLD',
  CANCELLED = 'CANCELLED',
  LOST_TO_COMPETITOR = 'LOST_TO_COMPETITOR'
}

export interface DealProbability {
  stage: DealStage;
  baseProbability: number;
  minProbability: number;
  maxProbability: number;
  avgDaysInStage: number;
  conversionRate: number;
}

export interface WeightedDeal {
  id: string;
  name: string;
  value: number;
  stage: DealStage;
  probability: number;
  weightedValue: number;
  expectedCloseDate?: Date;
  daysInStage: number;
  velocityScore: number;
  riskScore: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  lastActivity: Date;
  ownerId: string;
  ownerName?: string;
  ownerEmail?: string;
  // New fields for enhanced pipeline display
  companyName?: string;
  classification?: string;
  diameter?: string;
  quantity?: string;
  specification?: string;
  challenges?: string;
  status?: string; // Pipeline status dropdown field
  // Additional context for advanced analytics
  orderDate?: Date;
  closedDate?: Date;
  pipelineAgeDays?: number;
  salesCycleDays?: number;
}

export interface PipelineVelocityMetrics {
  qualifiedDeals: number;
  averageDealSize: number;
  winRate: number;
  salesCycleLengthDays: number;
  velocityPerDay: number;
  velocityPerMonth: number;
  dealsPerMonth: number;
}

export interface PipelineMetrics {
  totalDeals: number;
  totalValue: number;
  weightedValue: number;
  averageProbability: number;
  forecastAccuracy: number;
  velocity: number;
  velocityDetails?: PipelineVelocityMetrics;
  conversionRate: number;
  stageDistribution: Record<DealStage, number>;
  monthlyForecast: Array<{ month: string; value: number; weightedValue: number }>;
}

export class WeightedPipelineService {
  private static readonly PROBABILITIES: Record<DealStage, DealProbability> = {
    // Early Stage - Initial Contact
    [DealStage.LEAD_GENERATED]: {
      stage: DealStage.LEAD_GENERATED,
      baseProbability: 0.01,
      minProbability: 0.005,
      maxProbability: 0.03,
      avgDaysInStage: 7,
      conversionRate: 0.10
    },
    [DealStage.INITIAL_CONTACT]: {
      stage: DealStage.INITIAL_CONTACT,
      baseProbability: 0.03,
      minProbability: 0.01,
      maxProbability: 0.08,
      avgDaysInStage: 14,
      conversionRate: 0.15
    },
    [DealStage.NEEDS_ANALYSIS]: {
      stage: DealStage.NEEDS_ANALYSIS,
      baseProbability: 0.05,
      minProbability: 0.02,
      maxProbability: 0.12,
      avgDaysInStage: 21,
      conversionRate: 0.25
    },

    // Qualification Stage - Understanding Requirements
    [DealStage.PROSPECTING]: {
      stage: DealStage.PROSPECTING,
      baseProbability: 0.08,
      minProbability: 0.03,
      maxProbability: 0.18,
      avgDaysInStage: 30,
      conversionRate: 0.30
    },
    [DealStage.QUALIFICATION]: {
      stage: DealStage.QUALIFICATION,
      baseProbability: 0.25,
      minProbability: 0.15,
      maxProbability: 0.40,
      avgDaysInStage: 45,
      conversionRate: 0.45
    },
    [DealStage.VALUE_PROPOSITION]: {
      stage: DealStage.VALUE_PROPOSITION,
      baseProbability: 0.35,
      minProbability: 0.25,
      maxProbability: 0.50,
      avgDaysInStage: 30,
      conversionRate: 0.55
    },

    // Solution Development - Preparing Offer
    [DealStage.PROPOSAL_PREPARATION]: {
      stage: DealStage.PROPOSAL_PREPARATION,
      baseProbability: 0.45,
      minProbability: 0.30,
      maxProbability: 0.60,
      avgDaysInStage: 20,
      conversionRate: 0.60
    },
    [DealStage.PROPOSAL]: {
      stage: DealStage.PROPOSAL,
      baseProbability: 0.60,
      minProbability: 0.40,
      maxProbability: 0.80,
      avgDaysInStage: 30,
      conversionRate: 0.70
    },
    [DealStage.PROPOSAL_REVIEW]: {
      stage: DealStage.PROPOSAL_REVIEW,
      baseProbability: 0.65,
      minProbability: 0.45,
      maxProbability: 0.85,
      avgDaysInStage: 14,
      conversionRate: 0.75
    },

    // Negotiation & Commitment
    [DealStage.NEGOTIATION]: {
      stage: DealStage.NEGOTIATION,
      baseProbability: 0.75,
      minProbability: 0.60,
      maxProbability: 0.90,
      avgDaysInStage: 20,
      conversionRate: 0.85
    },
    [DealStage.CONTRACT_REVIEW]: {
      stage: DealStage.CONTRACT_REVIEW,
      baseProbability: 0.80,
      minProbability: 0.70,
      maxProbability: 0.95,
      avgDaysInStage: 10,
      conversionRate: 0.90
    },
    [DealStage.FINAL_APPROVAL]: {
      stage: DealStage.FINAL_APPROVAL,
      baseProbability: 0.85,
      minProbability: 0.75,
      maxProbability: 0.98,
      avgDaysInStage: 7,
      conversionRate: 0.95
    },

    // Closed Stages
    [DealStage.CLOSED_WON]: {
      stage: DealStage.CLOSED_WON,
      baseProbability: 1.00,
      minProbability: 1.00,
      maxProbability: 1.00,
      avgDaysInStage: 1,
      conversionRate: 1.00
    },
    [DealStage.CLOSED_LOST]: {
      stage: DealStage.CLOSED_LOST,
      baseProbability: 0.00,
      minProbability: 0.00,
      maxProbability: 0.00,
      avgDaysInStage: 1,
      conversionRate: 0.00
    },

    // Special States
    [DealStage.ON_HOLD]: {
      stage: DealStage.ON_HOLD,
      baseProbability: 0.10,
      minProbability: 0.05,
      maxProbability: 0.20,
      avgDaysInStage: 60,
      conversionRate: 0.20
    },
    [DealStage.CANCELLED]: {
      stage: DealStage.CANCELLED,
      baseProbability: 0.00,
      minProbability: 0.00,
      maxProbability: 0.00,
      avgDaysInStage: 1,
      conversionRate: 0.00
    },
    [DealStage.LOST_TO_COMPETITOR]: {
      stage: DealStage.LOST_TO_COMPETITOR,
      baseProbability: 0.00,
      minProbability: 0.00,
      maxProbability: 0.00,
      avgDaysInStage: 1,
      conversionRate: 0.00
    }
  };

  /**
   * Calculate weighted probability based on deal characteristics
   */
  static calculateWeightedProbability(
    baseStage: DealStage,
    dealValue: number,
    daysInStage: number,
    lastActivity: Date,
    dealQuality: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM'
  ): number {
    const baseProb = this.PROBABILITIES[baseStage].baseProbability;

    // Quality multiplier
    const qualityMultiplier = {
      HIGH: 1.2,
      MEDIUM: 1.0,
      LOW: 0.8
    }[dealQuality];

    // Time-based decay (deals lose probability over time)
    const daysSinceActivity = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
    const timeDecay = Math.max(0.7, 1 - (daysSinceActivity / 90)); // 90 days max decay

    // Value-based adjustment (larger deals have different probabilities)
    let valueMultiplier = 1.0;
    if (dealValue > 1000000) valueMultiplier = 0.9; // Large deals harder to close
    else if (dealValue < 100000) valueMultiplier = 1.1; // Small deals easier

    // Stage progression bonus
    const stageProgression = daysInStage / this.PROBABILITIES[baseStage].avgDaysInStage;
    const progressionMultiplier = stageProgression > 1 ? 0.95 : 1.05;

    let weightedProb = baseProb * qualityMultiplier * timeDecay * valueMultiplier * progressionMultiplier;

    // Ensure probability stays within bounds
    const probConfig = this.PROBABILITIES[baseStage];
    weightedProb = Math.max(probConfig.minProbability, Math.min(probConfig.maxProbability, weightedProb));

    return Math.round(weightedProb * 100) / 100; // Round to 2 decimal places
  }

  static getStageBaseProbability(stage: DealStage): number {
    return this.PROBABILITIES[stage]?.baseProbability ?? 0.1;
  }

  static calculateVelocityMetrics(deals: WeightedDeal[]): PipelineVelocityMetrics {
    const qualifiedStages = new Set<DealStage>([
      DealStage.PROSPECTING,
      DealStage.QUALIFICATION,
      DealStage.VALUE_PROPOSITION,
      DealStage.PROPOSAL_PREPARATION,
      DealStage.PROPOSAL,
      DealStage.PROPOSAL_REVIEW,
      DealStage.NEGOTIATION,
      DealStage.CONTRACT_REVIEW,
      DealStage.FINAL_APPROVAL,
    ]);

    const closedWonStages = new Set<DealStage>([DealStage.CLOSED_WON]);
    const closedLostStages = new Set<DealStage>([
      DealStage.CLOSED_LOST,
      DealStage.CANCELLED,
      DealStage.LOST_TO_COMPETITOR,
    ]);

    const qualifiedDeals = deals.filter(deal => qualifiedStages.has(deal.stage));
    const qualifiedDealCount = qualifiedDeals.length;

    const averageDealSize = qualifiedDealCount > 0
      ? qualifiedDeals.reduce((sum, deal) => sum + deal.value, 0) / qualifiedDealCount
      : 0;

    const closedWonDeals = deals.filter(deal => closedWonStages.has(deal.stage));
    const closedLostDeals = deals.filter(deal => closedLostStages.has(deal.stage));
    const totalClosedDeals = closedWonDeals.length + closedLostDeals.length;

    let winRate = totalClosedDeals > 0
      ? closedWonDeals.length / totalClosedDeals
      : 0;

    if (winRate === 0 && deals.length > 0) {
      const avgProbability = deals.reduce((sum, deal) => sum + (deal.probability || 0), 0) / deals.length;
      winRate = Math.min(Math.max(avgProbability, 0.05), 0.95);
    }

    const salesCycleSamples = closedWonDeals
      .map(deal => {
        const cycle = deal.salesCycleDays ?? deal.pipelineAgeDays ?? deal.daysInStage;
        return typeof cycle === 'number' && Number.isFinite(cycle) && cycle > 0 ? cycle : null;
      })
      .filter((value): value is number => value !== null);

    let averageSalesCycle = salesCycleSamples.length > 0
      ? salesCycleSamples.reduce((sum, val) => sum + val, 0) / salesCycleSamples.length
      : 0;

    if (averageSalesCycle <= 0) {
      const pipelineAgeSamples = deals
        .map(deal => deal.pipelineAgeDays ?? deal.daysInStage)
        .filter((value): value is number => Number.isFinite(value) && value > 0);

      averageSalesCycle = pipelineAgeSamples.length > 0
        ? pipelineAgeSamples.reduce((sum, val) => sum + val, 0) / pipelineAgeSamples.length
        : 60; // Sensible default when data is sparse
    }

    const velocityPerDay = averageSalesCycle > 0 && qualifiedDealCount > 0
      ? (qualifiedDealCount * averageDealSize * winRate) / averageSalesCycle
      : 0;

    const velocityPerMonth = velocityPerDay * 30;

    const dealsPerMonth = averageSalesCycle > 0 && qualifiedDealCount > 0
      ? (qualifiedDealCount * winRate * 30) / averageSalesCycle
      : 0;

    return {
      qualifiedDeals: qualifiedDealCount,
      averageDealSize,
      winRate,
      salesCycleLengthDays: Math.round(averageSalesCycle),
      velocityPerDay,
      velocityPerMonth,
      dealsPerMonth,
    };
  }

  /**
   * Kept for backward compatibility – returns monthly revenue velocity
   */
  static calculateVelocityScore(deals: WeightedDeal[]): number {
    return this.calculateVelocityMetrics(deals).velocityPerMonth;
  }

  /**
   * Calculate risk score based on deal characteristics
   */
  static calculateRiskScore(deal: WeightedDeal): number {
    let riskScore = 0;

    // High value deals have higher risk
    if (deal.value > 500000) riskScore += 20;

    // Long time in stage increases risk
    const probConfig = this.PROBABILITIES[deal.stage];
    if (deal.daysInStage > probConfig.avgDaysInStage * 1.5) riskScore += 25;

    // Low probability increases risk
    if (deal.probability < 0.3) riskScore += 30;

    // Old last activity increases risk
    const daysSinceActivity = Math.floor((Date.now() - deal.lastActivity.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceActivity > 30) riskScore += 25;

    return Math.min(100, riskScore);
  }

  /**
   * Generate pipeline metrics
   */
  static generatePipelineMetrics(deals: WeightedDeal[]): PipelineMetrics {
    const totalDeals = deals.length;
    const totalValue = deals.reduce((sum, deal) => sum + deal.value, 0);
    const weightedValue = deals.reduce((sum, deal) => sum + deal.weightedValue, 0);
    const averageProbability = deals.length > 0
      ? deals.reduce((sum, deal) => sum + deal.probability, 0) / deals.length
      : 0;

    // Stage distribution
    const stageDistribution = Object.values(DealStage).reduce((acc, stage) => {
      acc[stage] = deals.filter(deal => deal.stage === stage).length;
      return acc;
    }, {} as Record<DealStage, number>);

    // Monthly forecast (next 6 months)
    const monthlyForecast = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const month = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthName = month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      const monthDeals = deals.filter(deal => {
        if (!deal.expectedCloseDate) return false;
        const dealMonth = new Date(deal.expectedCloseDate).getMonth();
        const dealYear = new Date(deal.expectedCloseDate).getFullYear();
        return dealMonth === month.getMonth() && dealYear === month.getFullYear();
      });

      const monthValue = monthDeals.reduce((sum, deal) => sum + deal.value, 0);
      const monthWeightedValue = monthDeals.reduce((sum, deal) => sum + deal.weightedValue, 0);

      monthlyForecast.push({
        month: monthName,
        value: monthValue,
        weightedValue: monthWeightedValue
      });
    }

    // Calculate conversion rate
    const qualifiedDeals = deals.filter(deal =>
      [DealStage.QUALIFICATION, DealStage.PROPOSAL, DealStage.NEGOTIATION, DealStage.CLOSED_WON].includes(deal.stage)
    ).length;
    const conversionRate = totalDeals > 0 ? qualifiedDeals / totalDeals : 0;

    // Calculate velocity (deals per month)
    const velocityDetails = this.calculateVelocityMetrics(deals);
    const velocity = velocityDetails.velocityPerMonth;

    // Mock forecast accuracy (in real implementation, compare with actual results)
    const forecastAccuracy = 0.85;

    return {
      totalDeals,
      totalValue,
      weightedValue,
      averageProbability,
      forecastAccuracy,
      velocity,
      velocityDetails,
      conversionRate,
      stageDistribution,
      monthlyForecast
    };
  }

  /**
   * Calculate priority based on value, probability, and risk
   */
  static calculatePriority(deal: WeightedDeal): 'HIGH' | 'MEDIUM' | 'LOW' {
    const score = (deal.weightedValue * 0.4) + (deal.probability * 100 * 0.3) + ((100 - deal.riskScore) * 0.3);

    if (score > 70) return 'HIGH';
    if (score > 40) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Generate recommendations for pipeline optimization
   */
  static generateRecommendations(metrics: PipelineMetrics, deals: WeightedDeal[]): string[] {
    const recommendations: string[] = [];

    // Low conversion rate
    if (metrics.conversionRate < 0.3) {
      recommendations.push('Improve lead qualification process to increase conversion rates');
    }

    // High risk deals
    const highRiskDeals = deals.filter(deal => deal.riskScore > 70);
    if (highRiskDeals.length > 0) {
      recommendations.push(`${highRiskDeals.length} deals have high risk scores - review and take action`);
    }

    // Stagnant deals
    const stagnantDeals = deals.filter(deal => deal.daysInStage > 60);
    if (stagnantDeals.length > 0) {
      recommendations.push(`${stagnantDeals.length} deals have been stagnant for over 60 days`);
    }

    // Forecast accuracy
    if (metrics.forecastAccuracy < 0.8) {
      recommendations.push('Review forecasting accuracy and adjust probability calculations');
    }

    // Pipeline velocity
    if (metrics.velocityDetails) {
      const { dealsPerMonth, velocityPerMonth, averageDealSize } = metrics.velocityDetails;

      if (dealsPerMonth < 1) {
        recommendations.push('Pipeline velocity is critically low - accelerate movement of qualified deals');
      } else if (dealsPerMonth < 3) {
        recommendations.push('Pipeline velocity is below target - streamline stage handoffs to close more deals each month');
      }

      if (velocityPerMonth < averageDealSize) {
        recommendations.push('Monthly revenue velocity trails average deal size - focus on shortening the sales cycle');
      }
    }

    return recommendations;
  }

  /**
   * Calculate expected close date based on current stage and velocity
   */
  static calculateExpectedCloseDate(stage: DealStage, _daysInStage: number): Date {
    const remainingStages = this.getRemainingStages(stage);
    const totalRemainingDays = remainingStages.reduce((sum, stage) =>
      sum + this.PROBABILITIES[stage].avgDaysInStage, 0
    );

    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() + totalRemainingDays);
    return expectedDate;
  }

  /**
   * Get remaining stages in the pipeline
   */
  private static getRemainingStages(currentStage: DealStage): DealStage[] {
    const allStages = Object.values(DealStage);
    const currentIndex = allStages.indexOf(currentStage);

    if (currentIndex === -1 || currentStage === DealStage.CLOSED_WON || currentStage === DealStage.CLOSED_LOST) {
      return [];
    }

    return allStages.slice(currentIndex + 1, -1); // Exclude CLOSED stages
  }

  /**
   * Calculate deal quality based on various factors
   */
  static assessDealQuality(
    dealValue: number,
    competitorCount: number,
    decisionMakerAccess: boolean,
    budgetConfirmed: boolean
  ): 'HIGH' | 'MEDIUM' | 'LOW' {
    let score = 0;

    // Value scoring
    if (dealValue > 1000000) score += 25;
    else if (dealValue > 500000) score += 20;
    else if (dealValue > 100000) score += 15;
    else score += 10;

    // Competition scoring
    if (competitorCount === 0) score += 25;
    else if (competitorCount <= 2) score += 15;
    else score += 5;

    // Decision maker access
    if (decisionMakerAccess) score += 25;
    else score += 10;

    // Budget confirmation
    if (budgetConfirmed) score += 25;
    else score += 5;

    if (score >= 75) return 'HIGH';
    if (score >= 50) return 'MEDIUM';
    return 'LOW';
  }
}
