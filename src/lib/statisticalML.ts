// Simple Statistical ML Engine for CRM Analytics
// Built on top of existing predictive analytics and segmentation

export interface StatisticalModel {
  id: string;
  name: string;
  type: 'forecasting' | 'classification' | 'clustering' | 'regression';
  accuracy: number;
  lastTrained: Date;
  parameters: Record<string, any>;
}

export interface ForecastResult {
  predicted: number;
  upperBound: number;
  lowerBound: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export class SimpleMLEngine {
  /**
   * Linear Regression for Revenue Forecasting
   */
  static linearRegression(data: Array<{ x: number; y: number }>): { slope: number; intercept: number; r2: number } {
    const n = data.length;
    const sumX = data.reduce((sum, point) => sum + point.x, 0);
    const sumY = data.reduce((sum, point) => sum + point.y, 0);
    const sumXY = data.reduce((sum, point) => sum + (point.x * point.y), 0);
    const sumXX = data.reduce((sum, point) => sum + (point.x * point.x), 0);
    const sumYY = data.reduce((sum, point) => sum + (point.y * point.y), 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R² (coefficient of determination)
    const yMean = sumY / n;
    const ssRes = data.reduce((sum, point) => {
      const predicted = slope * point.x + intercept;
      return sum + Math.pow(point.y - predicted, 2);
    }, 0);
    const ssTot = data.reduce((sum, point) => sum + Math.pow(point.y - yMean, 2), 0);
    const r2 = 1 - (ssRes / ssTot);

    return { slope, intercept, r2: Math.max(0, Math.min(1, r2)) };
  }

  /**
   * Exponential Moving Average for Smoothing
   */
  static exponentialMovingAverage(data: number[], alpha: number = 0.3): number[] {
    if (data.length === 0) return [];

    const result = [data[0]];

    for (let i = 1; i < data.length; i++) {
      const ema = alpha * data[i] + (1 - alpha) * result[i - 1];
      result.push(ema);
    }

    return result;
  }

  /**
   * Simple K-Means Clustering for Customer Segmentation
   */
  static kMeansClustering(
    data: number[][],
    k: number = 3,
    maxIterations: number = 50
  ): { centroids: number[][]; clusters: number[]; iterations: number } {
    if (data.length === 0 || k <= 0) {
      return { centroids: [], clusters: [], iterations: 0 };
    }

    // Initialize centroids randomly
    let centroids = data.slice(0, Math.min(k, data.length));

    let clusters: number[] = [];
    let iterations = 0;

    for (let iter = 0; iter < maxIterations; iter++) {
      iterations = iter + 1;

      // Assign points to nearest centroid
      clusters = data.map(point => {
        let minDistance = Infinity;
        let clusterIndex = 0;

        centroids.forEach((centroid, index) => {
          const distance = this.euclideanDistance(point, centroid);
          if (distance < minDistance) {
            minDistance = distance;
            clusterIndex = index;
          }
        });

        return clusterIndex;
      });

      // Update centroids
      const newCentroids = centroids.map((_, clusterIndex) => {
        const clusterPoints = data.filter((_, index) => clusters[index] === clusterIndex);
        if (clusterPoints.length === 0) return centroids[clusterIndex];

        const dimensions = clusterPoints[0].length;
        const newCentroid = Array.from({ length: dimensions }, (_, dim) => {
          const sum = clusterPoints.reduce((acc, point) => acc + point[dim], 0);
          return sum / clusterPoints.length;
        });

        return newCentroid;
      });

      // Check for convergence
      const converged = centroids.every((centroid, index) =>
        this.euclideanDistance(centroid, newCentroids[index]) < 0.001
      );

      centroids = newCentroids;

      if (converged) break;
    }

    return { centroids, clusters, iterations };
  }

  /**
   * Calculate Euclidean Distance
   */
  private static euclideanDistance(point1: number[], point2: number[]): number {
    return Math.sqrt(
      point1.reduce((sum, val, index) => sum + Math.pow(val - point2[index], 2), 0)
    );
  }

  /**
   * Time Series Forecasting with Confidence Intervals
   */
  static forecastTimeSeries(
    historicalData: number[],
    periodsAhead: number = 3,
    confidenceLevel: number = 0.95
  ): ForecastResult[] {
    if (historicalData.length < 3) {
      return Array.from({ length: periodsAhead }, (_, i) => ({
        predicted: historicalData[historicalData.length - 1] || 0,
        upperBound: (historicalData[historicalData.length - 1] || 0) * 1.2,
        lowerBound: (historicalData[historicalData.length - 1] || 0) * 0.8,
        confidence: 0.5,
        trend: 'stable' as const
      }));
    }

    // Calculate trend using linear regression
    const dataPoints = historicalData.map((value, index) => ({ x: index, y: value }));
    const { slope, intercept } = this.linearRegression(dataPoints);

    // Calculate standard error for confidence intervals
    const predictions = historicalData.map((_, index) => slope * index + intercept);
    const errors = historicalData.map((actual, index) => actual - predictions[index]);
    const mse = errors.reduce((sum, error) => sum + error * error, 0) / errors.length;
    const stdError = Math.sqrt(mse);

    // Determine trend direction
    const trend: 'increasing' | 'decreasing' | 'stable' =
      slope > 0.01 ? 'increasing' :
      slope < -0.01 ? 'decreasing' : 'stable';

    // Generate forecasts
    const forecasts: ForecastResult[] = [];
    const lastIndex = historicalData.length - 1;

    for (let i = 1; i <= periodsAhead; i++) {
      const futureIndex = lastIndex + i;
      const predicted = slope * futureIndex + intercept;

      // Calculate confidence interval (simplified)
      const margin = confidenceLevel * stdError * Math.sqrt(i);
      const upperBound = predicted + margin;
      const lowerBound = Math.max(0, predicted - margin);

      // Confidence decreases with forecast horizon
      const confidence = Math.max(0.1, confidenceLevel - (i * 0.1));

      forecasts.push({
        predicted: Math.max(0, predicted),
        upperBound: Math.max(0, upperBound),
        lowerBound: Math.max(0, lowerBound),
        confidence,
        trend
      });
    }

    return forecasts;
  }

  /**
   * Customer Churn Prediction using Logistic Regression
   */
  static predictChurnProbability(
    customerFeatures: {
      daysSinceLastActivity: number;
      totalRevenue: number;
      dealCount: number;
      avgDealSize: number;
      relationshipStrength: 'WEAK' | 'MODERATE' | 'STRONG' | 'EXCELLENT';
    }
  ): number {
    // Simplified logistic regression coefficients (would be trained on real data)
    const weights = {
      daysSinceLastActivity: -0.01,  // Negative: more recent = lower churn
      totalRevenue: -0.000001,       // Negative: higher revenue = lower churn
      dealCount: -0.05,              // Negative: more deals = lower churn
      avgDealSize: -0.00001,         // Negative: larger deals = lower churn
      relationshipStrength: {
        'WEAK': 0.8,
        'MODERATE': 0.4,
        'STRONG': 0.1,
        'EXCELLENT': 0.05
      }
    };

    // Calculate linear combination
    const linearSum =
      customerFeatures.daysSinceLastActivity * weights.daysSinceLastActivity +
      customerFeatures.totalRevenue * weights.totalRevenue +
      customerFeatures.dealCount * weights.dealCount +
      customerFeatures.avgDealSize * weights.avgDealSize +
      weights.relationshipStrength[customerFeatures.relationshipStrength];

    // Apply sigmoid function for probability
    const probability = 1 / (1 + Math.exp(-linearSum));

    // Ensure reasonable bounds
    return Math.max(0.01, Math.min(0.95, probability));
  }

  /**
   * Anomaly Detection using Statistical Methods
   */
  static detectAnomalies(data: number[], threshold: number = 2): { anomalies: number[]; scores: number[] } {
    if (data.length < 3) {
      return { anomalies: [], scores: [] };
    }

    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);

    const scores = data.map(value => Math.abs(value - mean) / stdDev);
    const anomalies = scores
      .map((score, index) => ({ score, index }))
      .filter(item => item.score > threshold)
      .map(item => item.index);

    return { anomalies, scores };
  }

  /**
   * Calculate Correlation Coefficient
   */
  static correlationCoefficient(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length < 2) return 0;

    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
    const sumY2 = y.reduce((sum, val) => sum + val * val, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Generate Statistical Insights
   */
  static generateInsights(data: any): string[] {
    const insights: string[] = [];

    // Revenue trend analysis
    if (data.revenue?.byMonth && data.revenue.byMonth.length > 1) {
      const revenues = data.revenue.byMonth.map((item: any) => item.revenue || 0);
      const recent = revenues.slice(-3);
      const previous = revenues.slice(-6, -3);

      const recentAvg = recent.reduce((sum: number, val: number) => sum + val, 0) / recent.length;
      const previousAvg = previous.reduce((sum: number, val: number) => sum + val, 0) / previous.length;

      const growth = ((recentAvg - previousAvg) / Math.max(previousAvg, 1)) * 100;

      if (Math.abs(growth) > 10) {
        insights.push(`Revenue ${growth > 0 ? 'increased' : 'decreased'} by ${Math.abs(growth).toFixed(1)}% in recent months`);
      }
    }

    // Pipeline health
    if (data.pipeline && data.pipeline.length > 0) {
      const highValueDeals = data.pipeline.filter((deal: any) => deal.count > 5).length;
      if (highValueDeals > 0) {
        insights.push(`${highValueDeals} pipeline stages have significant deal concentration`);
      }
    }

    // Conversion analysis
    if (data.conversionRate > 0) {
      if (data.conversionRate > 25) {
        insights.push('Conversion rate is above industry average - excellent performance!');
      } else if (data.conversionRate < 10) {
        insights.push('Conversion rate needs improvement - focus on qualification process');
      }
    }

    return insights.length > 0 ? insights : ['Analyzing your data patterns...'];
  }
}
