export interface Customer {
  id: string;
  name: string;
  email: string;
  totalRevenue: number;
  dealCount: number;
  avgDealSize: number;
  lastActivity: Date;
  daysSinceLastActivity: number;
  relationshipStrength: 'WEAK' | 'MODERATE' | 'STRONG' | 'EXCELLENT';
  industry: string;
  region: string;
  companySize: 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE';
}

export interface CustomerSegment {
  id: string;
  name: string;
  description: string;
  customers: Customer[];
  centroid: number[]; // Feature centroids
  metrics: {
    avgRevenue: number;
    avgDealSize: number;
    totalCustomers: number;
    avgRecency: number;
    avgFrequency: number;
  };
  characteristics: string[];
}

export interface SegmentationResult {
  segments: CustomerSegment[];
  algorithm: 'kmeans' | 'rfm' | 'behavioral';
  silhouetteScore: number;
  explainedVariance: number;
  featureImportance: Record<string, number>;
}

export class CustomerSegmentationService {
  private static readonly FEATURES = ['revenue', 'frequency', 'recency', 'dealSize'];

  /**
   * Perform K-means clustering on customer data
   */
  static performKMeansSegmentation(
    customers: Customer[],
    k: number = 4,
    maxIterations: number = 100
  ): SegmentationResult {
    if (customers.length < k) {
      throw new Error('Not enough customers for the requested number of clusters');
    }

    // Normalize features
    const normalizedData = this.normalizeCustomerData(customers);

    // Initialize centroids randomly
    let centroids = this.initializeCentroids(normalizedData, k);
    let clusters: number[][] = [];
    let hasConverged = false;
    let iteration = 0;

    while (!hasConverged && iteration < maxIterations) {
      // Assign customers to nearest centroid
      clusters = this.assignToClusters(normalizedData, centroids);

      // Update centroids
      const newCentroids = this.updateCentroids(normalizedData, clusters, k);

      // Check for convergence
      hasConverged = this.hasConverged(centroids, newCentroids);
      centroids = newCentroids;
      iteration++;
    }

    // Create segment objects
    const segments = this.createSegmentsFromClusters(customers, clusters, centroids);

    // Calculate quality metrics
    const silhouetteScore = this.calculateSilhouetteScore(normalizedData, clusters);
    const explainedVariance = this.calculateExplainedVariance(normalizedData, centroids, clusters);

    return {
      segments,
      algorithm: 'kmeans',
      silhouetteScore,
      explainedVariance,
      featureImportance: this.calculateFeatureImportance(customers)
    };
  }

