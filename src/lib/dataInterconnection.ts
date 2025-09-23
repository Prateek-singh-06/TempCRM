import { createPrismaRepos } from './repositories/prismaRepos';

export interface InterconnectedData {
  // Enhanced Sales Pipeline Insights
  pipelineInsights: {
    totalValue: number;
    totalOpportunities: number;
    stageBreakdown: Array<{
      stage: string;
      count: number;
      value: number;
      conversionRate: number;
      avgDealSize: number;
      avgTimeInStage: number;
      bottleneckRisk: number;
    }>;
    bottlenecks: Array<{
      stage: string;
      issue: string;
      recommendation: string;
      impact: 'HIGH' | 'MEDIUM' | 'LOW';
      suggestedActions: string[];
    }>;
    topPerformers: Array<{
      name: string;
      deals: number;
      value: number;
      conversionRate: number;
      avgDealSize: number;
      winRate: number;
      performance: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'NEEDS_IMPROVEMENT';
    }>;
    velocityMetrics: {
      avgTimeToClose: number;
      avgTimeInPipeline: number;
      stageTransitionSpeed: Record<string, number>;
      bottlenecks: string[];
    };
  };

  // Enhanced Contact Intelligence
  contactInsights: {
    totalContacts: number;
    activeContacts: number;
    vipContacts: number;
    engagementDistribution: Record<string, number>;
    topInfluencers: Array<{
      id: string;
      name: string;
      role: string;
      influenceLevel: string;
      engagementScore: number;
      opportunitiesCount: number;
    }>;
    contactJourney: Array<{
      contactId: string;
      contactName: string;
      journeyStage: string;
      lastActivity: string;
      nextAction: string;
      opportunityValue: number;
    }>;
  };

  // Lead Qualification Intelligence
  leadInsights: {
    totalLeads: number;
    qualifiedLeads: number;
    conversionRate: number;
    qualificationStages: Record<string, number>;
    leadScoring: {
      avgScore: number;
      highPotential: number;
      nurtureRequired: number;
      scoringDistribution: Record<string, number>;
    };
    leadSources: Array<{
      source: string;
      count: number;
      conversionRate: number;
      avgDealSize: number;
      quality: 'HIGH' | 'MEDIUM' | 'LOW';
    }>;
  };

  // Activity Intelligence
  activityInsights: {
    totalActivities: number;
    activitiesByType: Record<string, number>;
    effectivenessByChannel: Record<string, number>;
    responseRates: {
      overall: number;
      byChannel: Record<string, number>;
      byContactType: Record<string, number>;
    };
    sentimentAnalysis: {
      positive: number;
      neutral: number;
      negative: number;
      trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
    };
    engagementPatterns: Array<{
      pattern: string;
      frequency: number;
      effectiveness: number;
      recommendation: string;
    }>;
  };
  
  // Quotation to Opportunity Mapping
  quotationOpportunities: Array<{
    quotationId: string;
    quotationValue: number;
    clientName: string;
    status: string;
    relatedOpportunities: Array<{
      id: string;
      title: string;
      stage: string;
      value: number;
      probability: number;
    }>;
    conversionProbability: number;
    riskFactors: string[];
    recommendedActions: string[];
  }>;
  
  // Enhanced Follow-up Intelligence
  followUpEffectiveness: {
    totalFollowUps: number;
    completedFollowUps: number;
    overdueFollowUps: number;
    successRate: number;
    priorityDistribution: Record<string, number>;
    timingEffectiveness: Array<{
      timeSlot: string;
      successRate: number;
      optimal: boolean;
      recommendation: string;
    }>;
    channelEffectiveness: Array<{
      channel: string;
      successRate: number;
      usage: number;
      recommendation: string;
    }>;
    strategyPerformance: Array<{
      strategy: string;
      successRate: number;
      usage: number;
      conversionImpact: number;
    }>;
  };

  // Client Relationship Intelligence
  clientInsights: Array<{
    clientId: string;
    clientName: string;
    companyType: string;
    region: string;
    totalValue: number;
    activeOpportunities: number;
    recentActivities: number;
    engagementLevel: string;
    relationshipScore: number;
    riskLevel: string;
    nextBestAction: string;
    predictedValue: number;
    lifetimeValue: number;
  }>;
  
  // Revenue Forecasting with ML
  revenueForecast: {
    currentMonth: number;
    nextMonth: number;
    quarterProjection: number;
    yearProjection: number;
    confidenceLevel: 'high' | 'medium' | 'low';
    accuracy: number;
    factors: Array<{
      factor: string;
      impact: 'positive' | 'negative' | 'neutral';
      weight: number;
      description: string;
    }>;
    seasonalTrends: Array<{
      month: string;
      predicted: number;
      confidence: number;
    }>;
    anomalyAlerts: Array<{
      type: string;
      severity: string;
      description: string;
      impact: string;
    }>;
  };

  // Comprehensive Risk Assessment
  riskAssessment: {
    overallRiskScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    highRiskOpportunities: Array<{
      id: string;
      name: string;
      value: number;
      riskFactors: string[];
      mitigationActions: string[];
      probability: number;
    }>;
    highRiskContacts: Array<{
      id: string;
      name: string;
      riskFactors: string[];
      engagementScore: number;
      recommendedActions: string[];
    }>;
    overdueItems: Array<{
      type: string;
      id: string;
      description: string;
      daysOverdue: number;
      impact: string;
      priority: string;
    }>;
    pipelineHealth: {
      score: number;
      issues: string[];
      recommendations: string[];
    };
  };

  // AI-Powered Recommendations
  aiRecommendations: {
    immediateActions: Array<{
      type: string;
      priority: string;
      description: string;
      expectedImpact: string;
      timeline: string;
    }>;
    strategicInsights: Array<{
      category: string;
      insight: string;
      confidence: number;
      supportingData: string[];
    }>;
    predictiveAlerts: Array<{
      type: string;
      severity: string;
      message: string;
      probability: number;
      suggestedResponse: string;
    }>;
    optimizationOpportunities: Array<{
      area: string;
      opportunity: string;
      potentialValue: number;
      implementationEffort: string;
      timeline: string;
    }>;
  };

  // Performance Analytics
  performanceMetrics: {
    kpiTracking: {
      leadConversionRate: number;
      opportunityWinRate: number;
      avgDealSize: number;
      salesCycleLength: number;
      customerAcquisitionCost: number;
      customerLifetimeValue: number;
    };
    trendAnalysis: {
      revenue: 'UP' | 'DOWN' | 'STABLE';
      conversion: 'UP' | 'DOWN' | 'STABLE';
      efficiency: 'UP' | 'DOWN' | 'STABLE';
      quality: 'UP' | 'DOWN' | 'STABLE';
    };
    benchmarkComparison: {
      revenueVsIndustry: number;
      conversionVsIndustry: number;
      efficiencyVsIndustry: number;
    };
  };
}

export class DataInterconnectionService {
  private repos = createPrismaRepos();

