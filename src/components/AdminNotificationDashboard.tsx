"use client";

import { useState, useEffect } from 'react';
import { Bell, X, Check, Settings, Trash2, MoreHorizontal, Sparkles, ChevronRight, Archive, User, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationData {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'user' | 'activity' | 'target' | 'schedule';
  url?: string;
  isRead: boolean;
  createdAt: string;
  sender?: {
    name: string;
    email: string;
  };
  recipient?: {
    name: string;
    email: string;
    role: string;
  };
}

interface AdminNotificationResponse {
  notifications: NotificationData[];
  totalCount: number;
  error?: string;
}

export default function AdminNotificationDashboard() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'read' | 'info' | 'success' | 'warning' | 'error'>('all');
  const [animatingItems, setAnimatingItems] = useState<Set<number>>(new Set());
  const [deletingItems, setDeletingItems] = useState<Set<number>>(new Set());

  // Fetch all notifications for admin
  const fetchAllNotifications = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/notifications');
      const data: AdminNotificationResponse = await response.json();

      if (response.ok) {
        setNotifications(data.notifications);
        setFilteredNotifications(data.notifications);
      } else {
        setError(data.error || 'Failed to fetch notifications');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  // Filter notifications based on search and filter
  useEffect(() => {
    let result = notifications;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(notification => 
        notification.title.toLowerCase().includes(term) ||
        notification.message.toLowerCase().includes(term) ||
        (notification.sender?.name.toLowerCase().includes(term)) ||
        (notification.recipient?.name.toLowerCase().includes(term))
      );
    }

    // Apply type filter
    if (activeFilter !== 'all') {
      if (activeFilter === 'unread') {
        result = result.filter(n => !n.isRead);
      } else if (activeFilter === 'read') {
        result = result.filter(n => n.isRead);
      } else {
        result = result.filter(n => n.type === activeFilter);
      }
    }

    setFilteredNotifications(result);
  }, [notifications, searchTerm, activeFilter]);

  // Initialize on mount
  useEffect(() => {
    fetchAllNotifications();
  }, []);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '🚨';
      case 'info': return 'ℹ️';
      case 'user': return '👤';
      case 'activity': return '📈';
      case 'target': return '🎯';
      case 'schedule': return '📅';
      default: return '💬';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-500/10 text-green-600';
      case 'warning': return 'bg-yellow-500/10 text-yellow-600';
      case 'error': return 'bg-red-500/10 text-red-600';
      case 'info': return 'bg-blue-500/10 text-blue-600';
      case 'user': return 'bg-purple-500/10 text-purple-600';
      case 'activity': return 'bg-indigo-500/10 text-indigo-600';
      case 'target': return 'bg-teal-500/10 text-teal-600';
      case 'schedule': return 'bg-orange-500/10 text-orange-600';
      default: return 'bg-blue-500/10 text-blue-600';
    }
  };

  const handleMarkAsRead = async (notificationId: number) => {
    setAnimatingItems(prev => new Set([...prev, notificationId]));
    // In a real implementation, you would call an API to mark as read
    setTimeout(() => {
      setAnimatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }, 400);
  };

  const handleDeleteNotification = async (notificationId: number) => {
    setDeletingItems(prev => new Set([...prev, notificationId]));
    setTimeout(async () => {
      // In a real implementation, you would call an API to delete
      setDeletingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }, 500);
  };

  const handleMarkAllRead = async () => {
    const unreadIds = filteredNotifications.filter(n => !n.isRead).map(n => n.id);
    if (unreadIds.length === 0) return;
    setAnimatingItems(prev => new Set([...prev, ...unreadIds]));
    // In a real implementation, you would call an API to mark all as read
    setTimeout(() => {
      setAnimatingItems(new Set());
    }, 400);
  };

  const handleDeleteAll = async () => {
    const ids = filteredNotifications.map(n => n.id);
    if (ids.length === 0) return;
    setDeletingItems(prev => new Set([...prev, ...ids]));
    setTimeout(async () => {
      // In a real implementation, you would call an API to delete all
      setDeletingItems(new Set());
    }, 500);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <CardHeader className="border-b border-gray-200 dark:border-gray-800">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="
                  w-12 h-12 rounded-xl
                  bg-gradient-to-r from-blue-500 to-indigo-500
                  flex items-center justify-center
                  shadow-lg
                ">
                  <Bell className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                    Admin Notification Dashboard
                  </CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    View and manage all system notifications
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAllNotifications}
                className="rounded-lg border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-lg">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 w-48">
                    <DropdownMenuItem onClick={() => setActiveFilter('all')} className="py-2 px-3">
                      All Notifications
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setActiveFilter('unread')} className="py-2 px-3">
                      Unread Only
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setActiveFilter('read')} className="py-2 px-3">
                      Read Only
                    </DropdownMenuItem>
                    <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                    <DropdownMenuItem onClick={() => setActiveFilter('info')} className="py-2 px-3">
                      <span className="flex items-center">
                        <span className="w-3 h-3 rounded-full bg-blue-500/10 mr-2"></span>
                        Info
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setActiveFilter('success')} className="py-2 px-3">
                      <span className="flex items-center">
                        <span className="w-3 h-3 rounded-full bg-green-500/10 mr-2"></span>
                        Success
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setActiveFilter('warning')} className="py-2 px-3">
                      <span className="flex items-center">
                        <span className="w-3 h-3 rounded-full bg-yellow-500/10 mr-2"></span>
                        Warning
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setActiveFilter('error')} className="py-2 px-3">
                      <span className="flex items-center">
                        <span className="w-3 h-3 rounded-full bg-red-500/10 mr-2"></span>
                        Error
                      </span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllRead}
                  disabled={filteredNotifications.filter(n => !n.isRead).length === 0}
                  className="rounded-lg disabled:opacity-50"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Mark All Read
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteAll}
                  disabled={filteredNotifications.length === 0}
                  className="rounded-lg text-red-600 disabled:opacity-50"
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-4 pt-2">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">
                <p className="text-xs text-blue-600 dark:text-blue-400">Total</p>
                <p className="text-lg font-semibold text-blue-900 dark:text-blue-100">{notifications.length}</p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg px-3 py-2">
                <p className="text-xs text-yellow-600 dark:text-yellow-400">Unread</p>
                <p className="text-lg font-semibold text-yellow-900 dark:text-yellow-100">
                  {notifications.filter(n => !n.isRead).length}
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2">
                <p className="text-xs text-green-600 dark:text-green-400">Read</p>
                <p className="text-lg font-semibold text-green-900 dark:text-green-100">
                  {notifications.filter(n => n.isRead).length}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-250px)]">
            {loading ? (
              <div className="p-8 text-center">
                <div className="mx-auto mb-3 w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading notifications...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <X className="h-8 w-8 text-red-500" />
                </div>
                <p className="font-medium text-gray-900 dark:text-white mb-1">Error loading notifications</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
                <Button onClick={fetchAllNotifications} variant="outline">
                  Try Again
                </Button>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Bell className="h-8 w-8 text-gray-400" />
                </div>
                <p className="font-medium text-gray-900 dark:text-white mb-1">No notifications found</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {searchTerm || activeFilter !== 'all' 
                    ? 'Try adjusting your search or filter criteria' 
                    : 'There are no notifications in the system'}
                </p>
              </div>
            ) : (
              <div className="py-1">
                <AnimatePresence>
                  {filteredNotifications.map((notification, index) => {
                    const isAnimating = animatingItems.has(notification.id);
                    const isDeleting = deletingItems.has(notification.id);

                    return (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 300, height: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className={`
                          border-b border-gray-100 dark:border-gray-800
                          transition-all duration-200
                          ${isDeleting ? 'opacity-0 scale-95' : ''}
                          hover:bg-gray-50 dark:hover:bg-gray-800/50
                          overflow-hidden
                        `}
                      >
                        <div className="flex items-start gap-4 p-4">
                          {/* Icon */}
                          <div className={`
                            w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0
                            ${getNotificationColor(notification.type)}
                          `}>
                            <span className="text-lg">
                              {getNotificationIcon(notification.type)}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className={`
                                    text-sm font-medium
                                    ${notification.isRead 
                                      ? 'text-gray-700 dark:text-gray-300' 
                                      : 'text-gray-900 dark:text-white font-semibold'}
                                  `}>
                                    {notification.title}
                                  </h4>
                                  {!notification.isRead && (
                                    <Badge variant="destructive" className="h-4 text-xs px-1.5">
                                      Unread
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                  {notification.message}
                                </p>
                                <div className="flex flex-wrap gap-2 text-xs">
                                  {notification.sender && (
                                    <span className="inline-flex items-center bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded px-2 py-1">
                                      <User className="h-3 w-3 mr-1" />
                                      From: {notification.sender.name}
                                    </span>
                                  )}
                                  {notification.recipient && (
                                    <span className="inline-flex items-center bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded px-2 py-1">
                                      <User className="h-3 w-3 mr-1" />
                                      To: {notification.recipient.name} ({notification.recipient.role})
                                    </span>
                                  )}
                                  <span className="inline-flex items-center bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded px-2 py-1">
                                    {formatTime(notification.createdAt)}
                                  </span>
                                  <span className={`inline-flex items-center rounded px-2 py-1 ${getNotificationColor(notification.type)}`}>
                                    {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMarkAsRead(notification.id)}
                                  disabled={notification.isRead}
                                  className="rounded-full p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
                                  aria-label="Mark as read"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteNotification(notification.id)}
                                  className="rounded-full p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 text-red-600"
                                  aria-label="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}