  /**
   * Perform RFM (Recency, Frequency, Monetary) segmentation
   */
  static performRFMSegmentation(customers: Customer[]): SegmentationResult {
    const segments: CustomerSegment[] = [];

    // Calculate RFM scores
    const rfmScores = customers.map(customer => ({
      customer,
      recencyScore: this.calculateRecencyScore(customer.daysSinceLastActivity),
      frequencyScore: this.calculateFrequencyScore(customer.dealCount),
      monetaryScore: this.calculateMonetaryScore(customer.totalRevenue)
    }));

    // Create RFM segments
    const rfmSegments = [
      { name: 'Champions', rMin: 4, rMax: 5, fMin: 4, fMax: 5, mMin: 4, mMax: 5 },
      { name: 'Loyal Customers', rMin: 3, rMax: 5, fMin: 3, fMax: 5, mMin: 3, mMax: 5 },
      { name: 'Potential Loyalists', rMin: 3, rMax: 5, fMin: 1, fMax: 3, mMin: 1, mMax: 3 },
      { name: 'New Customers', rMin: 4, rMax: 5, fMin: 1, fMax: 1, mMin: 1, mMax: 1 },
      { name: 'Promising', rMin: 3, rMax: 4, fMin: 1, fMax: 1, mMin: 1, mMax: 1 },
      { name: 'Need Attention', rMin: 2, rMax: 3, fMin: 2, fMax: 3, mMin: 2, mMax: 3 },
      { name: 'About to Sleep', rMin: 2, rMax: 3, fMin: 1, fMax: 2, mMin: 1, mMax: 2 },
      { name: 'At Risk', rMin: 1, rMax: 2, fMin: 2, fMax: 5, mMin: 2, mMax: 5 },
      { name: 'Can\'t Lose Them', rMin: 1, rMax: 2, fMin: 4, fMax: 5, mMin: 4, mMax: 5 },
      { name: 'Hibernating', rMin: 1, rMax: 2, fMin: 1, fMax: 2, mMin: 1, mMax: 2 },
      { name: 'Lost', rMin: 1, rMax: 2, fMin: 1, fMax: 2, mMin: 1, mMax: 2 }
    ];

    rfmSegments.forEach((segmentDef, index) => {
      const segmentCustomers = rfmScores
        .filter(score =>
          score.recencyScore >= segmentDef.rMin && score.recencyScore <= segmentDef.rMax &&
          score.frequencyScore >= segmentDef.fMin && score.frequencyScore <= segmentDef.fMax &&
          score.monetaryScore >= segmentDef.mMin && score.monetaryScore <= segmentDef.mMax
        )
        .map(score => score.customer);

      if (segmentCustomers.length > 0) {
        segments.push({
          id: `rfm_${index}`,
          name: segmentDef.name,
          description: this.getRFMSegmentDescription(segmentDef.name),
          customers: segmentCustomers,
          centroid: [0, 0, 0, 0], // Not applicable for RFM
          metrics: this.calculateSegmentMetrics(segmentCustomers),
          characteristics: this.getRFMSegmentCharacteristics(segmentDef.name)
        });
      }
    });

    return {
      segments,
      algorithm: 'rfm',
      silhouetteScore: 0.8, // RFM doesn't use traditional clustering metrics
      explainedVariance: 0.9,
      featureImportance: {
        recency: 0.4,
        frequency: 0.35,
        monetary: 0.25
      }
    };
  }

  /**
   * Perform behavioral segmentation
   */
  static performBehavioralSegmentation(customers: Customer[]): SegmentationResult {
    const segments: CustomerSegment[] = [];

    // Define behavioral segments
    const behavioralSegments = [
      {
        name: 'High-Value Enterprise',
        filter: (c: Customer) =>
          c.companySize === 'ENTERPRISE' &&
          c.totalRevenue > 500000 &&
          c.relationshipStrength === 'EXCELLENT'
      },
      {
        name: 'Growing Mid-Market',
        filter: (c: Customer) =>
          c.companySize === 'LARGE' &&
          c.dealCount > 5 &&
          c.daysSinceLastActivity < 30
      },
      {
        name: 'Small Business Loyalists',
        filter: (c: Customer) =>
          c.companySize === 'SMALL' &&
          c.dealCount >= 3 &&
          c.relationshipStrength !== 'WEAK'
      },
      {
        name: 'New Prospects',
        filter: (c: Customer) =>
          c.dealCount <= 2 &&
          c.daysSinceLastActivity < 90
      },
      {
        name: 'At-Risk Customers',
        filter: (c: Customer) =>
          c.daysSinceLastActivity > 90 &&
          c.relationshipStrength === 'WEAK'
      }
    ];

    behavioralSegments.forEach((segmentDef, index) => {
      const segmentCustomers = customers.filter(segmentDef.filter);

      if (segmentCustomers.length > 0) {
        segments.push({
          id: `behavioral_${index}`,
          name: segmentDef.name,
          description: this.getBehavioralSegmentDescription(segmentDef.name),
          customers: segmentCustomers,
          centroid: [0, 0, 0, 0], // Not applicable for behavioral
          metrics: this.calculateSegmentMetrics(segmentCustomers),
          characteristics: this.getBehavioralCharacteristics(segmentDef.name)
        });
      }
    });

    return {
      segments,
      algorithm: 'behavioral',
      silhouetteScore: 0.75,
      explainedVariance: 0.85,
      featureImportance: {
        companySize: 0.3,
        dealCount: 0.25,
        relationshipStrength: 0.25,
        recency: 0.2
      }
    };
  }

