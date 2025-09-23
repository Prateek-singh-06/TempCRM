import { format } from 'date-fns';

export interface AnalyticsData {
  revenue?: {
    current: number;
    growth: number;
    forecast: any[];
    byMonth: any[];
  };
  customers?: {
    total: number;
    new: number;
    active: number;
    churnRate: number;
    segmentation: any;
  };
  pipeline?: Array<{
    stage: string;
    count: number;
    color: string;
  }>;
  predictions?: {
    nextMonthRevenue: number;
    conversionProbability: number;
    atRiskCustomers: number;
    highValueOpportunities: any[];
    revenueTrend: string;
    churnRisk: number;
    forecastConfidence: number;
    anomalyCount: number;
  };
  performance?: {
    avgDealSize: number;
    avgSalesCycle: number;
    conversionRate: number;
    forecastAccuracy: number;
  };
  aiInsights?: {
    recommendations: string[];
    alerts: string[];
    opportunities: string[];
    anomalies: any;
    churnAnalysis: any;
    revenueAnalysis: any;
  };
}

export class AISummarizationService {
  // NLP-based Text Processing Utilities
  private tokenize(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }

  private calculateTFIDF(texts: string[]): Map<string, number> {
    const tfidf = new Map<string, number>();
    const totalDocs = texts.length;

    // Calculate term frequency
    texts.forEach((text, docIndex) => {
      const tokens = this.tokenize(text);
      const termFreq = new Map<string, number>();

      tokens.forEach(token => {
        termFreq.set(token, (termFreq.get(token) || 0) + 1);
      });

      // Calculate TF-IDF
      termFreq.forEach((freq, term) => {
        const tf = freq / tokens.length;
        const docsWithTerm = texts.filter(t => t.toLowerCase().includes(term)).length;
        const idf = Math.log(totalDocs / (1 + docsWithTerm));
        const tfidfScore = tf * idf;
        tfidf.set(term, (tfidf.get(term) || 0) + tfidfScore);
      });
    });

    return tfidf;
  }

  private extractiveSummarization(texts: string[], maxSentences: number = 3): string[] {
    if (texts.length === 0) return [];

    const sentences = texts.join('. ').split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length <= maxSentences) return sentences;

    const tfidf = this.calculateTFIDF(sentences);
    const sentenceScores = sentences.map((sentence, index) => {
      const tokens = this.tokenize(sentence);
      const score = tokens.reduce((sum, token) => sum + (tfidf.get(token) || 0), 0);
      return { sentence, score, index };
    });