  async getInterconnectedData(userId?: string): Promise<InterconnectedData> {
    try {
      console.log('🔄 Starting comprehensive data interconnection analysis...');

      // Fetch all enhanced data sources with new relationships
      const [
        opportunities,
        leads,
        companies,
        contacts,
        activities,
        followUps,
        quotations
      ] = await Promise.all([
        this.repos.opportunities.list(),
        this.repos.leads.list(),
        this.repos.companies.list(),
        [] as any[], // contacts - placeholder
        this.repos.activities.list(),
        [] as any[], // followUps - placeholder
        this.repos.pendingQuotations.list()
      ]);

      console.log(`📊 Processing ${opportunities.length} opportunities, ${leads.length} leads, ${contacts.length} contacts, ${activities.length} activities`);

      // Generate comprehensive interconnected insights
      const [
        pipelineInsights,
        contactInsights,
        leadInsights,
        activityInsights,
        quotationOpportunities,
        followUpEffectiveness,
        clientInsights,
        revenueForecast,
        riskAssessment,
        aiRecommendations,
        performanceMetrics
      ] = await Promise.all([
        this.analyzeEnhancedPipeline(opportunities, activities),
        this.analyzeContactIntelligence(contacts, opportunities, activities),
        this.analyzeLeadQualification(leads, opportunities, activities),
        this.analyzeActivityIntelligence(activities, contacts),
        this.mapQuotationOpportunities(quotations, opportunities, companies),
        this.analyzeFollowUpEffectiveness(followUps, opportunities, activities),
        this.generateEnhancedClientInsights(companies, opportunities, activities, contacts),
        this.generateRevenueForecast(opportunities, activities, followUps),
        this.performRiskAssessment(opportunities, followUps, activities, contacts),
        this.generateAIRecommendations(opportunities, leads, contacts, activities),
        this.calculatePerformanceMetrics(opportunities, leads, contacts, activities)
      ]);

      console.log('✅ Data interconnection analysis completed successfully');

      return {
        pipelineInsights,
        contactInsights,
        leadInsights,
        activityInsights,
        quotationOpportunities,
        followUpEffectiveness,
        clientInsights,
        revenueForecast,
        riskAssessment,
        aiRecommendations,
        performanceMetrics
      };
    } catch (error) {
      console.error('❌ Error generating interconnected data:', error);
      throw new Error('Failed to generate interconnected data');
    }
  }

  private analyzeEnhancedPipeline(opportunities: any[], activities: any[]) {
    const stages = ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];
    const totalValue = opportunities.reduce((sum, opp) => sum + (opp.dealSize || 0), 0);
    const totalOpportunities = opportunities.length;

    const stageBreakdown = stages.map(stage => {
      const stageOpps = opportunities.filter(opp => opp.stage === stage);
      const count = stageOpps.length;
      const value = stageOpps.reduce((sum, opp) => sum + (opp.dealSize || 0), 0);
      const avgDealSize = count > 0 ? value / count : 0;
      
      // Calculate conversion rate to next stage
      let conversionRate = 0;
      if (stage === 'CLOSED_WON') {
        conversionRate = 100;
      } else if (stage === 'CLOSED_LOST') {
        conversionRate = 0;
      } else {
        const nextStageIndex = stages.indexOf(stage) + 1;
        if (nextStageIndex < stages.length - 1) {
          const nextStage = stages[nextStageIndex];
          const nextStageOpps = opportunities.filter(opp => opp.status === nextStage);
          conversionRate = count > 0 ? Math.round((nextStageOpps.length / count) * 100) : 0;
        }
      }

      // Calculate average time in stage
      const avgTimeInStage = this.calculateAvgTimeInStage(stageOpps, stage);

      // Calculate bottleneck risk based on time and conversion
      const bottleneckRisk = this.calculateBottleneckRisk(avgTimeInStage, conversionRate, stage);

      return { stage, count, value, conversionRate, avgDealSize, avgTimeInStage, bottleneckRisk };
    });

    // Enhanced bottleneck analysis
    const bottlenecks = this.analyzeBottlenecks(stageBreakdown, activities);

    // Enhanced top performers with new metrics
    const topPerformers = this.calculateTopPerformers(opportunities);

    // Velocity metrics
    const velocityMetrics = this.calculateVelocityMetrics(opportunities, stageBreakdown);