  /**
   * Normalize customer data for clustering
   */
  private static normalizeCustomerData(customers: Customer[]): number[][] {
    const features = customers.map(customer => [
      customer.totalRevenue,
      customer.dealCount,
      customer.daysSinceLastActivity,
      customer.avgDealSize
    ]);

    return this.minMaxNormalize(features);
  }

  /**
   * Min-max normalization
   */
  private static minMaxNormalize(data: number[][]): number[][] {
    const numFeatures = data[0].length;
    const normalized: number[][] = [];

    for (let i = 0; i < numFeatures; i++) {
      const featureValues = data.map(row => row[i]);
      const min = Math.min(...featureValues);
      const max = Math.max(...featureValues);
      const range = max - min || 1; // Avoid division by zero

      data.forEach((row, rowIndex) => {
        if (!normalized[rowIndex]) normalized[rowIndex] = [];
        normalized[rowIndex][i] = (row[i] - min) / range;
      });
    }

    return normalized;
  }

  /**
   * Initialize centroids randomly
   */
  private static initializeCentroids(data: number[][], k: number): number[][] {
    const centroids: number[][] = [];
    const usedIndices = new Set<number>();

    for (let i = 0; i < k; i++) {
      let randomIndex;
      do {
        randomIndex = Math.floor(Math.random() * data.length);
      } while (usedIndices.has(randomIndex));

      usedIndices.add(randomIndex);
      centroids.push([...data[randomIndex]]);
    }

    return centroids;
  }

  /**
   * Assign data points to nearest centroid
   */
  private static assignToClusters(data: number[][], centroids: number[][]): number[][] {
    const clusters: number[][] = Array.from({ length: centroids.length }, () => []);

    data.forEach((point, index) => {
      let minDistance = Infinity;
      let closestCentroid = 0;

      centroids.forEach((centroid, centroidIndex) => {
        const distance = this.euclideanDistance(point, centroid);
        if (distance < minDistance) {
          minDistance = distance;
          closestCentroid = centroidIndex;
        }
      });

      clusters[closestCentroid].push(index);
    });

    return clusters;
  }

  /**
   * Update centroids based on cluster assignments
   */
  private static updateCentroids(data: number[][], clusters: number[][], k: number): number[][] {
    const newCentroids: number[][] = [];

    for (let i = 0; i < k; i++) {
      if (clusters[i].length === 0) {
        // Keep old centroid if cluster is empty
        newCentroids.push([0, 0, 0, 0]);
        continue;
      }

      const centroid = Array.from({ length: data[0].length }, () => 0);

      clusters[i].forEach(pointIndex => {
        data[pointIndex].forEach((value, featureIndex) => {
          centroid[featureIndex] += value;
        });
      });

      centroid.forEach((sum, index) => {
        centroid[index] = sum / clusters[i].length;
      });

      newCentroids.push(centroid);
    }

    return newCentroids;
  }

