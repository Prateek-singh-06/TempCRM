// Integration Service for CRM System Components
// Handles API connections, data synchronization, and cross-platform features

interface SystemHealth {
  dashboard: boolean;
  analytics: boolean;
  reports: boolean;
  notifications: boolean;
}

interface UserPreferences {
  dashboardLayout: string;
  analyticsCharts: string[];
  notificationSettings: {
    email: boolean;
    push: boolean;
    frequency: string;
  };
  theme: string;
  timezone: string;
}

class IntegrationService {
  private baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Health Check - Verify all systems are operational
  async checkSystemHealth(): Promise<SystemHealth> {
    try {
      const [dashboard, analytics, reports, notifications] = await Promise.all([
        fetch(`${this.baseUrl}/api/analytics`).then(r => r.ok),
        fetch(`${this.baseUrl}/api/analytics`).then(r => r.ok), // Analytics uses same endpoint
        fetch(`${this.baseUrl}/api/reports`).then(r => r.ok),
        fetch(`${this.baseUrl}/api/notifications`).then(r => r.ok)
      ]);

      return {
        dashboard,
        analytics,
        reports,
        notifications
      };
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        dashboard: false,
        analytics: false,
        reports: false,
        notifications: false
      };
    }
  }

  // Unified Data Sync - Synchronize data across systems
  async syncDataAcrossSystems(dataType: string, payload: any): Promise<void> {
    const endpoints = [
      `${this.baseUrl}/api/sync/dashboard`,
      `${this.baseUrl}/api/sync/analytics`,
      `${this.baseUrl}/api/sync/reports`
    ];

    await Promise.all(
      endpoints.map(endpoint =>
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataType, payload, timestamp: new Date() })
        })
      )
    );
  }

  // Cross-Platform Notifications
  async sendCrossPlatformNotification(
    userId: string,
    title: string,
    message: string,
    platforms: ('dashboard' | 'analytics' | 'reports')[] = ['dashboard', 'analytics', 'reports']
  ): Promise<void> {
    // Send notification to all specified platforms
    await Promise.all(
      platforms.map(platform =>
        fetch(`${this.baseUrl}/api/notifications/cross-platform`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, title, message, platform })
        })
      )
    );
  }

  // Unified User Preferences
  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/user/preferences/${userId}`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch user preferences:', error);
      return null;
    }
  }

  async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/user/preferences/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to update user preferences:', error);
      return false;
    }
  }

  // Real-time Data Streaming
  async subscribeToRealtimeUpdates(
    userId: string,
    callback: (data: any) => void,
    systems: ('dashboard' | 'analytics' | 'reports')[] = ['dashboard']
  ): Promise<void> {
    // Set up WebSocket or Server-Sent Events connection
    const eventSource = new EventSource(`${this.baseUrl}/api/realtime/${userId}`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (systems.includes(data.system)) {
        callback(data);
      }
    };

    eventSource.onerror = (error) => {
      console.error('Realtime connection error:', error);
    };
  }

  // API Connection Status
  async testApiConnections(): Promise<{
    dashboard: boolean;
    analytics: boolean;
    reports: boolean;
    notifications: boolean;
    email: boolean;
  }> {
    const tests = await Promise.allSettled([
      fetch(`${this.baseUrl}/api/analytics`),
      fetch(`${this.baseUrl}/api/analytics`), // Analytics uses same endpoint
      fetch(`${this.baseUrl}/api/reports`),
      fetch(`${this.baseUrl}/api/notifications`),
      fetch(`${this.baseUrl}/api/email`)
    ]);

    return {
      dashboard: tests[0].status === 'fulfilled' && tests[0].value.ok,
      analytics: tests[1].status === 'fulfilled' && tests[1].value.ok,
      reports: tests[2].status === 'fulfilled' && tests[2].value.ok,
      notifications: tests[3].status === 'fulfilled' && tests[3].value.ok,
      email: tests[4].status === 'fulfilled' && tests[4].value.ok
    };
  }
}

// Export singleton instance
export const integrationService = new IntegrationService();
export default integrationService;