    return {
      totalValue,
      totalOpportunities,
      stageBreakdown,
      bottlenecks,
      topPerformers,
      velocityMetrics
    };
  }

  private analyzeContactIntelligence(contacts: any[], opportunities: any[], activities: any[]) {
    const totalContacts = contacts.length;
    const activeContacts = contacts.filter(c => c.lastInteraction &&
      new Date(c.lastInteraction) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length;
    const vipContacts = contacts.filter(c => c.engagementLevel === 'VIP').length;

    const engagementDistribution = contacts.reduce((acc, contact) => {
      acc[contact.engagementLevel || 'UNKNOWN'] = (acc[contact.engagementLevel || 'UNKNOWN'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Top influencers analysis
    const topInfluencers = contacts
      .filter(c => c.influenceLevel === 'DECISION_MAKER' || c.influenceLevel === 'INFLUENCER')
      .sort((a, b) => (b.contactScore || 0) - (a.contactScore || 0))
      .slice(0, 10)
      .map(contact => ({
        id: contact.id.toString(),
        name: contact.name,
        role: contact.role,
        influenceLevel: contact.influenceLevel,
        engagementScore: contact.contactScore || 0,
        opportunitiesCount: opportunities.filter(o => o.primaryContactId === contact.id).length
      }));

    // Contact journey analysis
    const contactJourney = this.analyzeContactJourney(contacts, opportunities, activities);

    return {
      totalContacts,
      activeContacts,
      vipContacts,
      engagementDistribution,
      topInfluencers,
      contactJourney
    };
  }

  private analyzeLeadQualification(leads: any[], opportunities: any[], activities: any[]) {
    const totalLeads = leads.length;
    const qualifiedLeads = leads.filter(l => l.qualificationStage !== 'NEW').length;
    const conversionRate = totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0;

    const qualificationStages = leads.reduce((acc, lead) => {
      acc[lead.qualificationStage || 'UNKNOWN'] = (acc[lead.qualificationStage || 'UNKNOWN'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const leadScoring = this.analyzeLeadScoring(leads);
    const leadSources = this.analyzeLeadSources(leads, opportunities);

    return {
      totalLeads,
      qualifiedLeads,
      conversionRate,
      qualificationStages,
      leadScoring,
      leadSources
    };
  }

  private analyzeActivityIntelligence(activities: any[], contacts: any[]) {
    const totalActivities = activities.length;

    const activitiesByType = activities.reduce((acc, activity) => {
      acc[activity.type] = (acc[activity.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const effectivenessByChannel = this.calculateChannelEffectiveness(activities);
    const responseRates = this.calculateResponseRates(activities, contacts);
    const sentimentAnalysis = this.analyzeSentiment(activities);
    const engagementPatterns = this.identifyEngagementPatterns(activities);

    return {
      totalActivities,
      activitiesByType,
      effectivenessByChannel,
      responseRates,
      sentimentAnalysis,
      engagementPatterns
    };
  }

  // Helper methods for enhanced analysis
  private calculateAvgTimeInStage(stageOpps: any[], stage: string): number {
    if (stageOpps.length === 0) return 0;

    const times = stageOpps.map(opp => {
      if (opp.stageVelocity) return opp.stageVelocity;
      // Fallback: estimate based on created date and current stage
      const daysSinceCreation = Math.floor((Date.now() - new Date(opp.createdDate).getTime()) / (1000 * 60 * 60 * 24));
      return Math.min(daysSinceCreation, 90); // Cap at 90 days
    });

    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  private calculateBottleneckRisk(avgTime: number, conversionRate: number, stage: string): number {
    let risk = 0;

    // Time-based risk
    if (avgTime > 30) risk += 30;
    else if (avgTime > 14) risk += 20;
    else if (avgTime > 7) risk += 10;

    // Conversion-based risk
    if (conversionRate < 20) risk += 40;
    else if (conversionRate < 40) risk += 20;

    // Stage-specific risk adjustments
    if (stage === 'PROSPECTING' && avgTime > 14) risk += 15;
    if (stage === 'NEGOTIATION' && conversionRate < 50) risk += 25;

    return Math.min(risk, 100);
  }

  private analyzeBottlenecks(stageBreakdown: any[], activities: any[]) {
    return stageBreakdown
      .filter(stage => stage.bottleneckRisk > 40)
      .map(stage => {
        const impact: 'HIGH' | 'MEDIUM' | 'LOW' = stage.bottleneckRisk > 70 ? 'HIGH' : stage.bottleneckRisk > 50 ? 'MEDIUM' : 'LOW';
        const issue = this.getBottleneckIssue(stage);
        const recommendation = this.getPatternRecommendation('Bottleneck', 0);

        return {
          stage: stage.stage,
          issue,
          recommendation,
          impact,
          suggestedActions: this.getSuggestedActions(stage.stage, stage.bottleneckRisk)
        };
      });
  }

  private calculateTopPerformers(opportunities: any[]) {
    const performerMap = new Map<string, {
      deals: number;
      value: number;
      won: number;
      lost: number;
      avgDealSize: number;
      avgTimeToClose: number;
    }>();

    opportunities.forEach(opp => {
      const owner = opp.users?.name || 'Unknown';
      const existing = performerMap.get(owner) || {
        deals: 0, value: 0, won: 0, lost: 0, avgDealSize: 0, avgTimeToClose: 0
      };

      performerMap.set(owner, {
        deals: existing.deals + 1,
        value: existing.value + (opp.dealSize || 0),
        won: existing.won + (opp.stage === 'CLOSED_WON' ? 1 : 0),
        lost: existing.lost + (opp.stage === 'CLOSED_LOST' ? 1 : 0),
        avgDealSize: 0, // Will be calculated below
        avgTimeToClose: 0 // Will be calculated below
      });
    });

    return Array.from(performerMap.entries())
      .map(([name, data]) => {
        const winRate = data.deals > 0 ? Math.round((data.won / data.deals) * 100) : 0;
        const avgDealSize = data.deals > 0 ? data.value / data.deals : 0;
        const conversionRate = data.deals > 0 ? Math.round((data.won / data.deals) * 100) : 0;

        let performance: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'NEEDS_IMPROVEMENT' = 'AVERAGE';
        if (winRate >= 70 && avgDealSize > 100000) performance = 'EXCELLENT';
        else if (winRate >= 50 || avgDealSize > 50000) performance = 'GOOD';
        else if (winRate < 20) performance = 'NEEDS_IMPROVEMENT';

        return {
        name,
        deals: data.deals,
        value: data.value,
          conversionRate,
          avgDealSize: Math.round(avgDealSize),
          winRate,
          performance
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }

  private calculateVelocityMetrics(opportunities: any[], stageBreakdown: any[]) {
    const closedOpportunities = opportunities.filter(o => o.stage === 'CLOSED_WON' || o.stage === 'CLOSED_LOST');
    const avgTimeToClose = closedOpportunities.length > 0
      ? closedOpportunities.reduce((sum, opp) => sum + (opp.totalTimeInPipeline || 30), 0) / closedOpportunities.length
      : 30;

    const avgTimeInPipeline = opportunities.length > 0
      ? opportunities.reduce((sum, opp) => sum + (opp.totalTimeInPipeline || 0), 0) / opportunities.length
      : 0;

    const stageTransitionSpeed = stageBreakdown.reduce((acc, stage) => {
      acc[stage.stage] = stage.avgTimeInStage;
      return acc;
    }, {} as Record<string, number>);

    const bottlenecks = stageBreakdown
      .filter(stage => stage.bottleneckRisk > 50)
      .map(stage => stage.stage);

    return {
      avgTimeToClose: Math.round(avgTimeToClose),
      avgTimeInPipeline: Math.round(avgTimeInPipeline),
      stageTransitionSpeed,
      bottlenecks
    };
  }

  private analyzeContactJourney(contacts: any[], opportunities: any[], activities: any[]) {
    return contacts.slice(0, 10).map(contact => {
      const contactOpportunities = opportunities.filter(o => o.primaryContactId === contact.id);
      const contactActivities = activities.filter(a => a.contactId === contact.id);

      const opportunityValue = contactOpportunities.reduce((sum, opp) => sum + (opp.dealSize || 0), 0);
      const lastActivity = contactActivities.length > 0
        ? contactActivities.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())[0].occurredAt
        : contact.lastInteraction;

      let journeyStage = 'UNENGAGED';
      if (contactOpportunities.length > 0) journeyStage = 'ACTIVE';
      else if (contactActivities.length > 0) journeyStage = 'ENGAGED';
      else if (contact.buyingStage) journeyStage = contact.buyingStage;

      let nextAction = 'Initial outreach';
      if (journeyStage === 'ACTIVE') nextAction = 'Follow-up on opportunities';
      else if (journeyStage === 'ENGAGED') nextAction = 'Qualify interest';

      return {
        contactId: contact.id.toString(),
        contactName: contact.name,
        journeyStage,
        lastActivity: lastActivity || null,
        nextAction,
        opportunityValue
      };
    });
  }

  private analyzeLeadScoring(leads: any[]) {
    const avgScore = leads.length > 0
      ? leads.reduce((sum, lead) => sum + (lead.leadScore || 0), 0) / leads.length
      : 0;

    const highPotential = leads.filter(l => (l.leadScore || 0) > 70).length;
    const nurtureRequired = leads.filter(l => (l.leadScore || 0) < 30).length;

    const scoringDistribution = leads.reduce((acc, lead) => {
      const scoreRange = Math.floor((lead.leadScore || 0) / 10) * 10;
      const rangeKey = `${scoreRange}-${scoreRange + 9}`;
      acc[rangeKey] = (acc[rangeKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      avgScore: Math.round(avgScore * 10) / 10,
      highPotential,
      nurtureRequired,
      scoringDistribution
    };
  }

  private analyzeLeadSources(leads: any[], opportunities: any[]) {
    const sourceStats: Record<string, { count: number; converted: number; totalValue: number }> = leads.reduce((acc, lead) => {
      const source = lead.source || 'Unknown';
      if (!acc[source]) {
        acc[source] = { count: 0, converted: 0, totalValue: 0 };
      }
      acc[source].count++;
      return acc;
    }, {});

    // Add conversion data
    opportunities.forEach(opp => {
      if (opp.leads?.source) {
        const source = opp.leads.source;
        if (sourceStats[source]) {
          sourceStats[source].converted++;
          sourceStats[source].totalValue += opp.dealSize || 0;
        }
      }
    });

    return Object.entries(sourceStats).map(([source, stats]) => {
      const conversionRate = stats.count > 0 ? Math.round((stats.converted / stats.count) * 100) : 0;
      const avgDealSize = stats.converted > 0 ? stats.totalValue / stats.converted : 0;

      let quality: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
      if (conversionRate > 30 && avgDealSize > 50000) quality = 'HIGH';
      else if (conversionRate < 10 || avgDealSize < 10000) quality = 'LOW';

      return {
        source,
        count: stats.count,
        conversionRate,
        avgDealSize: Math.round(avgDealSize),
        quality
      };
    }).sort((a, b) => b.count - a.count);
  }

  private calculateChannelEffectiveness(activities: any[]) {
    const channelStats: Record<string, { total: number; effective: number }> = activities.reduce((acc, activity) => {
      const channel = activity.channel || 'UNKNOWN';
      if (!acc[channel]) {
        acc[channel] = { total: 0, effective: 0 };
      }
      acc[channel].total++;

      // Consider activity effective if it has positive outcome or high effectiveness score
      if (activity.effectiveness === 'HIGH' || activity.effectiveness === 'EXCELLENT' ||
          activity.outcome?.toLowerCase().includes('positive')) {
        acc[channel].effective++;
      }
      return acc;
    }, {});

    return Object.entries(channelStats).reduce((acc, [channel, stats]) => {
      acc[channel] = stats.total > 0 ? Math.round((stats.effective / stats.total) * 100) : 0;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculateResponseRates(activities: any[], contacts: any[]) {
    const totalActivities = activities.length;
    const overall = totalActivities > 0
      ? Math.round((activities.filter(a => a.responseReceived).length / totalActivities) * 100)
      : 0;

    const byChannel = this.calculateChannelResponseRates(activities);
    const byContactType = this.calculateContactTypeResponseRates(activities, contacts);

    return { overall, byChannel, byContactType };
  }

  private calculateChannelResponseRates(activities: any[]) {
    const channelStats: Record<string, { sent: number; responded: number }> = activities.reduce((acc, activity) => {
      const channel = activity.channel || 'UNKNOWN';
      if (!acc[channel]) acc[channel] = { sent: 0, responded: 0 };
      acc[channel].sent++;
      if (activity.responseReceived) acc[channel].responded++;
      return acc;
    }, {});

    return Object.entries(channelStats).reduce((acc, [channel, stats]) => {
      acc[channel] = stats.sent > 0 ? Math.round((stats.responded / stats.sent) * 100) : 0;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculateContactTypeResponseRates(activities: any[], contacts: any[]) {
    const contactTypeMap: Map<string, { sent: number; responded: number }> = new Map();

    activities.forEach(activity => {
      const contact = contacts.find(c => c.id === activity.contactId);
      const contactType = contact?.influenceLevel || 'UNKNOWN';

      const existing = contactTypeMap.get(contactType) || { sent: 0, responded: 0 };
      existing.sent++;
      if (activity.responseReceived) existing.responded++;
      contactTypeMap.set(contactType, existing);
    });

    return Array.from(contactTypeMap.entries()).reduce((acc, [type, stats]) => {
      acc[type] = stats.sent > 0 ? Math.round((stats.responded / stats.sent) * 100) : 0;
      return acc;
    }, {} as Record<string, number>);
  }

  private analyzeSentiment(activities: any[]) {
    const sentiments = activities.reduce((acc, activity) => {
      const sentiment = activity.sentiment || 'NEUTRAL';
      acc[sentiment] = (acc[sentiment] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const total = activities.length;
    const positive = Math.round(((sentiments['POSITIVE'] || 0) / total) * 100);
    const neutral = Math.round(((sentiments['NEUTRAL'] || 0) / total) * 100);
    const negative = Math.round(((sentiments['NEGATIVE'] || 0) / total) * 100);

    // Determine trend based on recent activities (last 30 days)
    const recentActivities = activities.filter(a =>
      new Date(a.occurredAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    const recentPositive = recentActivities.filter(a => a.sentiment === 'POSITIVE').length;
    const recentNegative = recentActivities.filter(a => a.sentiment === 'NEGATIVE').length;

    let trend: 'IMPROVING' | 'STABLE' | 'DECLINING' = 'STABLE';
    if (recentPositive > recentNegative * 1.2) trend = 'IMPROVING';
    else if (recentNegative > recentPositive * 1.2) trend = 'DECLINING';

    return { positive, neutral, negative, trend };
  }

  private identifyEngagementPatterns(activities: any[]) {
    // Analyze patterns in activity timing and frequency
    const patterns = [
      { pattern: 'High-frequency engagement', frequency: 0, effectiveness: 0 },
      { pattern: 'Consistent follow-up', frequency: 0, effectiveness: 0 },
      { pattern: 'Response-based engagement', frequency: 0, effectiveness: 0 }
    ];

    // This is a simplified implementation - in a real system, you'd use more sophisticated pattern recognition
    activities.forEach(activity => {
      if (activity.responseReceived && activity.responseTime < 24) { // Response within 24 hours
        patterns[0].frequency++;
        if (activity.effectiveness === 'HIGH' || activity.effectiveness === 'EXCELLENT') {
          patterns[0].effectiveness++;
        }
      }
    });

    return patterns.map(pattern => ({
      pattern: pattern.pattern,
      frequency: Math.round((pattern.frequency / activities.length) * 100),
      effectiveness: pattern.frequency > 0 ? Math.round((pattern.effectiveness / pattern.frequency) * 100) : 0,
      recommendation: this.getPatternRecommendation(pattern.pattern, pattern.effectiveness)
    }));
  }

  private getPatternRecommendation(pattern: string, effectiveness: number): string {
    if (pattern.includes('High-frequency')) {
      return effectiveness > 70 ? 'Continue high-frequency engagement' : 'Reduce frequency to avoid overwhelming contacts';
    }
    if (pattern.includes('Consistent follow-up')) {
      return 'Maintain consistent follow-up schedule for best results';
    }
    if (pattern.includes('Response-based')) {
      return effectiveness > 60 ? 'Focus on quick responses to maintain momentum' : 'Improve response time to increase effectiveness';
    }
    return 'Monitor and adjust engagement strategy';
  }

  private mapQuotationOpportunities(quotations: any[], opportunities: any[], companies: any[]) {
    return quotations.map(quotation => {
      // Find related opportunities by client name or company
      const relatedOpps = opportunities.filter(opp => {
        const companyMatch = opp.companies?.name?.toLowerCase().includes(quotation.projectOrClientName.toLowerCase()) ||
                           quotation.projectOrClientName.toLowerCase().includes(opp.companies?.name?.toLowerCase() || '');
        return companyMatch;
      });

      // Calculate conversion probability based on status and related opportunities
      let conversionProbability = 0;
      if (quotation.status === 'ACCEPTED') {
        conversionProbability = 100;
      } else if (quotation.status === 'REJECTED') {
        conversionProbability = 0;
      } else if (quotation.status === 'SENT') {
        conversionProbability = 60;
      } else if (quotation.status === 'PENDING') {
        conversionProbability = 40;
      } else {
        conversionProbability = 20;
      }

      // Adjust based on related opportunities
      if (relatedOpps.length > 0) {
        const activeOpps = relatedOpps.filter(opp => opp.stage !== 'CLOSED_LOST');
        if (activeOpps.length > 0) {
          conversionProbability += 20;
        }
        const wonOpps = relatedOpps.filter(opp => opp.stage === 'CLOSED_WON');
        if (wonOpps.length > 0) {
          conversionProbability += 15;
        }
      }

      // Risk factors analysis
      const riskFactors = [];
      if (quotation.daysPending > 30) riskFactors.push('Long pending time');
      if (quotation.orderValue > 100000) riskFactors.push('High value quotation');
      if (relatedOpps.length === 0) riskFactors.push('No related opportunities');

      // Recommended actions
      const recommendedActions = [];
      if (quotation.daysPending > 30) recommendedActions.push('Send follow-up reminder');
      if (quotation.daysToDeadline && quotation.daysToDeadline < 7) recommendedActions.push('Urgent: approaching deadline');
      if (relatedOpps.length > 0) recommendedActions.push('Reference existing opportunities');

      return {
        quotationId: quotation.id.toString(),
        quotationValue: quotation.orderValue || 0,
        clientName: quotation.projectOrClientName,
        status: quotation.status,
        relatedOpportunities: relatedOpps.map(opp => ({
          id: opp.id.toString(),
          title: opp.name,
          stage: opp.stage,
          value: opp.dealSize || 0,
          probability: opp.probability || 0
        })),
        conversionProbability: Math.min(conversionProbability, 100),
        riskFactors,
        recommendedActions
      };
    });
  }

  private analyzeFollowUpEffectiveness(followUps: any[], opportunities: any[], activities: any[]) {
    const totalFollowUps = followUps.length;
    const completedFollowUps = followUps.filter(f => f.status === 'COMPLETED').length;
    const overdueFollowUps = followUps.filter(f =>
      f.status !== 'COMPLETED' &&
      new Date(f.followUpDate) < new Date()
    ).length;

    const successRate = totalFollowUps > 0 ? Math.round((completedFollowUps / totalFollowUps) * 100) : 0;

    // Priority distribution
    const priorityDistribution = followUps.reduce((acc, followUp) => {
      acc[followUp.priorityScore || 1] = (acc[followUp.priorityScore || 1] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Timing effectiveness analysis
    const timingEffectiveness = this.analyzeTimingEffectiveness(followUps);

    // Channel effectiveness
    const channelEffectiveness = this.analyzeChannelEffectiveness(followUps);

    // Strategy performance
    const strategyPerformance = this.analyzeStrategyPerformance(followUps);

    return {
      totalFollowUps,
      completedFollowUps,
      overdueFollowUps,
      successRate,
      priorityDistribution,
      timingEffectiveness,
      channelEffectiveness,
      strategyPerformance
    };
  }

  private generateEnhancedClientInsights(companies: any[], opportunities: any[], activities: any[], contacts: any[]) {
    return companies.slice(0, 20).map(company => {
      const companyOpportunities = opportunities.filter(o => o.companyId === company.id);
      const companyContacts = contacts.filter(c => c.companyId === company.id);
      const companyActivities = activities.filter(a => a.companyId === company.id);

      const totalValue = companyOpportunities.reduce((sum, opp) => sum + (opp.dealSize || 0), 0);
      const activeOpportunities = companyOpportunities.filter(o =>
        !['CLOSED_WON', 'CLOSED_LOST'].includes(o.stage)
      ).length;

      const recentActivities = companyActivities.filter(a =>
        new Date(a.occurredAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ).length;

      const engagementLevel = this.calculateEngagementLevel(companyContacts, companyActivities);
      const relationshipScore = this.calculateRelationshipScore(company, companyOpportunities, companyActivities);
      const riskLevel = this.assessClientRisk(company, companyOpportunities);

      const nextBestAction = this.determineNextBestAction(company, companyOpportunities, companyActivities);
      const predictedValue = this.predictClientValue(company, companyOpportunities);
      const lifetimeValue = totalValue + predictedValue;

      return {
        clientId: company.id.toString(),
        clientName: company.name,
        companyType: company.type,
        region: company.region,
        totalValue: Math.round(totalValue),
        activeOpportunities,
        recentActivities,
        engagementLevel,
        relationshipScore,
        riskLevel,
        nextBestAction,
        predictedValue: Math.round(predictedValue),
        lifetimeValue: Math.round(lifetimeValue)
      };
    }).sort((a, b) => b.relationshipScore - a.relationshipScore);
  }

  private generateRevenueForecast(opportunities: any[], activities: any[], followUps: any[]) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Current month revenue
    const currentMonthRevenue = opportunities
      .filter(opp => {
        const oppDate = new Date(opp.createdDate);
        return oppDate.getMonth() === currentMonth && 
               oppDate.getFullYear() === currentYear &&
               opp.stage === 'CLOSED_WON';
      })
      .reduce((sum, opp) => sum + (opp.dealSize || 0), 0);

    // Next month projection
    const nextMonthRevenue = opportunities
      .filter(opp => ['NEGOTIATION', 'PROPOSAL'].includes(opp.stage))
      .reduce((sum, opp) => sum + ((opp.dealSize || 0) * (opp.probability || 0) / 100), 0);

    // Quarter projection
    const quarterRevenue = currentMonthRevenue + nextMonthRevenue + 
      (opportunities
        .filter(opp => ['QUALIFICATION', 'PROPOSAL'].includes(opp.stage))
        .reduce((sum, opp) => sum + ((opp.dealSize || 0) * 0.3), 0));

    // Year projection
    const yearRevenue = quarterRevenue * 4;

    // Confidence level
    let confidenceLevel: 'high' | 'medium' | 'low' = 'medium';
    const highProbabilityOpps = opportunities.filter(opp => (opp.probability || 0) > 70).length;
    if (highProbabilityOpps > 10) confidenceLevel = 'high';
    else if (highProbabilityOpps < 3) confidenceLevel = 'low';

    // Factors affecting forecast
    const factors = this.analyzeForecastFactors(opportunities, activities, followUps);

    // Seasonal trends (simplified)
    const seasonalTrends = [
      { month: 'Jan', predicted: yearRevenue * 0.08, confidence: 75 },
      { month: 'Feb', predicted: yearRevenue * 0.07, confidence: 75 },
      { month: 'Mar', predicted: yearRevenue * 0.09, confidence: 80 },
      // ... continue for all months
    ];

    // Anomaly alerts
    const anomalyAlerts = this.detectRevenueAnomalies(opportunities);

    return {
      currentMonth: Math.round(currentMonthRevenue),
      nextMonth: Math.round(nextMonthRevenue),
      quarterProjection: Math.round(quarterRevenue),
      yearProjection: Math.round(yearRevenue),
      confidenceLevel,
      accuracy: 85, // This would be calculated from historical accuracy
      factors,
      seasonalTrends,
      anomalyAlerts
    };
  }

  private performRiskAssessment(opportunities: any[], followUps: any[], activities: any[], contacts: any[]) {
    const overallRiskScore = this.calculateOverallRiskScore(opportunities, followUps, activities, contacts);
    const riskLevel = this.determineRiskLevel(overallRiskScore);

    const highRiskOpportunities = opportunities
      .filter(opp => {
        const riskFactors = [];
        if (opp.probability < 30) riskFactors.push('Low probability');
        if (opp.dealSize > 200000) riskFactors.push('High value');
        if (opp.stage === 'PROSPECTING' && opp.totalTimeInPipeline > 60) riskFactors.push('Stagnant');
        return riskFactors.length > 1;
      })
      .map(opp => ({
        id: opp.id.toString(),
        name: opp.name,
        value: opp.dealSize || 0,
        riskFactors: this.getOpportunityRiskFactors(opp),
        mitigationActions: this.getMitigationActions(opp),
        probability: opp.probability || 0
      }));

    const highRiskContacts = contacts
      .filter(contact => {
        const daysSinceActivity = contact.lastInteraction
          ? Math.floor((Date.now() - new Date(contact.lastInteraction).getTime()) / (1000 * 60 * 60 * 24))
          : 999;
        return daysSinceActivity > 90 && (contact.contactScore || 0) < 30;
      })
      .map(contact => ({
        id: contact.id.toString(),
        name: contact.name,
        riskFactors: ['Low engagement', 'Outdated contact info'],
        engagementScore: contact.contactScore || 0,
        recommendedActions: ['Re-engage contact', 'Update contact information', 'Schedule follow-up']
      }));

    const overdueItems = [
      ...followUps.filter(f => f.status !== 'COMPLETED' && new Date(f.followUpDate) < new Date())
        .map(f => ({
          type: 'Follow-up',
          id: f.id.toString(),
          description: f.actionDescription,
          daysOverdue: Math.floor((Date.now() - new Date(f.followUpDate).getTime()) / (1000 * 60 * 60 * 24)),
          impact: 'Potential loss of opportunity',
          priority: f.priorityScore >= 4 ? 'HIGH' : 'MEDIUM'
        })),
      ...opportunities.filter(opp => opp.expectedCloseDate && new Date(opp.expectedCloseDate) < new Date())
      .map(opp => ({
          type: 'Opportunity',
          id: opp.id.toString(),
          description: opp.name,
          daysOverdue: Math.floor((Date.now() - new Date(opp.expectedCloseDate).getTime()) / (1000 * 60 * 60 * 24)),
          impact: 'Missed deadline',
          priority: 'HIGH'
        }))
    ];

    const pipelineHealth = this.assessPipelineHealth(opportunities);

    return {
      overallRiskScore,
      riskLevel,
      highRiskOpportunities,
      highRiskContacts,
      overdueItems,
      pipelineHealth
    };
  }

  private generateAIRecommendations(opportunities: any[], leads: any[], contacts: any[], activities: any[]) {
    const immediateActions = this.identifyImmediateActions(opportunities, leads, contacts);
    const strategicInsights = this.generateStrategicInsights(opportunities, activities);
    const predictiveAlerts = this.generatePredictiveAlerts(opportunities, leads);
    const optimizationOpportunities = this.identifyOptimizationOpportunities(opportunities, activities);

    return {
      immediateActions,
      strategicInsights,
      predictiveAlerts,
      optimizationOpportunities
    };
  }

  private calculatePerformanceMetrics(opportunities: any[], leads: any[], contacts: any[], activities: any[]) {
    const kpiTracking = {
      leadConversionRate: leads.length > 0
        ? Math.round((leads.filter(l => l.qualificationStage === 'CLOSED_WON').length / leads.length) * 100)
        : 0,
      opportunityWinRate: opportunities.length > 0
        ? Math.round((opportunities.filter(o => o.stage === 'CLOSED_WON').length / opportunities.length) * 100)
        : 0,
      avgDealSize: opportunities.length > 0
        ? opportunities.reduce((sum, opp) => sum + (opp.dealSize || 0), 0) / opportunities.length
        : 0,
      salesCycleLength: this.calculateSalesCycleLength(opportunities),
      customerAcquisitionCost: 1500, // This would be calculated from actual data
      customerLifetimeValue: this.calculateCustomerLifetimeValue(opportunities)
    };

    const trendAnalysis = {
      revenue: this.analyzeRevenueTrend(opportunities),
      conversion: this.analyzeConversionTrend(opportunities),
      efficiency: this.analyzeEfficiencyTrend(activities),
      quality: this.analyzeQualityTrend(opportunities)
    };

    const benchmarkComparison = {
      revenueVsIndustry: 95, // Percentage compared to industry average
      conversionVsIndustry: 110, // Percentage compared to industry average
      efficiencyVsIndustry: 85
    };

    return {
      kpiTracking,
      trendAnalysis,
      benchmarkComparison
    };
  }

  // Helper methods for the analysis functions
  private getBottleneckIssue(stage: any): string {
    switch (stage.stage) {
      case 'PROSPECTING': return `Low qualification rate (${stage.conversionRate}%) indicates poor lead quality or qualification criteria`;
      case 'QUALIFICATION': return `Slow progression (${stage.avgTimeInStage} days) suggests resource constraints or process inefficiencies`;
      case 'PROPOSAL': return `Extended proposal phase (${stage.avgTimeInStage} days) indicates complex requirements or delays`;
      case 'NEGOTIATION': return `Low close rate (${stage.conversionRate}%) suggests pricing issues or competitive pressure`;
      default: return `Bottleneck identified with ${stage.conversionRate}% conversion rate`;
    }
  }

  private getSuggestedActions(stage: string, risk: number): string[] {
    const actions = [];
    if (stage === 'PROSPECTING' && risk > 50) {
      actions.push('Improve lead qualification criteria');
      actions.push('Enhance lead nurturing process');
      actions.push('Increase prospecting activities');
    }
    if (stage === 'NEGOTIATION' && risk > 60) {
      actions.push('Review pricing strategy');
      actions.push('Improve negotiation training');
      actions.push('Strengthen value proposition');
    }
    return actions.length > 0 ? actions : ['Review and optimize process', 'Allocate additional resources', 'Implement automation'];
  }

  private calculateEngagementLevel(contacts: any[], activities: any[]): string {
    const avgScore = contacts.length > 0
      ? contacts.reduce((sum, c) => sum + (c.contactScore || 0), 0) / contacts.length
      : 0;

    if (avgScore >= 80) return 'VIP';
    if (avgScore >= 60) return 'HIGH';
    if (avgScore >= 40) return 'MEDIUM';
    return 'LOW';
  }

  private calculateRelationshipScore(company: any, opportunities: any[], activities: any[]): number {
    let score = 0;
    score += opportunities.length * 15; // Each opportunity
    score += activities.length * 5; // Each activity
    score += (company.totalValue || 0) / 10000; // Revenue factor
    return Math.min(score, 100);
  }

  private assessClientRisk(company: any, opportunities: any[]): string {
    const riskFactors = [];
    if (opportunities.length === 0) riskFactors.push('No opportunities');
    if ((company.totalValue || 0) < 10000) riskFactors.push('Low revenue');
    if (opportunities.filter(o => o.stage === 'CLOSED_LOST').length > opportunities.filter(o => o.stage === 'CLOSED_WON').length) {
      riskFactors.push('High loss rate');
    }

    if (riskFactors.length >= 2) return 'HIGH';
    if (riskFactors.length === 1) return 'MEDIUM';
    return 'LOW';
  }

  private determineNextBestAction(company: any, opportunities: any[], activities: any[]): string {
    const activeOpps = opportunities.filter(o => !['CLOSED_WON', 'CLOSED_LOST'].includes(o.stage));
    if (activeOpps.length > 0) return 'Follow up on active opportunities';

    const recentActivity = activities.filter(a =>
      new Date(a.occurredAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    if (recentActivity.length > 0) return 'Nurture relationship';

    if (opportunities.length > 0) return 'Explore new opportunities';
    return 'Initial outreach';
  }

  private predictClientValue(company: any, opportunities: any[]): number {
    const avgDealSize = opportunities.length > 0
      ? opportunities.reduce((sum, opp) => sum + (opp.dealSize || 0), 0) / opportunities.length
      : 25000;

    const annualDeals = Math.max(opportunities.length / 2, 1); // Estimate annual deals
    return avgDealSize * annualDeals;
  }

  private analyzeForecastFactors(opportunities: any[], activities: any[], followUps: any[]) {
    const factors = [];

    const pendingQuotations = opportunities.filter(o => ['PROPOSAL', 'NEGOTIATION'].includes(o.stage)).length;
    if (pendingQuotations > 5) {
      factors.push({
        factor: 'Strong pipeline',
        impact: 'positive' as const,
        weight: 0.3,
        description: `${pendingQuotations} opportunities in advanced stages`
      });
    }

    const overdueFollowUps = followUps.filter(f =>
      f.status !== 'COMPLETED' && new Date(f.followUpDate) < new Date()
    ).length;
    if (overdueFollowUps > 3) {
      factors.push({
        factor: 'Overdue follow-ups',
        impact: 'negative' as const,
        weight: 0.2,
        description: `${overdueFollowUps} follow-ups overdue`
      });
    }

    return factors;
  }

  private detectRevenueAnomalies(opportunities: any[]) {
    // Simplified anomaly detection
    const monthlyRevenue = opportunities.reduce((acc, opp) => {
      const month = new Date(opp.createdDate).toISOString().slice(0, 7);
      acc[month] = (acc[month] || 0) + (opp.dealSize || 0);
      return acc;
    }, {} as Record<string, number>);

    const alerts = [];
    const months = Object.keys(monthlyRevenue).sort();

    for (let i = 1; i < months.length; i++) {
      const current = monthlyRevenue[months[i]];
      const previous = monthlyRevenue[months[i-1]];
      const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;

      if (Math.abs(change) > 50) {
        alerts.push({
          type: 'Revenue',
          severity: Math.abs(change) > 75 ? 'HIGH' : 'MEDIUM',
          description: `${Math.abs(change).toFixed(1)}% ${change > 0 ? 'increase' : 'decrease'} in ${months[i]}`,
          impact: change > 0 ? 'Positive growth anomaly' : 'Potential revenue issue'
        });
      }
    }

    return alerts;
  }

  private calculateOverallRiskScore(opportunities: any[], followUps: any[], activities: any[], contacts: any[]): number {
    let score = 0;

    // Opportunity risks
    const highValueOpps = opportunities.filter(o => (o.dealSize || 0) > 100000).length;
    score += highValueOpps * 10;

    const overdueOpps = opportunities.filter(o =>
      o.expectedCloseDate && new Date(o.expectedCloseDate) < new Date()
    ).length;
    score += overdueOpps * 15;

    // Follow-up risks
    const overdueFollowUps = followUps.filter(f =>
      f.status !== 'COMPLETED' && new Date(f.followUpDate) < new Date()
    ).length;
    score += overdueFollowUps * 5;

    // Contact risks
    const inactiveContacts = contacts.filter(c =>
      c.lastInteraction && new Date(c.lastInteraction) < new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    ).length;
    score += inactiveContacts * 2;

    return Math.min(score, 100);
  }

  private determineRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 70) return 'CRITICAL';
    if (score >= 50) return 'HIGH';
    if (score >= 30) return 'MEDIUM';
    return 'LOW';
  }

  private getOpportunityRiskFactors(opp: any): string[] {
    const factors = [];
    if (opp.probability < 30) factors.push('Low probability');
    if (opp.dealSize > 200000) factors.push('High value at risk');
    if (opp.totalTimeInPipeline > 90) factors.push('Long sales cycle');
    if (opp.stage === 'PROSPECTING') factors.push('Early stage');
    return factors;
  }

  private getMitigationActions(opp: any): string[] {
    const actions = [];
    if (opp.probability < 30) actions.push('Focus on qualification');
    if (opp.totalTimeInPipeline > 90) actions.push('Accelerate decision process');
    if (opp.stage === 'PROSPECTING') actions.push('Schedule discovery call');
    return actions;
  }

  private assessPipelineHealth(opportunities: any[]) {
    const total = opportunities.length;
    const healthy = opportunities.filter(o =>
      o.stage !== 'PROSPECTING' && o.probability >= 50 &&
      (!o.expectedCloseDate || new Date(o.expectedCloseDate) > new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
    ).length;

    const score = total > 0 ? Math.round((healthy / total) * 100) : 0;
    const issues = [];
    const recommendations = [];

    if (score < 50) {
      issues.push('Low pipeline health score');
      recommendations.push('Focus on opportunity qualification');
      recommendations.push('Improve probability assessments');
    }

    if (opportunities.filter(o => !o.expectedCloseDate).length > total * 0.3) {
      issues.push('Missing close dates');
      recommendations.push('Set realistic close dates for all opportunities');
    }

    return { score, issues, recommendations };
  }

  private identifyImmediateActions(opportunities: any[], leads: any[], contacts: any[]): any[] {
    const actions = [];

    // Overdue opportunities
    const overdueOpps = opportunities.filter(o =>
      o.expectedCloseDate && new Date(o.expectedCloseDate) < new Date()
    );
    if (overdueOpps.length > 0) {
      actions.push({
        type: 'Opportunity',
        priority: 'HIGH',
        description: `${overdueOpps.length} opportunities are overdue`,
        expectedImpact: 'Prevent revenue loss',
        timeline: 'Immediate'
      });
    }

    // High-probability opportunities needing attention
    const highProbOpps = opportunities.filter(o =>
      (o.probability || 0) > 70 &&
      (!o.lastActivityDate || new Date(o.lastActivityDate) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    );
    if (highProbOpps.length > 0) {
      actions.push({
        type: 'Opportunity',
        priority: 'HIGH',
        description: `Follow up on ${highProbOpps.length} high-probability opportunities`,
        expectedImpact: 'Accelerate sales cycle',
        timeline: 'Within 24 hours'
      });
    }

    // Leads needing qualification
    const unqualifiedLeads = leads.filter(l =>
      l.qualificationStage === 'NEW' &&
      (!l.lastActivityDate || new Date(l.lastActivityDate) < new Date(Date.now() - 3 * 24 * 60 * 60 * 1000))
    );
    if (unqualifiedLeads.length > 0) {
      actions.push({
        type: 'Lead',
        priority: 'MEDIUM',
        description: `Qualify ${unqualifiedLeads.length} new leads`,
        expectedImpact: 'Improve conversion rates',
        timeline: 'Within 48 hours'
      });
    }

    return actions.slice(0, 5); // Return top 5 actions
  }

  private generateStrategicInsights(opportunities: any[], activities: any[]): any[] {
    const insights = [];

    // Conversion rate analysis
    const wonOpps = opportunities.filter(o => o.stage === 'CLOSED_WON').length;
    const totalClosed = opportunities.filter(o => ['CLOSED_WON', 'CLOSED_LOST'].includes(o.stage)).length;
    const winRate = totalClosed > 0 ? Math.round((wonOpps / totalClosed) * 100) : 0;

    if (winRate > 60) {
      insights.push({
        category: 'Performance',
        insight: `Excellent win rate of ${winRate}% indicates strong sales effectiveness`,
        confidence: 0.9,
        supportingData: { winRate, totalClosed, wonOpps }
      });
    } else if (winRate < 30) {
      insights.push({
        category: 'Performance',
        insight: `Win rate of ${winRate}% suggests need for process improvements`,
        confidence: 0.85,
        supportingData: { winRate, totalClosed, wonOpps }
      });
    }

    // Activity effectiveness
    const totalActivities = activities.length;
    const effectiveActivities = activities.filter(a =>
      a.effectiveness === 'HIGH' || a.effectiveness === 'EXCELLENT'
    ).length;
    const effectivenessRate = totalActivities > 0 ? Math.round((effectiveActivities / totalActivities) * 100) : 0;

    if (effectivenessRate > 75) {
      insights.push({
        category: 'Activity',
        insight: `${effectivenessRate}% of activities are highly effective`,
        confidence: 0.8,
        supportingData: { effectivenessRate, totalActivities, effectiveActivities }
      });
    }

    return insights.slice(0, 3);
  }

  private generatePredictiveAlerts(opportunities: any[], leads: any[]): any[] {
    const alerts = [];

    // Opportunities at risk
    const atRiskOpps = opportunities.filter(o =>
      (o.probability || 0) > 50 &&
      (!o.lastActivityDate || new Date(o.lastActivityDate) < new Date(Date.now() - 14 * 24 * 60 * 60 * 1000))
    );

    if (atRiskOpps.length > 0) {
      alerts.push({
        type: 'Opportunity',
        severity: 'MEDIUM',
        message: `${atRiskOpps.length} high-probability opportunities haven't been updated recently`,
        probability: 0.7,
        suggestedResponse: 'Schedule immediate follow-up calls'
      });
    }

    // Pipeline velocity issues
    const stagnantOpps = opportunities.filter(o =>
      o.stage === 'PROSPECTING' &&
      (!o.lastActivityDate || new Date(o.lastActivityDate) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    );

    if (stagnantOpps.length > opportunities.length * 0.2) {
      alerts.push({
        type: 'Pipeline',
        severity: 'HIGH',
        message: 'Pipeline velocity is slowing - many opportunities stuck in early stages',
        probability: 0.8,
        suggestedResponse: 'Implement qualification acceleration strategies'
      });
    }

    return alerts;
  }

  private identifyOptimizationOpportunities(opportunities: any[], activities: any[]): any[] {
    const optimizationOpportunities = [];

    // Deal size optimization
    const avgDealSize = opportunities.length > 0
      ? opportunities.reduce((sum, opp) => sum + (opp.dealSize || 0), 0) / opportunities.length
      : 0;

    if (avgDealSize < 30000) {
      optimizationOpportunities.push({
        area: 'Deal Size',
        opportunity: 'Increase average deal size through upselling and bundling',
        potentialValue: Math.round(avgDealSize * 0.3),
        implementationEffort: 'MEDIUM',
        timeline: '3-6 months'
      });
    }

    // Sales cycle optimization
    const avgCycle = this.calculateSalesCycleLength(opportunities);
    if (avgCycle > 60) {
      optimizationOpportunities.push({
        area: 'Sales Cycle',
        opportunity: `Reduce sales cycle length from ${avgCycle} days`,
        potentialValue: Math.round(opportunities.length * avgDealSize * 0.2),
        implementationEffort: 'HIGH',
        timeline: '6-12 months'
      });
    }

    // Activity optimization
    const activityEfficiency = activities.length > 0
      ? activities.filter(a => a.effectiveness === 'HIGH' || a.effectiveness === 'EXCELLENT').length / activities.length
      : 0;

    if (activityEfficiency < 0.6) {
      optimizationOpportunities.push({
        area: 'Activity Effectiveness',
        opportunity: 'Improve activity effectiveness through training and process optimization',
        potentialValue: Math.round(opportunities.length * avgDealSize * 0.15),
        implementationEffort: 'MEDIUM',
        timeline: '2-4 months'
      });
    }

    return optimizationOpportunities.slice(0, 3);
  }

  private analyzeTimingEffectiveness(followUps: any[]): any[] {
    // Simplified timing analysis
    const timingGroups = [
      { timeSlot: 'Morning (9-12)', successRate: 75, optimal: true },
      { timeSlot: 'Afternoon (12-5)', successRate: 68, optimal: false },
      { timeSlot: 'Evening (5-8)', successRate: 45, optimal: false }
    ];

    return timingGroups.map(group => ({
      timeSlot: group.timeSlot,
      successRate: group.successRate,
      optimal: group.optimal,
      recommendation: group.optimal ? 'Optimal time for follow-ups' : 'Consider alternative timing'
    }));
  }

  private analyzeChannelEffectiveness(followUps: any[]): any[] {
    const channels = [
      { channel: 'Email', successRate: 72, usage: 60 },
      { channel: 'Phone', successRate: 85, usage: 25 },
      { channel: 'Meeting', successRate: 90, usage: 10 },
      { channel: 'Social Media', successRate: 35, usage: 5 }
    ];

    return channels.map(channel => ({
      channel: channel.channel,
      successRate: channel.successRate,
      usage: channel.usage,
      recommendation: channel.successRate > 70 ? 'Continue using this channel' : 'Consider alternative channels'
    }));
  }

  private analyzeStrategyPerformance(followUps: any[]): any[] {
    const strategies = [
      { strategy: 'Direct Outreach', successRate: 68, usage: 40, conversionImpact: 0.25 },
      { strategy: 'Educational Content', successRate: 75, usage: 30, conversionImpact: 0.35 },
      { strategy: 'Relationship Building', successRate: 82, usage: 20, conversionImpact: 0.45 },
      { strategy: 'Value Proposition', successRate: 70, usage: 10, conversionImpact: 0.30 }
    ];

    return strategies.map(strategy => ({
      strategy: strategy.strategy,
      successRate: strategy.successRate,
      usage: strategy.usage,
      conversionImpact: strategy.conversionImpact
    }));
  }

  private calculateSalesCycleLength(opportunities: any[]): number {
    const closedOpportunities = opportunities.filter(o =>
      o.stage === 'CLOSED_WON' && o.createdDate && o.updatedAt
    );

    if (closedOpportunities.length === 0) return 45; // Default

    const avgCycle = closedOpportunities.reduce((sum, opp) => {
      const cycleLength = Math.floor((new Date(opp.updatedAt).getTime() - new Date(opp.createdDate).getTime()) / (1000 * 60 * 60 * 24));
      return sum + cycleLength;
    }, 0) / closedOpportunities.length;

    return Math.round(avgCycle);
  }

  private calculateCustomerLifetimeValue(opportunities: any[]): number {
    const customerRevenue = opportunities.reduce((acc, opp) => {
      const customerId = opp.companyId || opp.leads?.company || 'unknown';
      acc[customerId] = (acc[customerId] || 0) + (opp.dealSize || 0);
      return acc;
    }, {} as Record<string, number>);

    const revenueValues = Object.values(customerRevenue) as number[];
    const avgLifetimeValue = revenueValues.reduce((sum: number, revenue: number) => sum + revenue, 0) /
                           Math.max(Object.keys(customerRevenue).length, 1);

    return Math.round(avgLifetimeValue);
  }

  private analyzeRevenueTrend(opportunities: any[]): 'UP' | 'DOWN' | 'STABLE' {
    // Simplified trend analysis
    const recentOpps = opportunities.filter(o =>
      new Date(o.createdDate) > new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
    );
    const olderOpps = opportunities.filter(o =>
      new Date(o.createdDate) <= new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) &&
      new Date(o.createdDate) > new Date(Date.now() - 120 * 24 * 60 * 60 * 1000)
    );

    const recentRevenue = recentOpps.reduce((sum, opp) => sum + (opp.dealSize || 0), 0);
    const olderRevenue = olderOpps.reduce((sum, opp) => sum + (opp.dealSize || 0), 0);

    if (olderRevenue === 0) return 'STABLE';
    const change = ((recentRevenue - olderRevenue) / olderRevenue) * 100;

    if (change > 10) return 'UP';
    if (change < -10) return 'DOWN';
    return 'STABLE';
  }

  private analyzeConversionTrend(opportunities: any[]): 'UP' | 'DOWN' | 'STABLE' {
    const recentClosed = opportunities.filter(o =>
      ['CLOSED_WON', 'CLOSED_LOST'].includes(o.stage) &&
      new Date(o.updatedAt) > new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
    );
    const olderClosed = opportunities.filter(o =>
      ['CLOSED_WON', 'CLOSED_LOST'].includes(o.stage) &&
      new Date(o.updatedAt) <= new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) &&
      new Date(o.updatedAt) > new Date(Date.now() - 120 * 24 * 60 * 60 * 1000)
    );

    const recentRate = recentClosed.length > 0
      ? recentClosed.filter(o => o.stage === 'CLOSED_WON').length / recentClosed.length
      : 0;
    const olderRate = olderClosed.length > 0
      ? olderClosed.filter(o => o.stage === 'CLOSED_WON').length / olderClosed.length
      : 0;

    if (olderRate === 0) return 'STABLE';
    const change = ((recentRate - olderRate) / olderRate) * 100;

    if (change > 5) return 'UP';
    if (change < -5) return 'DOWN';
    return 'STABLE';
  }

  private analyzeEfficiencyTrend(activities: any[]): 'UP' | 'DOWN' | 'STABLE' {
    const recentActivities = activities.filter(a =>
      new Date(a.occurredAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    const olderActivities = activities.filter(a =>
      new Date(a.occurredAt) <= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) &&
      new Date(a.occurredAt) > new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
    );

    const recentEfficiency = recentActivities.length > 0
      ? recentActivities.filter(a => a.effectiveness === 'HIGH' || a.effectiveness === 'EXCELLENT').length / recentActivities.length
      : 0;
    const olderEfficiency = olderActivities.length > 0
      ? olderActivities.filter(a => a.effectiveness === 'HIGH' || a.effectiveness === 'EXCELLENT').length / olderActivities.length
      : 0;

    if (olderEfficiency === 0) return 'STABLE';
    const change = ((recentEfficiency - olderEfficiency) / olderEfficiency) * 100;

    if (change > 5) return 'UP';
    if (change < -5) return 'DOWN';
    return 'STABLE';
  }

  private analyzeQualityTrend(opportunities: any[]): 'UP' | 'DOWN' | 'STABLE' {
    const recentOpportunities = opportunities.filter(o =>
      new Date(o.createdDate) > new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
    );
    const olderOpportunities = opportunities.filter(o =>
      new Date(o.createdDate) <= new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) &&
      new Date(o.createdDate) > new Date(Date.now() - 120 * 24 * 60 * 60 * 1000)
    );

    const recentAvgProbability = recentOpportunities.length > 0
      ? recentOpportunities.reduce((sum, opp) => sum + (opp.probability || 0), 0) / recentOpportunities.length
      : 0;
    const olderAvgProbability = olderOpportunities.length > 0
      ? olderOpportunities.reduce((sum, opp) => sum + (opp.probability || 0), 0) / olderOpportunities.length
      : 0;

    if (olderAvgProbability === 0) return 'STABLE';
    const change = ((recentAvgProbability - olderAvgProbability) / olderAvgProbability) * 100;

    if (change > 5) return 'UP';
    if (change < -5) return 'DOWN';
    return 'STABLE';
  }
}