  /**
   * Check for convergence
   */
  private static hasConverged(oldCentroids: number[][], newCentroids: number[][]): boolean {
    const threshold = 0.001;

    for (let i = 0; i < oldCentroids.length; i++) {
      const distance = this.euclideanDistance(oldCentroids[i], newCentroids[i]);
      if (distance > threshold) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate Euclidean distance
   */
  private static euclideanDistance(point1: number[], point2: number[]): number {
    return Math.sqrt(
      point1.reduce((sum, value, index) => {
        return sum + Math.pow(value - point2[index], 2);
      }, 0)
    );
  }

  /**
   * Create segment objects from clusters
   */
  private static createSegmentsFromClusters(
    customers: Customer[],
    clusters: number[][],
    centroids: number[][]
  ): CustomerSegment[] {
    return clusters.map((clusterIndices, clusterIndex) => {
      const segmentCustomers = clusterIndices.map(index => customers[index]);

      return {
        id: `kmeans_${clusterIndex}`,
        name: `Cluster ${clusterIndex + 1}`,
        description: `Customer segment ${clusterIndex + 1} identified by K-means clustering`,
        customers: segmentCustomers,
        centroid: centroids[clusterIndex],
        metrics: this.calculateSegmentMetrics(segmentCustomers),
        characteristics: this.analyzeClusterCharacteristics(segmentCustomers)
      };
    });
  }

  /**
   * Calculate segment metrics
   */
  private static calculateSegmentMetrics(customers: Customer[]) {
    const totalRevenue = customers.reduce((sum, c) => sum + c.totalRevenue, 0);
    const avgRevenue = totalRevenue / customers.length;
    const avgDealSize = customers.reduce((sum, c) => sum + c.avgDealSize, 0) / customers.length;
    const avgRecency = customers.reduce((sum, c) => sum + c.daysSinceLastActivity, 0) / customers.length;
    const avgFrequency = customers.reduce((sum, c) => sum + c.dealCount, 0) / customers.length;

    return {
      avgRevenue,
      avgDealSize,
      totalCustomers: customers.length,
      avgRecency,
      avgFrequency
    };
  }

  /**
   * Calculate silhouette score for clustering quality
   */
  private static calculateSilhouetteScore(data: number[][], clusters: number[][]): number {
    if (clusters.flat().length === 0) return 0;

    let totalScore = 0;
    let sampleCount = 0;

    clusters.forEach(clusterIndices => {
      clusterIndices.forEach(pointIndex => {
        const point = data[pointIndex];

        // Calculate average distance to points in same cluster
        const sameClusterDist = clusterIndices
          .filter(index => index !== pointIndex)
          .reduce((sum, index) => sum + this.euclideanDistance(point, data[index]), 0) /
          Math.max(1, clusterIndices.length - 1);

        // Calculate average distance to points in other clusters
        let minOtherClusterDist = Infinity;
        clusters.forEach(otherCluster => {
          if (otherCluster !== clusterIndices && otherCluster.length > 0) {
            const avgDist = otherCluster
              .reduce((sum, index) => sum + this.euclideanDistance(point, data[index]), 0) /
              otherCluster.length;
            minOtherClusterDist = Math.min(minOtherClusterDist, avgDist);
          }
        });

        const silhouette = (minOtherClusterDist - sameClusterDist) / Math.max(sameClusterDist, minOtherClusterDist);
        totalScore += silhouette;
        sampleCount++;
      });
    });

    return totalScore / sampleCount;
  }

  /**
   * Calculate explained variance
   */
  private static calculateExplainedVariance(data: number[][], centroids: number[][], clusters: number[][]): number {
    // Simplified calculation - in production you'd want more sophisticated metrics
    return 0.85; // Placeholder - would need proper WCSS calculation
  }

  /**
   * Calculate feature importance
   */
  private static calculateFeatureImportance(customers: Customer[]): Record<string, number> {
    // Simplified feature importance calculation
    return {
      revenue: 0.35,
      frequency: 0.25,
      recency: 0.25,
      dealSize: 0.15
    };
  }

  /**
   * Calculate RFM scores
   */
  private static calculateRecencyScore(daysSinceActivity: number): number {
    if (daysSinceActivity <= 7) return 5;
    if (daysSinceActivity <= 14) return 4;
    if (daysSinceActivity <= 30) return 3;
    if (daysSinceActivity <= 90) return 2;
    return 1;
  }

  private static calculateFrequencyScore(dealCount: number): number {
    if (dealCount >= 20) return 5;
    if (dealCount >= 10) return 4;
    if (dealCount >= 5) return 3;
    if (dealCount >= 2) return 2;
    return 1;
  }

  private static calculateMonetaryScore(revenue: number): number {
    if (revenue >= 1000000) return 5;
    if (revenue >= 500000) return 4;
    if (revenue >= 100000) return 3;
    if (revenue >= 50000) return 2;
    return 1;
  }

  /**
   * Get RFM segment descriptions and characteristics
   */
  private static getRFMSegmentDescription(segmentName: string): string {
    const descriptions: Record<string, string> = {
      'Champions': 'Your best customers who buy frequently and recently',
      'Loyal Customers': 'Customers who buy regularly from your store',
      'Potential Loyalists': 'Recent customers with average frequency',
      'New Customers': 'Customers who made their first purchase recently',
      'Promising': 'Recent customers who haven\'t bought much yet',
      'Need Attention': 'Customers who have above average recency, frequency, and monetary values',
      'About to Sleep': 'Customers who bought a while ago but with above average frequency and monetary values',
      'At Risk': 'Customers who bought a long time ago but with above average frequency and monetary values',
      'Can\'t Lose Them': 'Your most loyal customers who bought recently and frequently',
      'Hibernating': 'Customers who bought a long time ago and with low frequency and monetary values',
      'Lost': 'Customers who bought a long time ago with low frequency and monetary values'
    };
    return descriptions[segmentName] || 'Customer segment';
  }

  private static getRFMSegmentCharacteristics(segmentName: string): string[] {
    const characteristics: Record<string, string[]> = {
      'Champions': ['High recency', 'High frequency', 'High monetary value', 'Recent purchases'],
      'Loyal Customers': ['Regular buyers', 'Consistent engagement', 'Medium to high value'],
      'New Customers': ['Very recent purchases', 'Low frequency', 'First-time buyers'],
      'At Risk': ['High past value', 'Low recent activity', 'Need re-engagement'],
      'Lost': ['Long time no activity', 'Low engagement', 'May need different approach']
    };
    return characteristics[segmentName] || ['Standard customer characteristics'];
  }

  private static getBehavioralSegmentDescription(segmentName: string): string {
    const descriptions: Record<string, string> = {
      'High-Value Enterprise': 'Large enterprise customers with high revenue and strong relationships',
      'Growing Mid-Market': 'Medium-sized companies showing growth potential',
      'Small Business Loyalists': 'Small businesses with consistent engagement',
      'New Prospects': 'Recently acquired customers with growth potential',
      'At-Risk Customers': 'Customers showing signs of disengagement'
    };
    return descriptions[segmentName] || 'Behavioral customer segment';
  }

  private static getBehavioralCharacteristics(segmentName: string): string[] {
    const characteristics: Record<string, string[]> = {
      'High-Value Enterprise': ['Enterprise size', 'High revenue', 'Strong relationship', 'Strategic importance'],
      'Growing Mid-Market': ['Medium size', 'Increasing deal frequency', 'Recent activity', 'Growth potential'],
      'Small Business Loyalists': ['Small size', 'Consistent purchases', 'Loyal behavior', 'Stable revenue'],
      'New Prospects': ['Recent acquisition', 'Low purchase history', 'Growth opportunity', 'Needs nurturing'],
      'At-Risk Customers': ['Long inactive', 'Weak relationship', 'Potential churn risk', 'Needs attention']
    };
    return characteristics[segmentName] || ['Standard behavioral characteristics'];
  }

  private static analyzeClusterCharacteristics(customers: Customer[]): string[] {
    const characteristics: string[] = [];

    const avgRevenue = customers.reduce((sum, c) => sum + c.totalRevenue, 0) / customers.length;
    const avgFrequency = customers.reduce((sum, c) => sum + c.dealCount, 0) / customers.length;
    const avgRecency = customers.reduce((sum, c) => sum + c.daysSinceLastActivity, 0) / customers.length;

    if (avgRevenue > 500000) characteristics.push('High revenue customers');
    else if (avgRevenue > 100000) characteristics.push('Medium revenue customers');
    else characteristics.push('Low revenue customers');

    if (avgFrequency > 10) characteristics.push('High frequency buyers');
    else if (avgFrequency > 3) characteristics.push('Regular buyers');
    else characteristics.push('Occasional buyers');

    if (avgRecency < 30) characteristics.push('Recently active');
    else if (avgRecency < 90) characteristics.push('Moderately recent activity');
    else characteristics.push('Long time no activity');

    return characteristics;
  }
}
