"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { integrationService } from "@/lib/integrationService";
import {
  Zap,
  Bell,
  Settings,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Activity,
  BarChart3,
  FileText
} from "lucide-react";

export default function IntegrationDemo() {
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [notificationStatus, setNotificationStatus] = useState<any>(null);
  const [userPreferences, setUserPreferences] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [lastAction, setLastAction] = useState<string>("");

  useEffect(() => {
    checkSystemHealth();
    checkNotificationStatus();
    loadUserPreferences();
  }, []);

  const checkSystemHealth = async () => {
    try {
      const health = await integrationService.checkSystemHealth();
      setSystemHealth(health);
    } catch (error) {
      console.error("Health check failed:", error);
    }
  };

  const checkNotificationStatus = async () => {
    try {
      const response = await fetch('/api/notifications/cross-platform/status');
      const status = await response.json();
      setNotificationStatus(status);
    } catch (error) {
      console.error("Notification status failed:", error);
    }
  };

  const loadUserPreferences = async () => {
    try {
      const prefs = await integrationService.getUserPreferences("1"); // Demo user ID
      setUserPreferences(prefs);
    } catch (error) {
      console.error("Preferences load failed:", error);
    }
  };

  const testDataSync = async () => {
    setLoading(true);
    setLastAction("Testing data synchronization...");

    try {
      await integrationService.syncDataAcrossSystems('demo_sync', {
        message: 'Integration test data',
        timestamp: new Date(),
        test: true
      });
      setLastAction("✅ Data synchronization successful!");
    } catch (error) {
      setLastAction("❌ Data synchronization failed");
      console.error("Sync failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendCrossPlatformNotification = async () => {
    setLoading(true);
    setLastAction("Sending cross-platform notification...");

    try {
      await integrationService.sendCrossPlatformNotification(
        "1", // Demo user ID
        "Integration Test",
        "This notification was sent via the integration service!",
        ['dashboard', 'analytics', 'reports']
      );
      setLastAction("✅ Cross-platform notification sent!");
      // Refresh notification status
      setTimeout(checkNotificationStatus, 1000);
    } catch (error) {
      setLastAction("❌ Notification failed");
      console.error("Notification failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async () => {
    setLoading(true);
    setLastAction("Updating user preferences...");

    try {
      const success = await integrationService.updateUserPreferences("1", {
        theme: userPreferences?.theme === 'light' ? 'dark' : 'light',
        dashboardLayout: 'updated'
      });
      if (success) {
        setLastAction("✅ Preferences updated successfully!");
        loadUserPreferences(); // Refresh preferences
      } else {
        setLastAction("❌ Preferences update failed");
      }
    } catch (error) {
      setLastAction("❌ Preferences update failed");
      console.error("Preferences update failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Zap className="h-6 w-6 text-blue-600" />
            CRM System Integration Demo
          </CardTitle>
          <p className="text-sm text-gray-600">
            Test API connections, data synchronization, cross-platform notifications, and unified preferences
          </p>
        </CardHeader>
      </Card>

      {/* System Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Health Check
          </CardTitle>
        </CardHeader>
        <CardContent>
          {systemHealth ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Object.entries(systemHealth).map(([system, healthy]) => (
                <div key={system} className="flex items-center gap-3 p-3 border rounded-lg">
                  {healthy ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <div>
                    <div className="font-medium capitalize">{system}</div>
                    <div className="text-sm text-gray-500">
                      {healthy ? 'Operational' : 'Down'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">Loading system health...</div>
          )}
        </CardContent>
      </Card>

      {/* Cross-Platform Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Cross-Platform Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notificationStatus ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Unread Notifications:</span>
                <Badge variant="secondary">{notificationStatus.totalUnread}</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(notificationStatus.platforms).map(([platform, status]: [string, any]) => (
                  <div key={platform} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium capitalize">{platform}</span>
                      <Badge variant={status.unread > 0 ? "destructive" : "secondary"}>
                        {status.unread}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500">{status.status}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-4">Loading notification status...</div>
          )}

          <div className="mt-4">
            <Button
              onClick={sendCrossPlatformNotification}
              disabled={loading}
              className="w-full"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Bell className="h-4 w-4 mr-2" />}
              Send Test Notification to All Platforms
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Unified User Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Unified User Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          {userPreferences ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">Theme:</span>
                  <Badge className="ml-2">{userPreferences.theme}</Badge>
                </div>
                <div>
                  <span className="font-medium">Timezone:</span>
                  <Badge className="ml-2">{userPreferences.timezone}</Badge>
                </div>
                <div>
                  <span className="font-medium">Layout:</span>
                  <Badge className="ml-2">{userPreferences.dashboardLayout}</Badge>
                </div>
                <div>
                  <span className="font-medium">Email Notifications:</span>
                  <Badge className="ml-2">
                    {userPreferences.notificationSettings?.email ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </div>

              <div className="mt-4">
                <Button
                  onClick={updatePreferences}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Settings className="h-4 w-4 mr-2" />}
                  Toggle Theme & Update Preferences
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">Loading user preferences...</div>
          )}
        </CardContent>
      </Card>

      {/* Integration Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={testDataSync}
              disabled={loading}
              variant="outline"
              className="h-16 flex flex-col gap-2"
            >
              <RefreshCw className="h-5 w-5" />
              <span className="text-sm">Test Data Sync</span>
            </Button>

            <Button
              onClick={checkSystemHealth}
              disabled={loading}
              variant="outline"
              className="h-16 flex flex-col gap-2"
            >
              <Activity className="h-5 w-5" />
              <span className="text-sm">Refresh Health</span>
            </Button>

            <Button
              onClick={() => window.location.reload()}
              disabled={loading}
              variant="outline"
              className="h-16 flex flex-col gap-2"
            >
              <BarChart3 className="h-5 w-5" />
              <span className="text-sm">Refresh Demo</span>
            </Button>
          </div>

          {lastAction && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                {lastAction.includes('✅') ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : lastAction.includes('❌') ? (
                  <XCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                )}
                <span className="text-sm">{lastAction}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Integration Benefits */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-green-800">🎯 Integration Benefits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Seamless data flow between systems</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Real-time cross-platform notifications</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Unified user experience</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Automated system health monitoring</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Consistent preferences across platforms</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Scalable architecture for future growth</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
