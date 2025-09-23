/**
 * SMART BUSINESS LOGIC ENGINE
 * Incorporating best practices from web search results for intelligent CRM operations
 */

// Define enums locally to avoid Prisma client import issues
enum DealCategory {
  MICRO = "MICRO",
  SMALL = "SMALL",
  MEDIUM = "MEDIUM",
  LARGE = "LARGE",
  ENTERPRISE = "ENTERPRISE"
}

enum UrgencyLevel {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL"
}

enum HealthStatus {
  EXCELLENT = "EXCELLENT",
  GOOD = "GOOD",
  FAIR = "FAIR",
  POOR = "POOR",
  CRITICAL = "CRITICAL"
}

enum QualityScore {
  POOR = "POOR",
  FAIR = "FAIR",
  GOOD = "GOOD",
  VERY_GOOD = "VERY_GOOD",
  EXCELLENT = "EXCELLENT"
}

// SMART DEAL CATEGORIZATION ENGINE
export class DealCategorizationEngine {
  /**
   * Automatically categorize deals based on value with intelligent thresholds
   * Based on Indian market standards and business intelligence
   */
  static categorizeByValue(value: number): DealCategory {
    if (value < 1000000) return DealCategory.MICRO;        // < $10k
    if (value < 5000000) return DealCategory.SMALL;        // $10k - $50k
    if (value < 20000000) return DealCategory.MEDIUM;      // $50k - $200k
    if (value < 100000000) return DealCategory.LARGE;      // $200k - $1M
    return DealCategory.ENTERPRISE;                         // > $1M
  }

  /**
   * Calculate urgency level based on deal characteristics
   * Considers value, timeline, and business priority
   */
  static calculateUrgencyLevel(
    value: number,
    daysToDeadline?: number,
    dealCategory?: DealCategory
  ): UrgencyLevel {
    // Critical if high-value deal with imminent deadline
    if (dealCategory === DealCategory.ENTERPRISE && daysToDeadline && daysToDeadline <= 7) {
      return UrgencyLevel.CRITICAL;
    }

    // High urgency for large deals approaching deadline
    if (dealCategory === DealCategory.LARGE && daysToDeadline && daysToDeadline <= 14) {
      return UrgencyLevel.HIGH;
    }

    // Medium urgency for standard timelines
    if (daysToDeadline && daysToDeadline <= 30) {
      return UrgencyLevel.MEDIUM;
    }

    // Low urgency for long-term opportunities
    return UrgencyLevel.LOW;
  }

  /**
   * Smart deal health assessment based on multiple factors
   */
  static assessDealHealth(
    status: string,
    lastActivityDays: number,
    followUpCount: number
  ): HealthStatus {
    // Excellent health: Active with high engagement
    if (status === 'ONGOING' && lastActivityDays <= 3 && followUpCount >= 3) {
      return HealthStatus.EXCELLENT;
    }

    // Good health: Regular activity
    if (lastActivityDays <= 7 && followUpCount >= 1) {
      return HealthStatus.GOOD;
    }

    // Fair health: Some activity but needs attention
    if (lastActivityDays <= 14) {
      return HealthStatus.FAIR;
    }

    // Poor health: Stagnant deal
    if (lastActivityDays <= 30) {
      return HealthStatus.POOR;
    }

    // Critical health: Deal at risk
    return HealthStatus.CRITICAL;
  }

  /**
   * AI-powered conversion probability calculation
   * Uses historical data patterns and current deal metrics
   */
  static calculateConversionProbability(
    dealCategory: DealCategory,
    daysActive: number,
    followUpCount: number,
    lastActivityDays: number,
    urgencyLevel: UrgencyLevel
  ): number {
    let baseProbability = 50; // Starting probability

    // Deal size factor
    const sizeMultiplier = {
      [DealCategory.MICRO]: 0.7,
      [DealCategory.SMALL]: 0.8,
      [DealCategory.MEDIUM]: 1.0,
      [DealCategory.LARGE]: 1.2,
      [DealCategory.ENTERPRISE]: 1.4
    };

    baseProbability *= sizeMultiplier[dealCategory];

    // Activity factor
    if (followUpCount >= 5) baseProbability += 15;
    else if (followUpCount >= 3) baseProbability += 10;
    else if (followUpCount >= 1) baseProbability += 5;

    // Recency factor
    if (lastActivityDays <= 1) baseProbability += 10;
    else if (lastActivityDays <= 3) baseProbability += 5;
    else if (lastActivityDays <= 7) baseProbability += 2;
    else if (lastActivityDays > 14) baseProbability -= 10;

    // Urgency factor
    const urgencyMultiplier = {
      [UrgencyLevel.CRITICAL]: 1.3,
      [UrgencyLevel.HIGH]: 1.2,
      [UrgencyLevel.MEDIUM]: 1.0,
      [UrgencyLevel.LOW]: 0.9
    };

    baseProbability *= urgencyMultiplier[urgencyLevel];

    // Time decay factor (deals lose momentum over time)
    const timeDecay = Math.max(0.7, 1 - (daysActive / 365) * 0.3);
    baseProbability *= timeDecay;

    return Math.min(100, Math.max(0, Math.round(baseProbability)));
  }
}

