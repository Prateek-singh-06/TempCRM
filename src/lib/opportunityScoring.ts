export interface OpportunityScore {
  id: string;
  name: string;
  totalScore: number;
  dealSize: number;
  probability: number;
  urgencyScore: number;
  competitionScore: number;
  relationshipScore: number;
  budgetScore: number;
  timingScore: number;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  recommendation: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface ScoringCriteria {
  dealSize: number;
  probability: number;
  daysInPipeline: number;
  competitorCount: number;
  decisionMakerAccess: boolean;
  budgetApproved: boolean;
  relationshipStrength: 'WEAK' | 'MODERATE' | 'STRONG' | 'EXCELLENT';
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  marketTiming: 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT';
}

export class OpportunityScoringService {
  private static readonly WEIGHTS = {
    dealSize: 0.25,
    probability: 0.20,
    urgency: 0.15,
    competition: 0.10,
    relationship: 0.10,
    budget: 0.10,
    timing: 0.10
  };

  /**
   * Calculate comprehensive opportunity score
   */
  static calculateOpportunityScore(criteria: ScoringCriteria): OpportunityScore {
    const urgencyScore = this.calculateUrgencyScore(criteria.urgency, criteria.daysInPipeline);
    const competitionScore = this.calculateCompetitionScore(criteria.competitorCount);
    const relationshipScore = this.calculateRelationshipScore(criteria.relationshipStrength);
    const budgetScore = this.calculateBudgetScore(criteria.budgetApproved);
    const timingScore = this.calculateTimingScore(criteria.marketTiming);

    const dealSizeScore = this.normalizeDealSize(criteria.dealSize);
    const probabilityScore = criteria.probability * 100;

    // Calculate weighted total score
    const totalScore = (
      (dealSizeScore * this.WEIGHTS.dealSize) +
      (probabilityScore * this.WEIGHTS.probability) +
      (urgencyScore * this.WEIGHTS.urgency) +
      (competitionScore * this.WEIGHTS.competition) +
      (relationshipScore * this.WEIGHTS.relationship) +
      (budgetScore * this.WEIGHTS.budget) +
      (timingScore * this.WEIGHTS.timing)
    );

    const priority = this.determinePriority(totalScore, criteria);
    const riskLevel = this.assessRiskLevel(criteria, totalScore);
    const recommendation = this.generateRecommendation(criteria, priority, riskLevel);

    return {
      id: '', // Will be set by caller
      name: '', // Will be set by caller
      totalScore: Math.round(totalScore * 100) / 100,
      dealSize: criteria.dealSize,
      probability: criteria.probability,
      urgencyScore,
      competitionScore,
      relationshipScore,
      budgetScore,
      timingScore,
      priority,
      recommendation,
      riskLevel
    };
  }

  /**
   * Calculate urgency score based on time factors
   */
  private static calculateUrgencyScore(urgency: string, daysInPipeline: number): number {
    let baseScore = 0;

    switch (urgency) {
      case 'CRITICAL': baseScore = 100; break;
      case 'HIGH': baseScore = 80; break;
      case 'MEDIUM': baseScore = 60; break;
      case 'LOW': baseScore = 40; break;
      default: baseScore = 50;
    }

    // Adjust based on time in pipeline
    if (daysInPipeline > 90) baseScore *= 0.8; // Penalty for stagnation
    else if (daysInPipeline < 30) baseScore *= 1.1; // Bonus for freshness

    return Math.min(100, Math.max(0, baseScore));
  }

  /**
   * Calculate competition score
   */
  private static calculateCompetitionScore(competitorCount: number): number {
    if (competitorCount === 0) return 100;
    if (competitorCount === 1) return 80;
    if (competitorCount === 2) return 60;
    if (competitorCount === 3) return 40;
    return 20; // 4+ competitors
  }

  /**
   * Calculate relationship strength score
   */
  private static calculateRelationshipScore(strength: string): number {
    switch (strength) {
      case 'EXCELLENT': return 100;
      case 'STRONG': return 80;
      case 'MODERATE': return 60;
      case 'WEAK': return 40;
      default: return 50;
    }
  }

  /**
   * Calculate budget approval score
   */
  private static calculateBudgetScore(approved: boolean): number {
    return approved ? 100 : 30;
  }

  /**
   * Calculate market timing score
   */
  private static calculateTimingScore(timing: string): number {
    switch (timing) {
      case 'EXCELLENT': return 100;
      case 'GOOD': return 80;
      case 'FAIR': return 60;
      case 'POOR': return 40;
      default: return 50;
    }
  }

  /**
   * Normalize deal size to a 0-100 scale
   */
  private static normalizeDealSize(dealSize: number): number {
    if (dealSize >= 10000000) return 100; // 1Cr+
    if (dealSize >= 5000000) return 90;   // 50L+
    if (dealSize >= 1000000) return 80;   // 10L+
    if (dealSize >= 500000) return 70;    // 5L+
    if (dealSize >= 100000) return 60;    // 1L+
    if (dealSize >= 50000) return 50;     // 50K+
    if (dealSize >= 10000) return 40;     // 10K+
    return 20; // < 10K
  }

  /**
   * Determine priority based on score and criteria
   */
  private static determinePriority(score: number, criteria: ScoringCriteria): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
    // Critical priority conditions
    if (criteria.urgency === 'CRITICAL' && score > 70) return 'CRITICAL';
    if (criteria.dealSize > 1000000 && criteria.probability > 0.7) return 'CRITICAL';
    if (score > 85) return 'CRITICAL';

    // High priority
    if (score > 75) return 'HIGH';
    if (criteria.dealSize > 500000 && criteria.probability > 0.5) return 'HIGH';

    // Medium priority
    if (score > 60) return 'MEDIUM';

    // Low priority
    return 'LOW';
  }

  /**
   * Assess risk level
   */
  private static assessRiskLevel(criteria: ScoringCriteria, score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    let riskScore = 0;

    if (criteria.competitorCount > 3) riskScore += 30;
    if (!criteria.budgetApproved) riskScore += 25;
    if (criteria.relationshipStrength === 'WEAK') riskScore += 20;
    if (criteria.probability < 0.3) riskScore += 25;
    if (criteria.daysInPipeline > 90) riskScore += 20;
    if (criteria.marketTiming === 'POOR') riskScore += 15;

    // Adjust based on overall score
    if (score > 80) riskScore -= 20;
    else if (score < 50) riskScore += 20;

    riskScore = Math.min(100, Math.max(0, riskScore));

    if (riskScore > 70) return 'CRITICAL';
    if (riskScore > 50) return 'HIGH';
    if (riskScore > 30) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Generate AI-powered recommendation
   */
  private static generateRecommendation(
    criteria: ScoringCriteria,
    priority: string,
    riskLevel: string
  ): string {
    const recommendations: string[] = [];

    if (priority === 'CRITICAL') {
      recommendations.push('URGENT: Schedule immediate executive meeting and prepare proposal');
    } else if (priority === 'HIGH') {
      recommendations.push('HIGH PRIORITY: Contact decision maker within 24 hours');
    } else if (priority === 'MEDIUM') {
      recommendations.push('MEDIUM: Follow up within 3-5 business days');
    } else {
      recommendations.push('LOW: Monitor and nurture relationship');
    }

    if (criteria.competitorCount > 2) {
      recommendations.push('HIGH COMPETITION: Differentiate value proposition and accelerate timeline');
    }

    if (!criteria.budgetApproved) {
      recommendations.push('BUDGET UNCERTAIN: Focus on ROI demonstration and cost-benefit analysis');
    }

    if (criteria.relationshipStrength === 'WEAK') {
      recommendations.push('BUILD RELATIONSHIP: Schedule discovery call to understand needs better');
    }

    if (criteria.daysInPipeline > 60) {
      recommendations.push('STAGNANT: Re-engage with fresh value proposition or update status');
    }

    return recommendations.join(' | ');
  }

  /**
   * Batch score multiple opportunities
   */
  static scoreOpportunities(opportunities: Array<{
    id: string;
    name: string;
    criteria: ScoringCriteria;
  }>): OpportunityScore[] {
    return opportunities.map(opp => {
      const score = this.calculateOpportunityScore(opp.criteria);
      return {
        ...score,
        id: opp.id,
        name: opp.name
      };
    });
  }

  /**
   * Sort opportunities by priority and score
   */
  static sortByPriority(opportunities: OpportunityScore[]): OpportunityScore[] {
    const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

    return opportunities.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.totalScore - a.totalScore;
    });
  }

  /**
   * Get opportunities by priority level
   */
  static filterByPriority(opportunities: OpportunityScore[], priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'): OpportunityScore[] {
    return opportunities.filter(opp => opp.priority === priority);
  }

  /**
   * Calculate portfolio metrics
   */
  static calculatePortfolioMetrics(opportunities: OpportunityScore[]): {
    averageScore: number;
    priorityDistribution: Record<string, number>;
    riskDistribution: Record<string, number>;
    totalValue: number;
    highPriorityValue: number;
    atRiskValue: number;
  } {
    const averageScore = opportunities.length > 0
      ? opportunities.reduce((sum, opp) => sum + opp.totalScore, 0) / opportunities.length
      : 0;

    const priorityDistribution = opportunities.reduce((acc, opp) => {
      acc[opp.priority] = (acc[opp.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const riskDistribution = opportunities.reduce((acc, opp) => {
      acc[opp.riskLevel] = (acc[opp.riskLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalValue = opportunities.reduce((sum, opp) => sum + opp.dealSize, 0);
    const highPriorityValue = opportunities
      .filter(opp => ['CRITICAL', 'HIGH'].includes(opp.priority))
      .reduce((sum, opp) => sum + opp.dealSize, 0);
    const atRiskValue = opportunities
      .filter(opp => ['HIGH', 'CRITICAL'].includes(opp.riskLevel))
      .reduce((sum, opp) => sum + opp.dealSize, 0);

    return {
      averageScore: Math.round(averageScore * 100) / 100,
      priorityDistribution,
      riskDistribution,
      totalValue,
      highPriorityValue,
      atRiskValue
    };
  }
}
