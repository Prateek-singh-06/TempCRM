import { DealStage } from './weightedPipeline';

export interface PredictiveModel {
  id: string;
  name: string;
  type: 'revenue' | 'probability' | 'velocity' | 'conversion';
  accuracy: number;
  confidence: number;
  lastTrained: Date;
}

export interface ForecastData {
  period: string;
  predicted: number;
  upperBound: number;
  lowerBound: number;
  confidence: number;
  actual?: number;
}

export interface PredictiveMetrics {
  forecastAccuracy: number;
  modelConfidence: number;
  dataQuality: number;
  predictionHorizon: number;
}

export class PredictiveAnalyticsService {
  private static readonly FORECAST_PERIODS = 12; // 12 months

  /**
   * Generate revenue forecast using exponential smoothing
   */
  static forecastRevenue(
    historicalData: Array<{ period: string; revenue: number }>,
    periods: number = this.FORECAST_PERIODS
  ): ForecastData[] {
    if (historicalData.length < 3) {
      return this.generateBaselineForecast(periods);
    }

    const alpha = 0.3; // Smoothing factor
    let smoothedValue = historicalData[0].revenue;

    // Calculate exponential smoothing
    const smoothed = historicalData.map((data, index) => {
      if (index === 0) return smoothedValue;
      smoothedValue = alpha * data.revenue + (1 - alpha) * smoothedValue;
      return smoothedValue;
    });

    // Calculate trend and seasonality
    const trend = this.calculateTrend(historicalData);
    const seasonality = this.calculateSeasonality(historicalData);

    // Generate forecasts
    const forecasts: ForecastData[] = [];
    const lastValue = smoothed[smoothed.length - 1];
    const lastPeriod = new Date(historicalData[historicalData.length - 1].period);

    for (let i = 1; i <= periods; i++) {
      const forecastPeriod = new Date(lastPeriod);
      forecastPeriod.setMonth(forecastPeriod.getMonth() + i);

      const basePrediction = lastValue + (trend * i);
      const seasonalAdjustment = seasonality[i % seasonality.length] || 1;
      const predicted = basePrediction * seasonalAdjustment;

      // Calculate confidence intervals (95%)
      const variance = this.calculateVariance(historicalData.map(d => d.revenue));
      const stdDev = Math.sqrt(variance);
      const margin = 1.96 * stdDev * Math.sqrt(i); // Increases with forecast horizon

      forecasts.push({
        period: forecastPeriod.toISOString().split('T')[0],
        predicted: Math.max(0, predicted),
        upperBound: Math.max(0, predicted + margin),
        lowerBound: Math.max(0, predicted - margin),
        confidence: Math.max(0.1, 1 - (margin / predicted)) // Confidence decreases with uncertainty
      });
    }

    return forecasts;
  }

  /**
   * Predict deal conversion probability using historical patterns
   */
  static predictConversionProbability(
    dealValue: number,
    daysInStage: number,
    stage: DealStage,
    competitorCount: number,
    relationshipStrength: string
  ): number {
    // Base probability by stage
    const stageProbabilities: Partial<Record<DealStage, number>> = {
      [DealStage.PROSPECTING]: 0.05,
      [DealStage.QUALIFICATION]: 0.25,
      [DealStage.PROPOSAL]: 0.60,
      [DealStage.NEGOTIATION]: 0.85,
      [DealStage.CLOSED_WON]: 1.00,
      [DealStage.CLOSED_LOST]: 0.00
    };

    let probability = stageProbabilities[stage] || 0.1;

    // Deal size factor (larger deals are harder to close)
    if (dealValue > 1000000) probability *= 0.9;
    else if (dealValue > 500000) probability *= 0.95;
    else if (dealValue < 50000) probability *= 1.1;

    // Time factor (deals lose momentum over time)
    const timePenalty = Math.max(0.7, 1 - (daysInStage / 180));
    probability *= timePenalty;

    // Competition factor
    if (competitorCount > 3) probability *= 0.7;
    else if (competitorCount > 1) probability *= 0.85;

    // Relationship strength
    switch (relationshipStrength) {
      case 'EXCELLENT': probability *= 1.2; break;
      case 'STRONG': probability *= 1.1; break;
      case 'WEAK': probability *= 0.8; break;
    }

    return Math.min(0.95, Math.max(0.01, probability));
  }

