"use client";

import { useState } from "react";
import EnhancedNotificationBell from "@/components/EnhancedNotificationBell";
import AdminNotificationDashboard from "@/components/AdminNotificationDashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotificationTestPage() {
  const [view, setView] = useState<'user' | 'admin'>('user');

  return (
    <div className="container mx-auto p-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Notification System Test</CardTitle>
          <CardDescription>
            Test the enhanced notification bell and admin dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button 
              variant={view === 'user' ? 'default' : 'outline'} 
              onClick={() => setView('user')}
            >
              User View
            </Button>
            <Button 
              variant={view === 'admin' ? 'default' : 'outline'} 
              onClick={() => setView('admin')}
            >
              Admin View
            </Button>
          </div>
        </CardContent>
      </Card>

      {view === 'user' ? (
        <Card>
          <CardHeader>
            <CardTitle>User Notification Bell</CardTitle>
            <CardDescription>
              Enhanced notification bell with improved animations and filtering
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center p-8">
              <EnhancedNotificationBell />
            </div>
            <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <h3 className="font-medium mb-2">Features:</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Enhanced visual design with better animations</li>
                <li>Near real-time updates with 60-second polling</li>
                <li>Filtering capabilities (All, Unread, Read)</li>
                <li>Improved performance with caching</li>
                <li>Better visual indicators for notification types</li>
                <li>Smooth transitions and hover effects</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      ) : (
        <AdminNotificationDashboard />
      )}
    </div>
  );
}