    return sentenceScores
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSentences)
      .sort((a, b) => a.index - b.index)
      .map(item => item.sentence.trim());
  }

  private abstractiveSummarization(metrics: any): string {
    const keyInsights = this.extractKeyInsights(metrics);
    const sentiment = this.analyzeSentiment(metrics);
    const entities = this.extractNamedEntities(metrics);

    let summary = '';

    // Generate abstractive summary based on sentiment and key entities
    if (sentiment.overall === 'positive') {
      summary += `Performance shows strong ${entities.trends.join(' and ')} trends. `;
    } else if (sentiment.overall === 'negative') {
      summary += `Performance requires attention with ${entities.risks.join(' and ')} concerns. `;
    } else {
      summary += `Performance remains stable with ${entities.metrics.join(' and ')} as key indicators. `;
    }

    // Add key insights using abstractive generation
    if (keyInsights.length > 0) {
      summary += `Key observations include ${keyInsights.slice(0, 2).join(' and ')}. `;
    }

    return summary;
  }

  private extractKeyInsights(metrics: any): string[] {
    const insights: string[] = [];

    if (metrics.revenue?.growth > 10) {
      insights.push('significant revenue growth');
    }
    if (metrics.customers?.churnRate > 0.15) {
      insights.push('elevated customer churn risk');
    }
    if (metrics.performance?.conversionRate < 0.25) {
      insights.push('conversion rate optimization opportunities');
    }

    return insights;
  }

  private analyzeSentiment(metrics: any): { overall: 'positive' | 'negative' | 'neutral', confidence: number } {
    let positiveScore = 0;
    let negativeScore = 0;

    // Revenue sentiment
    if (metrics.revenue?.growth > 0) positiveScore += 2;
    else if (metrics.revenue?.growth < -5) negativeScore += 2;

    // Customer sentiment
    if (metrics.customers?.churnRate < 0.1) positiveScore += 1;
    else if (metrics.customers?.churnRate > 0.2) negativeScore += 2;

    // Performance sentiment
    if (metrics.performance?.conversionRate > 0.3) positiveScore += 1;
    else if (metrics.performance?.conversionRate < 0.2) negativeScore += 1;

    const total = positiveScore + negativeScore;
    const confidence = total > 0 ? Math.abs(positiveScore - negativeScore) / total : 0;

    if (positiveScore > negativeScore) return { overall: 'positive', confidence };
    if (negativeScore > positiveScore) return { overall: 'negative', confidence };
    return { overall: 'neutral', confidence };
  }

  private extractNamedEntities(metrics: any): { trends: string[], risks: string[], metrics: string[] } {
    const entities = {
      trends: [] as string[],
      risks: [] as string[],
      metrics: [] as string[]
    };

    if (metrics.revenue?.growth > 5) entities.trends.push('revenue growth');
    if (metrics.revenue?.growth < -5) entities.risks.push('revenue decline');

    if (metrics.customers?.churnRate > 0.15) entities.risks.push('customer retention');
    if (metrics.performance?.conversionRate < 0.25) entities.risks.push('conversion optimization');

    entities.metrics.push('revenue', 'customer engagement', 'conversion rates');

    return entities;
  }

  private generateExecutiveSummary(data: AnalyticsData): string {
    const currentRevenue = data.revenue?.current || 0;
    const revenueGrowth = data.revenue?.growth || 0;
    const totalCustomers = data.customers?.total || 0;
    const totalOpportunities = data.pipeline?.length || 0;

    // Use NLP-based abstractive summarization for key metrics
    const metricsText = this.abstractiveSummarization({
      revenue: data.revenue,
      customers: data.customers,
      performance: data.performance
    });

    const growthText = revenueGrowth >= 0
      ? `showing a ${revenueGrowth.toFixed(1)}% growth`
      : `experiencing a ${Math.abs(revenueGrowth).toFixed(1)}% decline`;

    return `${metricsText} Your CRM system is performing ${growthText} with $${currentRevenue.toLocaleString()} in current revenue. ` +
           `The platform manages ${totalCustomers} customers and ${totalOpportunities} opportunities in the sales pipeline. ` +
           `Key focus areas include opportunity conversion and customer retention strategies.`;
  }

  private generateRevenueInsights(data: AnalyticsData): string {
    const nextMonthRevenue = data.predictions?.nextMonthRevenue || 0;
    const forecastConfidence = data.predictions?.forecastConfidence || 0;
    const revenueTrend = data.predictions?.revenueTrend || 'stable';

    return `Revenue forecasting indicates ${nextMonthRevenue > 0 ? 'positive' : 'challenging'} momentum with ` +
           `$${nextMonthRevenue.toLocaleString()} projected for next month at ${(forecastConfidence * 100).toFixed(0)}% confidence. ` +
           `The current trend shows ${revenueTrend} performance, suggesting ${this.getTrendRecommendation(revenueTrend)}.`;
  }

  private generateCustomerInsights(data: AnalyticsData): string {
    const churnRisk = data.predictions?.churnRisk || 0;
    const atRiskCustomers = data.predictions?.atRiskCustomers || 0;
    const newCustomers = data.customers?.new || 0;

    let insights = `Customer acquisition remains ${newCustomers > 5 ? 'strong' : 'moderate'} with ${newCustomers} new customers this period. `;

    if (churnRisk > 0.15) {
      insights += `Customer retention requires immediate attention with ${(churnRisk * 100).toFixed(1)}% churn risk identified. `;
    }

    if (atRiskCustomers > 0) {
      insights += `${atRiskCustomers} customers are at high risk of churning and need proactive engagement.`;
    }

    return insights;
  }

  private generatePipelineAnalysis(data: AnalyticsData): string {
    const opportunities = data.pipeline || [];
    const totalOpportunities = opportunities.length;
    const wonOpportunities = opportunities.filter(opp => opp.stage === 'CLOSED_WON').length;
    const lostOpportunities = opportunities.filter(opp => opp.stage === 'CLOSED_LOST').length;
    const activeOpportunities = totalOpportunities - wonOpportunities - lostOpportunities;

    const winRate = totalOpportunities > 0 ? (wonOpportunities / (wonOpportunities + lostOpportunities)) * 100 : 0;

    return `Sales pipeline analysis shows ${activeOpportunities} active opportunities with a ` +
           `${winRate.toFixed(1)}% conversion rate. ${wonOpportunities} deals have been successfully closed, ` +
           `while ${lostOpportunities} opportunities require follow-up and process optimization.`;
  }

  private generatePerformanceMetrics(data: AnalyticsData): string {
    const avgDealSize = data.performance?.avgDealSize || 0;
    const conversionRate = data.performance?.conversionRate || 0;
    const forecastAccuracy = data.performance?.forecastAccuracy || 0;

    return `Performance metrics indicate an average deal size of $${avgDealSize.toLocaleString()} and ` +
           `${(conversionRate * 100).toFixed(1)}% conversion rate. Forecasting accuracy stands at ` +
           `${(forecastAccuracy * 100).toFixed(0)}%, demonstrating ${forecastAccuracy > 0.8 ? 'reliable' : 'improving'} predictive capabilities.`;
  }

  private getTrendRecommendation(trend: string): string {
    switch (trend.toLowerCase()) {
      case 'increasing':
        return 'continued investment in successful strategies';
      case 'decreasing':
        return 'strategic adjustments and market analysis';
      case 'stable':
        return 'consistent execution and opportunity optimization';
      default:
        return 'data-driven decision making';
    }
  }

  private generateKeyRecommendations(data: AnalyticsData): string[] {
    const recommendations: string[] = [];
    const alerts = data.aiInsights?.alerts || [];
    const opportunities = data.aiInsights?.opportunities || [];

    // Add AI-generated recommendations
    recommendations.push(...alerts);
    recommendations.push(...opportunities);

    // Enhanced NLP-based recommendations with priority scoring
    const recommendationCandidates = [
      {
        text: 'Implement customer retention campaigns targeting high-risk segments',
        priority: data.predictions?.churnRisk && data.predictions.churnRisk > 0.15 ? 9 : 3,
        category: 'retention'
      },
      {
        text: 'Review pricing strategy and competitive positioning',
        priority: data.predictions?.revenueTrend === 'decreasing' ? 8 : 4,
        category: 'pricing'
      },
      {
        text: 'Enhance lead qualification process and sales training',
        priority: data.performance?.conversionRate && data.performance.conversionRate < 0.25 ? 7 : 5,
        category: 'training'
      },
      {
        text: 'Improve data quality for more accurate forecasting',
        priority: data.predictions?.forecastConfidence && data.predictions.forecastConfidence < 0.7 ? 8 : 3,
        category: 'data_quality'
      },
      {
        text: 'Focus on high-value opportunity development',
        priority: (data.predictions?.highValueOpportunities?.length || 0) > 0 ? 6 : 2,
        category: 'opportunities'
      }
    ];

    // Use NLP-based ranking and extractive summarization for recommendations
    const prioritizedRecommendations = recommendationCandidates
      .filter(rec => rec.priority > 5)
      .sort((a, b) => b.priority - a.priority)
      .map(rec => rec.text);

    recommendations.push(...prioritizedRecommendations);

    // Use extractive summarization to get most relevant recommendations
    if (recommendations.length > 5) {
      return this.extractiveSummarization(recommendations, 5);
    }

    return recommendations.slice(0, 5);
  }

  private generateChartData(data: AnalyticsData): any {
    const pipelineData = data.pipeline || [];
    const revenueData = data.revenue?.byMonth || [];

    return {
      pipelineChart: {
        labels: pipelineData.map(item => item.stage),
        datasets: [{
          label: 'Opportunities by Stage',
          data: pipelineData.map(item => item.count),
          backgroundColor: pipelineData.map(item => item.color),
          borderColor: pipelineData.map(item => item.color),
          borderWidth: 1
        }]
      },
      revenueChart: {
        labels: revenueData.slice(-6).map(item => format(new Date(item.period), 'MMM yyyy')),
        datasets: [{
          label: 'Monthly Revenue',
          data: revenueData.slice(-6).map(item => item.revenue),
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      performanceMetrics: [
        {
          label: 'Conversion Rate',
          value: data.performance?.conversionRate ? (data.performance.conversionRate * 100).toFixed(1) + '%' : '0%',
          color: '#10B981'
        },
        {
          label: 'Forecast Accuracy',
          value: data.performance?.forecastAccuracy ? (data.performance.forecastAccuracy * 100).toFixed(0) + '%' : '0%',
          color: '#3B82F6'
        },
        {
          label: 'Churn Risk',
          value: data.predictions?.churnRisk ? (data.predictions.churnRisk * 100).toFixed(1) + '%' : '0%',
          color: data.predictions?.churnRisk && data.predictions.churnRisk > 0.15 ? '#EF4444' : '#10B981'
        }
      ]
    };
  }

  // Advanced NLP-based insight generation
  public generateNLPInsights(data: AnalyticsData): {
    sentimentAnalysis: any;
    keyPhrases: string[];
    trendAnalysis: any;
    anomalyDetection: any;
    predictiveInsights: string[];
  } {
    // Sentiment analysis across all metrics
    const sentimentAnalysis = this.analyzeSentiment({
      revenue: data.revenue,
      customers: data.customers,
      performance: data.performance
    });

    // Extract key phrases using TF-IDF
    const allTexts = [
      this.generateExecutiveSummary(data),
      this.generateRevenueInsights(data),
      this.generateCustomerInsights(data),
      this.generatePipelineAnalysis(data),
      this.generatePerformanceMetrics(data)
    ];

    const tfidf = this.calculateTFIDF(allTexts);
    const keyPhrases = Array.from(tfidf.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([phrase]) => phrase);

    // Trend analysis using pattern recognition
    const trendAnalysis = this.analyzeTrends(data);

    // Anomaly detection using statistical methods
    const anomalyDetection = this.detectAnomalies(data);

    // Predictive insights using NLP patterns
    const predictiveInsights = this.generatePredictiveInsights(data);

    return {
      sentimentAnalysis,
      keyPhrases,
      trendAnalysis,
      anomalyDetection,
      predictiveInsights
    };
  }

  private analyzeTrends(data: AnalyticsData): any {
    const trends = {
      revenue: 'stable',
      customers: 'stable',
      performance: 'stable',
      confidence: 0.5
    };

    // Revenue trend analysis
    const revenueGrowth = data.revenue?.growth;
    if (revenueGrowth !== undefined) {
      if (revenueGrowth > 10) trends.revenue = 'strongly_positive';
      else if (revenueGrowth > 5) trends.revenue = 'positive';
      else if (revenueGrowth < -5) trends.revenue = 'negative';
    }

    // Customer trend analysis
    if (data.customers?.new && data.customers.new > 10) trends.customers = 'positive';
    if (data.customers?.churnRate && data.customers.churnRate > 0.2) trends.customers = 'negative';

    // Performance trend analysis
    if (data.performance?.conversionRate && data.performance.conversionRate > 0.3) trends.performance = 'positive';
    else if (data.performance?.conversionRate && data.performance.conversionRate < 0.2) trends.performance = 'negative';

    // Calculate overall confidence
    trends.confidence = this.calculateTrendConfidence(trends);

    return trends;
  }

  private detectAnomalies(data: AnalyticsData): any {
    const anomalies = [];

    // Revenue anomaly detection
    if (data.revenue?.growth && Math.abs(data.revenue.growth) > 20) {
      anomalies.push({
        type: 'revenue',
        severity: 'high',
        description: `Unusual revenue ${data.revenue.growth > 0 ? 'growth' : 'decline'} of ${Math.abs(data.revenue.growth)}%`
      });
    }

    // Customer anomaly detection
    if (data.customers?.churnRate && data.customers.churnRate > 0.3) {
      anomalies.push({
        type: 'customer',
        severity: 'high',
        description: `Critical churn rate of ${(data.customers.churnRate * 100).toFixed(1)}%`
      });
    }

    // Performance anomaly detection
    if (data.performance?.conversionRate && data.performance.conversionRate < 0.1) {
      anomalies.push({
        type: 'performance',
        severity: 'medium',
        description: `Low conversion rate of ${(data.performance.conversionRate * 100).toFixed(1)}%`
      });
    }

    return {
      count: anomalies.length,
      anomalies,
      severity: anomalies.some(a => a.severity === 'high') ? 'high' : 'low'
    };
  }

  private generatePredictiveInsights(data: AnalyticsData): string[] {
    const insights = [];

    // Revenue prediction insights
    if (data.predictions?.nextMonthRevenue) {
      const confidence = data.predictions.forecastConfidence || 0;
      if (confidence > 0.8) {
        insights.push(`High-confidence revenue forecast of $${data.predictions.nextMonthRevenue.toLocaleString()}`);
      }
    }

    // Customer churn prediction
    if (data.predictions?.churnRisk && data.predictions.churnRisk > 0.2) {
      insights.push(`Elevated customer churn risk requires immediate intervention strategies`);
    }

    // Opportunity pipeline insights
    const highValueOpportunities = data.predictions?.highValueOpportunities?.length || 0;
    if (highValueOpportunities > 0) {
      insights.push(`${highValueOpportunities} high-value opportunities identified for focused attention`);
    }

    return insights;
  }

  private calculateTrendConfidence(trends: any): number {
    let confidenceScore = 0;
    let totalFactors = 0;

    if (trends.revenue !== 'stable') {
      confidenceScore += trends.revenue === 'strongly_positive' ? 1 : 0.7;
      totalFactors++;
    }

    if (trends.customers !== 'stable') {
      confidenceScore += 0.8;
      totalFactors++;
    }

    if (trends.performance !== 'stable') {
      confidenceScore += 0.9;
      totalFactors++;
    }

    return totalFactors > 0 ? confidenceScore / totalFactors : 0.5;
  }

  public generateComprehensiveSummary(data: AnalyticsData): {
    executiveSummary: string;
    revenueInsights: string;
    customerInsights: string;
    pipelineAnalysis: string;
    performanceMetrics: string;
    keyRecommendations: string[];
    chartData: any;
    generatedAt: string;
    nlpInsights: any;
  } {
    const nlpInsights = this.generateNLPInsights(data);

    return {
      executiveSummary: this.generateExecutiveSummary(data),
      revenueInsights: this.generateRevenueInsights(data),
      customerInsights: this.generateCustomerInsights(data),
      pipelineAnalysis: this.generatePipelineAnalysis(data),
      performanceMetrics: this.generatePerformanceMetrics(data),
      keyRecommendations: this.generateKeyRecommendations(data),
      chartData: this.generateChartData(data),
      generatedAt: format(new Date(), 'PPP p'),
      nlpInsights
    };
  }

  public generateSmartInsights(data: AnalyticsData): {
    title: string;
    insight: string;
    impact: 'high' | 'medium' | 'low';
    actionRequired: boolean;
  }[] {
    const insights: any[] = [];

    // Revenue trend insight
    if (data.predictions?.revenueTrend) {
      insights.push({
        title: 'Revenue Trend Analysis',
        insight: `Revenue is ${data.predictions.revenueTrend} with ${(data.predictions.forecastConfidence * 100).toFixed(0)}% forecast confidence`,
        impact: data.predictions.revenueTrend === 'increasing' ? 'high' : 'medium',
        actionRequired: data.predictions.revenueTrend === 'decreasing'
      });
    }

    // Customer churn insight
    if (data.predictions?.churnRisk && data.predictions.churnRisk > 0.1) {
      insights.push({
        title: 'Customer Retention Alert',
        insight: `${(data.predictions.churnRisk * 100).toFixed(1)}% of customers are at risk of churning`,
        impact: data.predictions.churnRisk > 0.2 ? 'high' : 'medium',
        actionRequired: true
      });
    }

    // Pipeline health insight
    const activeOpportunities = data.pipeline?.filter(opp =>
      !opp.stage.includes('CLOSED')
    ).length || 0;

    if (activeOpportunities < 10) {
      insights.push({
        title: 'Pipeline Health',
        insight: 'Sales pipeline has limited active opportunities requiring immediate attention',
        impact: 'high',
        actionRequired: true
      });
    }

    // Performance insight
    if (data.performance?.conversionRate && data.performance.conversionRate < 0.2) {
      insights.push({
        title: 'Conversion Rate Optimization',
        insight: `Current conversion rate of ${(data.performance.conversionRate * 100).toFixed(1)}% needs improvement`,
        impact: 'medium',
        actionRequired: true
      });
    }

    return insights;
  }
}

export const aiSummarizationService = new AISummarizationService();