  /**
   * Calculate pipeline velocity forecast
   */
  static forecastPipelineVelocity(
    currentDeals: Array<{ stage: DealStage; value: number; daysInStage: number }>,
    historicalVelocity: Array<{ period: string; dealsClosed: number }>
  ): ForecastData[] {
    if (historicalVelocity.length < 3) {
      return this.generateBaselineVelocityForecast();
    }

    // Calculate average velocity
    const avgVelocity = historicalVelocity.reduce((sum, v) => sum + v.dealsClosed, 0) / historicalVelocity.length;

    // Current pipeline by stage
    const pipelineByStage = currentDeals.reduce((acc, deal) => {
      acc[deal.stage] = (acc[deal.stage] || 0) + 1;
      return acc;
    }, {} as Record<DealStage, number>);

    // Estimate closure rates by stage
    const closureRates: Partial<Record<DealStage, number>> = {
      [DealStage.PROSPECTING]: 0.1,
      [DealStage.QUALIFICATION]: 0.3,
      [DealStage.PROPOSAL]: 0.6,
      [DealStage.NEGOTIATION]: 0.8,
      [DealStage.CLOSED_WON]: 1.0,
      [DealStage.CLOSED_LOST]: 0.0
    };

    // Forecast future closures
    const forecasts: ForecastData[] = [];
    const baseDate = new Date();

    for (let month = 1; month <= this.FORECAST_PERIODS; month++) {
      const forecastDate = new Date(baseDate);
      forecastDate.setMonth(forecastDate.getMonth() + month);

      let predictedClosures = 0;
      Object.entries(pipelineByStage).forEach(([stage, count]) => {
        const stageEnum = stage as DealStage;
        const closureRate = closureRates[stageEnum] || 0.1;
        predictedClosures += count * closureRate * (1 / month); // Distribute over months
      });

      // Add historical average as baseline
      predictedClosures += avgVelocity * 0.3;

      forecasts.push({
        period: forecastDate.toISOString().split('T')[0],
        predicted: predictedClosures,
        upperBound: predictedClosures * 1.3,
        lowerBound: predictedClosures * 0.7,
        confidence: 0.75 - (month * 0.05) // Confidence decreases over time
      });
    }

    return forecasts;
  }

  /**
   * Calculate trend using linear regression
   */
  private static calculateTrend(data: Array<{ period: string; revenue: number }>): number {
    if (data.length < 2) return 0;

    const n = data.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = data.map(d => d.revenue);

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  /**
   * Calculate seasonality factors
   */
  private static calculateSeasonality(data: Array<{ period: string; revenue: number }>): number[] {
    if (data.length < 12) return [1]; // Not enough data for seasonality

    const monthlyData = data.slice(-12); // Last 12 months
    const avgRevenue = monthlyData.reduce((sum, d) => sum + d.revenue, 0) / monthlyData.length;

    return monthlyData.map(d => d.revenue / avgRevenue);
  }

  /**
   * Calculate variance for confidence intervals
   */
  private static calculateVariance(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1);
  }

  /**
   * Generate baseline forecast when no historical data
   */
  private static generateBaselineForecast(periods: number): ForecastData[] {
    const forecasts: ForecastData[] = [];
    const baseDate = new Date();

    for (let i = 1; i <= periods; i++) {
      const forecastDate = new Date(baseDate);
      forecastDate.setMonth(forecastDate.getMonth() + i);

      forecasts.push({
        period: forecastDate.toISOString().split('T')[0],
        predicted: 100000 + (i * 5000), // Simple linear growth
        upperBound: 150000 + (i * 10000),
        lowerBound: 50000 + (i * 2500),
        confidence: Math.max(0.2, 0.8 - (i * 0.05))
      });
    }

    return forecasts;
  }

  /**
   * Generate baseline velocity forecast
   */
  private static generateBaselineVelocityForecast(): ForecastData[] {
    const forecasts: ForecastData[] = [];
    const baseDate = new Date();

    for (let i = 1; i <= this.FORECAST_PERIODS; i++) {
      const forecastDate = new Date(baseDate);
      forecastDate.setMonth(forecastDate.getMonth() + i);

      forecasts.push({
        period: forecastDate.toISOString().split('T')[0],
        predicted: 5 + Math.random() * 3, // 5-8 deals per month
        upperBound: 12,
        lowerBound: 2,
        confidence: Math.max(0.3, 0.9 - (i * 0.06))
      });
    }

    return forecasts;
  }
}