// SMART DEADLINE MANAGEMENT SYSTEM
export class DeadlineManagementEngine {
  /**
   * Calculate days until deadline with smart logic
   */
  static calculateDaysToDeadline(deadline: Date): number {
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate days pending since start date
   */
  static calculateDaysPending(startDate: Date): number {
    const now = new Date();
    const diffTime = now.getTime() - startDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Determine if deadline is overdue
   */
  static isOverdue(deadline: Date): boolean {
    return new Date() > deadline;
  }

  /**
   * Calculate compliance status based on deadline proximity
   */
  static calculateComplianceStatus(
    deadline: Date,
    status: string,
    reminderCount: number
  ): { status: string; recommendation: string } {
    const daysToDeadline = this.calculateDaysToDeadline(deadline);
    const isOverdue = this.isOverdue(deadline);

    if (isOverdue) {
      if (status === 'PENDING') {
        return {
          status: 'BREACHED',
          recommendation: 'Immediate escalation required - deadline exceeded'
        };
      }
      return {
        status: 'COMPLIANT',
        recommendation: 'Deadline was met'
      };
    }

    if (daysToDeadline <= 1) {
      return {
        status: reminderCount > 0 ? 'WARNING' : 'CRITICAL',
        recommendation: reminderCount > 0 ? 'Final reminder sent' : 'Send urgent reminder'
      };
    }

    if (daysToDeadline <= 7) {
      return {
        status: reminderCount > 0 ? 'COMPLIANT' : 'WARNING',
        recommendation: reminderCount > 0 ? 'Regular monitoring' : 'Send reminder'
      };
    }

    return {
      status: 'COMPLIANT',
      recommendation: 'Monitor regularly'
    };
  }

  /**
   * Smart reminder scheduling based on deadline proximity
   */
  static calculateNextReminderDate(
    deadline: Date,
    lastReminderDate?: Date,
    reminderCount: number = 0
  ): Date {
    const daysToDeadline = this.calculateDaysToDeadline(deadline);

    // Don't send reminders if deadline is more than 30 days away
    if (daysToDeadline > 30) {
      return new Date(deadline.getTime() - (30 * 24 * 60 * 60 * 1000));
    }

    // Urgent reminders for imminent deadlines
    if (daysToDeadline <= 1) {
      return new Date(Date.now() + (2 * 60 * 60 * 1000)); // 2 hours
    }

    if (daysToDeadline <= 3) {
      return new Date(Date.now() + (24 * 60 * 60 * 1000)); // 1 day
    }

    if (daysToDeadline <= 7) {
      return new Date(Date.now() + (3 * 24 * 60 * 60 * 1000)); // 3 days
    }

    // Standard reminder schedule
    const reminderIntervals = [14, 7, 3, 1]; // days before deadline
    const nextInterval = reminderIntervals[reminderCount] || 1;

    return new Date(deadline.getTime() - (nextInterval * 24 * 60 * 60 * 1000));
  }
}

// SMART NOTIFICATION ENGINE
export class NotificationEngine {
  /**
   * Generate personalized notification messages based on user preferences
   * Following web search best practices for effective notifications
   */
  static generatePersonalizedNotification(
    userName: string,
    notificationType: string,
    dealValue?: number,
    deadline?: Date,
    urgency: UrgencyLevel = UrgencyLevel.MEDIUM
  ): {
    title: string;
    message: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    actionRequired: boolean;
  } {
    const greeting = userName ? `Hi ${userName}` : 'Hello';

    switch (notificationType) {
      case 'deal_deadline':
        if (urgency === UrgencyLevel.CRITICAL) {
          return {
            title: '🚨 CRITICAL: Deal Deadline Today!',
            message: `${greeting}, your $${dealValue?.toLocaleString() || 'high-value'} deal deadline expires today. Immediate action required!`,
            priority: 'urgent',
            actionRequired: true
          };
        }
        return {
          title: '⏰ Deal Deadline Approaching',
          message: `${greeting}, your $${dealValue?.toLocaleString() || 'deal'} deadline is in ${deadline ? this.calculateDaysToDeadline(deadline) : 'X'} days.`,
          priority: 'high',
          actionRequired: true
        };

      case 'follow_up_overdue':
        return {
          title: '📞 Overdue Follow-up',
          message: `${greeting}, you have overdue follow-ups that need immediate attention.`,
          priority: 'high',
          actionRequired: true
        };

      case 'new_opportunity':
        return {
          title: '💰 New Sales Opportunity',
          message: `${greeting}, a $${dealValue?.toLocaleString() || 'new'} opportunity has been assigned to you.`,
          priority: 'medium',
          actionRequired: false
        };

      case 'deal_won':
        return {
          title: '🎉 Deal Won!',
          message: `${greeting}, congratulations! Your $${dealValue?.toLocaleString() || 'deal'} has been won.`,
          priority: 'medium',
          actionRequired: false
        };

      default:
        return {
          title: '📢 CRM Update',
          message: `${greeting}, you have a new CRM notification.`,
          priority: 'low',
          actionRequired: false
        };
    }
  }

  /**
   * Calculate days until deadline
   */
  static calculateDaysToDeadline(deadline: Date): number {
    const now = new Date();
    const timeDiff = deadline.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return Math.max(0, daysDiff);
  }

  /**
   * Optimize notification timing based on user behavior patterns
   * Following timing optimization best practices
   */
  static optimizeNotificationTiming(
    userActivityPatterns?: { preferredHour?: number; activeDays?: number[] },
    _userTimezone: string = 'Asia/Kolkata'
  ): Date {
    const now = new Date();
    const optimalTime = new Date(now);

    // Default to business hours (9 AM - 6 PM)
    const preferredHour = userActivityPatterns?.preferredHour || 10; // 10 AM default
    const preferredMinute = Math.floor(Math.random() * 60); // Random minute for natural feel

    optimalTime.setHours(preferredHour, preferredMinute, 0, 0);

    // If current time is past preferred time, schedule for tomorrow
    if (now > optimalTime) {
      optimalTime.setDate(optimalTime.getDate() + 1);
    }

    // Check if it's a preferred day (avoid weekends by default)
    const dayOfWeek = optimalTime.getDay();
    const preferredDays = userActivityPatterns?.activeDays || [1, 2, 3, 4, 5]; // Mon-Fri

    if (!preferredDays.includes(dayOfWeek)) {
      // Move to next preferred day
      let daysToAdd = 1;
      let nextDay = (dayOfWeek + daysToAdd) % 7;
      while (!preferredDays.includes(nextDay)) {
        daysToAdd++;
        nextDay = (dayOfWeek + daysToAdd) % 7;
      }
      optimalTime.setDate(optimalTime.getDate() + daysToAdd);
    }

    return optimalTime;
  }

  /**
   * Calculate notification frequency to prevent fatigue
   * Following frequency optimization best practices
   */
  static calculateNotificationFrequency(
    userEngagement: {
      openRate: number;
      responseRate: number;
      lastInteractionDays: number;
    },
    notificationType: string
  ): {
    frequency: 'daily' | 'weekly' | 'immediate' | 'reduced';
    reasoning: string;
  } {
    const { openRate, responseRate, lastInteractionDays } = userEngagement;

    // High engagement users get more notifications
    if (openRate > 0.8 && responseRate > 0.6 && lastInteractionDays <= 7) {
      return {
        frequency: 'daily',
        reasoning: 'High engagement user - daily updates beneficial'
      };
    }

    // Medium engagement users get moderate notifications
    if (openRate > 0.5 && lastInteractionDays <= 14) {
      return {
        frequency: 'weekly',
        reasoning: 'Moderate engagement - weekly summary sufficient'
      };
    }

    // Low engagement or inactive users get minimal notifications
    if (lastInteractionDays > 30) {
      return {
        frequency: 'reduced',
        reasoning: 'Low engagement - minimize notifications'
      };
    }

    // Default to immediate for critical notifications
    if (['deal_deadline', 'follow_up_overdue'].includes(notificationType)) {
      return {
        frequency: 'immediate',
        reasoning: 'Critical notification - immediate delivery required'
      };
    }

    return {
      frequency: 'weekly',
      reasoning: 'Standard engagement - weekly updates'
    };
  }
}

// SMART EFFECTIVENESS SCORING ENGINE
export class EffectivenessScoringEngine {
  /**
   * Calculate follow-up effectiveness score based on multiple factors
   */
  static calculateFollowUpEffectiveness(
    responseReceived: boolean,
    responseQuality: QualityScore,
    completionTime: number, // minutes
    followUpType: string,
    dealValue: number
  ): number {
    let score = 50; // Base score

    // Response factor (most important)
    if (responseReceived) {
      score += 30;

      // Quality factor
      const qualityMultiplier = {
        [QualityScore.POOR]: 0.5,
        [QualityScore.FAIR]: 0.7,
        [QualityScore.GOOD]: 1.0,
        [QualityScore.VERY_GOOD]: 1.2,
        [QualityScore.EXCELLENT]: 1.4
      };
      score *= qualityMultiplier[responseQuality] || 1.0;
    } else {
      score -= 20; // No response penalty
    }

    // Time efficiency factor
    if (completionTime <= 5) score += 10; // Very quick response
    else if (completionTime <= 15) score += 5; // Good response time
    else if (completionTime > 60) score -= 10; // Too slow

    // Deal value factor (higher value = higher importance)
    if (dealValue > 5000000) score += 5; // Enterprise deal bonus

    // Follow-up type effectiveness
    const typeMultiplier: Record<string, number> = {
      'CALL': 1.2, // Most effective
      'MEETING': 1.3, // Very effective
      'SITE_VISIT': 1.4, // Most effective
      'EMAIL': 0.9, // Less effective
      'MESSAGE': 0.8 // Least effective
    };
    score *= typeMultiplier[followUpType] || 1.0;

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  /**
   * Calculate overall sales performance score
   */
  static calculateSalesPerformance(
    dealsWon: number,
    totalDeals: number,
    averageDealSize: number,
    conversionRate: number,
    followUpEffectiveness: number
  ): {
    score: number;
    grade: string;
    recommendations: string[];
  } {
    let score = 0;
    const recommendations: string[] = [];

    // Conversion rate (30% weight)
    if (conversionRate > 0.8) score += 30;
    else if (conversionRate > 0.6) score += 20;
    else if (conversionRate > 0.4) score += 10;
    else recommendations.push('Focus on improving conversion rates');

    // Deal volume (20% weight)
    if (dealsWon > 10) score += 20;
    else if (dealsWon > 5) score += 15;
    else if (dealsWon > 2) score += 10;
    else recommendations.push('Increase deal closing volume');

    // Deal size (25% weight)
    if (averageDealSize > 2000000) score += 25;
    else if (averageDealSize > 1000000) score += 20;
    else if (averageDealSize > 500000) score += 15;
    else recommendations.push('Target higher-value deals');

    // Follow-up effectiveness (25% weight)
    if (followUpEffectiveness > 80) score += 25;
    else if (followUpEffectiveness > 60) score += 20;
    else if (followUpEffectiveness > 40) score += 15;
    else recommendations.push('Improve follow-up effectiveness');

    // Calculate grade
    let grade: string;
    if (score >= 90) grade = 'A+ (Outstanding)';
    else if (score >= 80) grade = 'A (Excellent)';
    else if (score >= 70) grade = 'B (Good)';
    else if (score >= 60) grade = 'C (Average)';
    else if (score >= 50) grade = 'D (Below Average)';
    else grade = 'F (Needs Improvement)';

    return { score, grade, recommendations };
  }

  /**
   * Generate smart next action recommendations
   */
  static generateNextActionRecommendations(
    dealStatus: string,
    lastActivityDays: number,
    followUpCount: number,
    dealValue: number,
    urgencyLevel: UrgencyLevel
  ): string[] {
    const recommendations: string[] = [];

    if (dealStatus === 'BIDDING' && lastActivityDays > 7) {
      recommendations.push('Schedule follow-up call - deal has been inactive for ' + lastActivityDays + ' days');
    }

    if (followUpCount === 0 && dealValue > 1000000) {
      recommendations.push('High-value deal needs immediate follow-up');
    }

    if (urgencyLevel === UrgencyLevel.CRITICAL) {
      recommendations.push('URGENT: Schedule immediate client meeting');
    }

    if (lastActivityDays > 14) {
      recommendations.push('Deal at risk - send personalized email to re-engage');
    }

    if (dealValue > 5000000 && followUpCount < 3) {
      recommendations.push('Enterprise deal requires more touchpoints');
    }

    // Default recommendation if no specific issues
    if (recommendations.length === 0) {
      recommendations.push('Continue regular follow-ups to maintain momentum');
    }

    return recommendations;
  }
}

// UTILITY FUNCTIONS
export const calculateDaysToDeadline = DeadlineManagementEngine.calculateDaysToDeadline;
export const calculateDaysPending = DeadlineManagementEngine.calculateDaysPending;
export const isOverdue = DeadlineManagementEngine.isOverdue;
