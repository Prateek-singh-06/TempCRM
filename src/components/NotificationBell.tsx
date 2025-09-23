"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, X, Check, Settings, Trash2, MoreHorizontal, Sparkles, ChevronRight, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useNotifications } from '@/lib/hooks/useNotifications';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animatingItems, setAnimatingItems] = useState<Set<number>>(new Set());
  const [deletingItems, setDeletingItems] = useState<Set<number>>(new Set());
  const notificationRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [placement, setPlacement] = useState<{ vertical: 'top' | 'bottom'; horizontal: 'left' | 'right' }>({ vertical: 'bottom', horizontal: 'right' });
  const placementCacheRef = useRef<{ vertical: 'top' | 'bottom'; horizontal: 'left' | 'right' } | null>(null);
  const lastComputationRef = useRef<number>(0);

  // Debounce function for event handlers
  const debounce = (func: (...args: any[]) => void, wait: number) => {
    let timeout: NodeJS.Timeout | null = null;
    return (...args: any[]) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification, deleteAllNotifications, fetchNotifications } = useNotifications();

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (
        isOpen &&
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (isOpen) {
      handleClose();
    } else {
      handleOpen();
    }
  };

  const handleOpen = () => {
    setIsAnimating(true);
    setIsOpen(true);
    requestAnimationFrame(() => {
      recomputePlacement();
    });
    setTimeout(() => setIsAnimating(false), 250); // Reduced from 600ms to 250ms
  };

  const handleClose = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsAnimating(false);
    }, 200); // Reduced from 400ms to 200ms
  };

  const recomputePlacement = useCallback(() => {
    // Throttle placement computation to at most once per 50ms
    const now = Date.now();
    if (now - lastComputationRef.current < 50) {
      if (placementCacheRef.current) {
        setPlacement(placementCacheRef.current);
        return;
      }
    }
    
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    
    const horizontal: 'left' | 'right' = (rect.left + rect.width / 2) > vw / 2 ? 'right' : 'left';
    const vertical: 'top' | 'bottom' = (vh - rect.bottom) < 500 && rect.top > (vh - rect.bottom) ? 'top' : 'bottom';

    const newPlacement = { vertical, horizontal };
    placementCacheRef.current = newPlacement;
    lastComputationRef.current = now;
    setPlacement(newPlacement);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const debouncedRecompute = debounce(recomputePlacement, 100); // Debounce with 100ms delay
    window.addEventListener('resize', debouncedRecompute);
    window.addEventListener('scroll', debouncedRecompute, true);
    return () => {
      window.removeEventListener('resize', debouncedRecompute);
      window.removeEventListener('scroll', debouncedRecompute, true);
    };
  }, [isOpen]);

  const handleNotificationClick = (notification: any) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    if (notification.url) {
      const element = notificationRefs.current.get(notification.id);
      if (element) {
        setAnimatingItems(prev => new Set([...prev, notification.id]));
        setTimeout(() => {
          window.location.href = notification.url;
        }, 400);
      } else {
        window.location.href = notification.url;
      }
    }
    setTimeout(() => handleClose(), 150);
  };

  const handleDeleteNotification = async (notificationId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    setDeletingItems(prev => new Set([...prev, notificationId]));
    setTimeout(async () => {
      await deleteNotification(notificationId);
      setDeletingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }, 500);
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
    if (unreadIds.length === 0) return;
    setAnimatingItems(prev => new Set([...prev, ...unreadIds]));
    await markAllAsRead();
    setTimeout(() => {
      setAnimatingItems(prev => {
        const next = new Set(prev);
        unreadIds.forEach(id => next.delete(id));
        return next;
      });
    }, 400);
  };

  const handleDeleteAll = async () => {
    const ids = notifications.map(n => n.id);
    if (ids.length === 0) return;
    setDeletingItems(prev => new Set([...prev, ...ids]));
    setTimeout(async () => {
      await deleteAllNotifications();
      setDeletingItems(new Set());
    }, 500);
  };

  const handleMarkAsRead = async (notificationId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    setAnimatingItems(prev => new Set([...prev, notificationId]));
    await markAsRead(notificationId);
    setTimeout(() => {
      setAnimatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }, 400);
  };


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
      default: return '💬';
    }
  };

  return (
    <div className="relative">
      {/* macOS Style Bell Button */}
      <Button
        ref={buttonRef}
        variant="ghost"
        size="sm"
        className={`
          relative group 
          transition-all duration-500 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)]
          hover:scale-110 active:scale-95
          ${isOpen ? 'macos-button-active' : ''}
        `}
        onClick={handleToggle}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="relative">
          <Bell className={`
            h-5 w-5 transition-all duration-500 ease-out
            ${isOpen ? 'rotate-[15deg] scale-110' : ''}
            ${unreadCount > 0 && !isOpen ? 'macos-bell-ring' : ''}
          `} />

          {/* Notification Badge with macOS bounce */}
          {unreadCount > 0 && (
            <Badge className={`
              absolute -top-2 -right-2 min-w-[20px] h-5 px-1
              flex items-center justify-center
              text-[10px] font-semibold
              macos-badge
              ${isOpen ? 'macos-badge-active' : ''}
            `}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}

          {/* Ripple effect on click */}
          {isOpen && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="macos-ripple" />
            </div>
          )}
        </div>

        {/* Glow effect */}
        {unreadCount > 0 && !isOpen && (
          <div className="absolute inset-0 rounded-full macos-glow pointer-events-none" />
        )}
      </Button>

      {/* macOS Style Dropdown with Genie Effect */}
      {(isOpen || isAnimating) && (
        <div
          ref={dropdownRef}
          className={`
            absolute z-[100] 
            ${placement.horizontal === 'right' ? 'right-0' : 'left-0'}
            ${placement.vertical === 'bottom' ? 'top-12' : 'bottom-12'}
            ${isOpen && !isAnimating ? 'macos-genie-open' : ''}
            ${!isOpen && isAnimating ? 'macos-genie-close' : ''}
            ${!isOpen && !isAnimating ? 'opacity-0 scale-0 pointer-events-none' : ''}
          `}
          style={{
            transformOrigin: `${placement.vertical === 'bottom' ? 'top' : 'bottom'} ${placement.horizontal === 'right' ? 'right' : 'left'}`,
          }}
        >
          <Card className="
            w-[380px] max-w-[calc(100vw-2rem)] 
            macos-card
            overflow-hidden
          ">
            {/* Header with macOS vibrancy */}
            <CardHeader className="macos-header">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="macos-icon-container">
                    <Bell className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold macos-title">
                      Notifications
                    </CardTitle>
                    {unreadCount > 0 && (
                      <p className="text-xs macos-subtitle mt-0.5">
                        {unreadCount} unread
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="macos-close-button"
                  aria-label="Close notifications"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Action Buttons with macOS style */}
              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchNotifications()}
                  className="macos-action-button"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllRead}
                  disabled={unreadCount === 0}
                  className="macos-action-button"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Read All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteAll}
                  disabled={notifications.length === 0}
                  className="macos-action-button text-red-600"
                >
                  <Archive className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              </div>
            </CardHeader>

            {/* Content with macOS scroll behavior */}
            <CardContent className="p-0">
              <ScrollArea className="h-[420px] macos-scroll">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="macos-loader mx-auto mb-3" />
                    <p className="text-sm macos-subtitle">Loading notifications...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="macos-empty-icon mx-auto mb-4">
                      <Bell className="h-8 w-8" />
                    </div>
                    <p className="font-medium macos-title mb-1">No notifications</p>
                    <p className="text-sm macos-subtitle">You're all caught up!</p>
                  </div>
                ) : (
                  <div className="py-1">
                    {notifications.map((notification, index) => {
                      const isAnimating = animatingItems.has(notification.id);
                      const isDeleting = deletingItems.has(notification.id);

                      return (
                        <div
                          key={notification.id}
                          ref={(el) => {
                            if (el) {
                              notificationRefs.current.set(notification.id, el);
                            } else {
                              notificationRefs.current.delete(notification.id);
                            }
                          }}
                          className={`
                            macos-notification-item
                            ${!notification.isRead ? 'macos-notification-unread' : ''}
                            ${isDeleting ? 'macos-notification-deleting' : ''}
                            ${isAnimating ? 'macos-notification-animating' : ''}
                          `}
                          style={{
                            animationDelay: `${index * 20}ms`, // Reduced from 40ms to 20ms
                          }}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-start gap-3 p-3 px-4">
                            {/* Icon */}
                            <div className={`
                              macos-notification-icon
                              ${notification.type === 'success' ? 'bg-green-500/10 text-green-600' :
                                notification.type === 'warning' ? 'bg-yellow-500/10 text-yellow-600' :
                                notification.type === 'error' ? 'bg-red-500/10 text-red-600' :
                                'bg-blue-500/10 text-blue-600'}
                            `}>
                              <span className="text-sm">
                                {getNotificationIcon(notification.type)}
                              </span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className="macos-notification-title">
                                    {notification.title}
                                  </h4>
                                  <p className="macos-notification-message">
                                    {notification.message}
                                  </p>
                                  {notification.sender && (
                                    <p className="macos-notification-sender">
                                      From {notification.sender.name}
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className="macos-notification-time">
                                    {formatTime(notification.createdAt)}
                                  </span>

                                  {/* Action Menu */}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="macos-notification-menu"
                                        onClick={(e) => e.stopPropagation()}
                                        aria-label="Actions"
                                      >
                                        <MoreHorizontal className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="macos-dropdown-menu">
                                      {!notification.isRead && (
                                        <DropdownMenuItem
                                          onClick={(e) => handleMarkAsRead(notification.id, e)}
                                          className="macos-dropdown-item"
                                        >
                                          <Check className="mr-2 h-4 w-4" />
                                          Mark as Read
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem
                                        onClick={(e) => handleDeleteNotification(notification.id, e)}
                                        className="macos-dropdown-item text-red-600"
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            </div>

                            {/* Unread dot */}
                            {!notification.isRead && (
                              <div className="macos-unread-dot" />
                            )}
                          </div>

                          {/* Hover indicator */}
                          <ChevronRight className="macos-notification-chevron" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {/* macOS Inspired Styles */}
      <style jsx>{`
        /* macOS Genie Effect */
        @keyframes macos-genie-in {
          0% {
            opacity: 0;
            transform: scale(0.1) translateY(20px);
            filter: blur(10px);
          }
          40% {
            opacity: 0.8;
            transform: scale(0.7) translateY(10px) rotateX(10deg);
            filter: blur(2px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0) rotateX(0);
            filter: blur(0);
          }
        }

        @keyframes macos-genie-out {
          0% {
            opacity: 1;
            transform: scale(1) translateY(0) rotateX(0);
            filter: blur(0);
          }
          60% {
            opacity: 0.8;
            transform: scale(0.7) translateY(10px) rotateX(-10deg);
            filter: blur(2px);
          }
          100% {
            opacity: 0;
            transform: scale(0.1) translateY(20px);
            filter: blur(10px);
          }
        }

        .macos-genie-open {
          animation: macos-genie-in 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }

        .macos-genie-close {
          animation: macos-genie-out 0.4s cubic-bezier(0.55, 0.055, 0.675, 0.19) forwards;
        }

        /* macOS Bell Ring */
        @keyframes macos-bell-ring {
          0%, 100% { transform: rotate(0); }
          10%, 30% { transform: rotate(-3deg); }
          20%, 40% { transform: rotate(3deg); }
        }

        .macos-bell-ring {
          animation: macos-bell-ring 1s ease-in-out infinite; /* Reduced from 2s to 1s */
        }

        /* macOS Badge */
        @keyframes macos-badge-bounce {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }

        .macos-badge {
          background: linear-gradient(135deg, #FF3B30 0%, #FF453A 100%);
          color: white;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(255, 59, 48, 0.3);
          animation: macos-badge-bounce 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .macos-badge-active {
          transform: scale(1.1);
          box-shadow: 0 3px 12px rgba(255, 59, 48, 0.5);
        }

        /* macOS Ripple */
        @keyframes macos-ripple {
          0% {
            width: 0;
            height: 0;
            opacity: 1;
          }
          100% {
            width: 50px;
            height: 50px;
            opacity: 0;
          }
        }

        .macos-ripple {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0, 122, 255, 0.3) 0%, transparent 70%);
          animation: macos-ripple 0.6s ease-out;
        }

        /* macOS Glow */
        @keyframes macos-glow-pulse {
          0%, 100% {
            box-shadow: 0 0 5px rgba(0, 122, 255, 0.2);
          }
          50% {
            box-shadow: 0 0 20px rgba(0, 122, 255, 0.4);
          }
        }

        .macos-glow {
          animation: macos-glow-pulse 2s ease-in-out infinite;
        }

        /* macOS Card */
        .macos-card {
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(50px) saturate(180%);
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 12px;
          box-shadow: 
            0 8px 38px rgba(0, 0, 0, 0.12),
            0 3px 8px rgba(0, 0, 0, 0.04),
            inset 0 1px 0 rgba(255, 255, 255, 0.9);
        }

        .dark .macos-card {
          background: rgba(30, 30, 30, 0.98);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 
            0 8px 38px rgba(0, 0, 0, 0.5),
            0 3px 8px rgba(0, 0, 0, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        /* macOS Header */
        .macos-header {
          background: linear-gradient(180deg, 
            rgba(255, 255, 255, 0.95) 0%, 
            rgba(255, 255, 255, 0.85) 100%
          );
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
          backdrop-filter: blur(20px);
        }

        .dark .macos-header {
          background: linear-gradient(180deg, 
            rgba(40, 40, 40, 0.95) 0%, 
            rgba(30, 30, 30, 0.85) 100%
          );
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        /* macOS Icon Container */
        .macos-icon-container {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, #007AFF 0%, #0051D5 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0, 122, 255, 0.25);
        }

        /* macOS Title */
        .macos-title {
          color: #1d1d1f;
          letter-spacing: -0.01em;
        }

        .dark .macos-title {
          color: #f5f5f7;
        }

        .macos-subtitle {
          color: #86868b;
        }

        /* macOS Close Button */
        .macos-close-button {
          width: 28px;
          height: 28px;
          padding: 0;
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        .macos-close-button:hover {
          background: rgba(255, 59, 48, 0.1);
          color: #FF3B30;
        }

        /* macOS Action Button */
        .macos-action-button {
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          background: rgba(0, 0, 0, 0.03);
          border: 1px solid rgba(0, 0, 0, 0.08);
          transition: all 0.2s ease;
        }

        .dark .macos-action-button {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .macos-action-button:hover {
          background: rgba(0, 122, 255, 0.08);
          border-color: rgba(0, 122, 255, 0.2);
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 122, 255, 0.15);
        }

        .macos-action-button:active {
          transform: translateY(0);
        }

        /* macOS Loader */
        @keyframes macos-loader {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .macos-loader {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(0, 122, 255, 0.1);
          border-top-color: #007AFF;
          border-radius: 50%;
          animation: macos-loader 0.8s ease-in-out infinite;
        }

        /* macOS Empty Icon */
        .macos-empty-icon {
          width: 64px;
          height: 64px;
          border-radius: 16px;
          background: linear-gradient(135deg, 
            rgba(0, 122, 255, 0.05) 0%, 
            rgba(0, 122, 255, 0.1) 100%
          );
          display: flex;
          align-items: center;
          justify-content: center;
          color: #007AFF;
        }

        /* macOS Notification Item */
        @keyframes macos-slide-in {
          0% {
            opacity: 0;
            transform: translateX(-20px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .macos-notification-item {
          position: relative;
          background: transparent;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
          transition: all 0.2s ease;
          cursor: pointer;
          animation: macos-slide-in 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }

        .dark .macos-notification-item {
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .macos-notification-item:hover {
          background: rgba(0, 122, 255, 0.03);
        }

        .dark .macos-notification-item:hover {
          background: rgba(0, 122, 255, 0.05);
        }

        .macos-notification-unread {
          background: rgba(0, 122, 255, 0.02);
        }

        .dark .macos-notification-unread {
          background: rgba(0, 122, 255, 0.03);
        }

        /* macOS Notification Deleting */
        @keyframes macos-delete {
          0% {
            opacity: 1;
            transform: translateX(0);
          }
          100% {
            opacity: 0;
            transform: translateX(100%);
            height: 0;
            padding: 0;
            margin: 0;
          }
        }

        .macos-notification-deleting {
          animation: macos-delete 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }

        /* macOS Notification Animating */
        .macos-notification-animating {
          background: rgba(52, 199, 89, 0.05);
        }

        /* macOS Notification Icon */
        .macos-notification-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        /* macOS Notification Title */
        .macos-notification-title {
          font-size: 14px;
          color: #1d1d1f;
          line-height: 1.4;
          margin-bottom: 2px;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .dark .macos-notification-title {
          color: #f5f5f7;
        }

        /* macOS Notification Message */
        .macos-notification-message {
          font-size: 13px;
          color: #86868b;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* macOS Notification Sender */
        .macos-notification-sender {
          font-size: 11px;
          color: #86868b;
          margin-top: 4px;
          font-weight: 500;
        }

        /* macOS Notification Time */
        .macos-notification-time {
          font-size: 11px;
          color: #86868b;
          white-space: nowrap;
        }

        /* macOS Notification Menu */
        .macos-notification-menu {
          width: 24px;
          height: 24px;
          padding: 0;
          opacity: 0;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .macos-notification-item:hover .macos-notification-menu {
          opacity: 1;
        }

        .macos-notification-menu:hover {
          background: rgba(0, 0, 0, 0.05);
        }

        .dark .macos-notification-menu:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        /* macOS Unread Dot */
        @keyframes macos-dot-pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.8;
          }
        }

        .macos-unread-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: linear-gradient(135deg, #007AFF 0%, #0051D5 100%);
          flex-shrink: 0;
          margin-top: 6px;
          animation: macos-dot-pulse 2s ease-in-out infinite;
          box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.1);
        }

        /* macOS Notification Chevron */
        .macos-notification-chevron {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 16px;
          height: 16px;
          color: #86868b;
          opacity: 0;
          transition: all 0.2s ease;
        }

        .macos-notification-item:hover .macos-notification-chevron {
          opacity: 1;
          transform: translateY(-50%) translateX(2px);
        }

        /* macOS Dropdown Menu */
        .macos-dropdown-menu {
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(50px);
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 8px;
          box-shadow: 
            0 4px 20px rgba(0, 0, 0, 0.15),
            0 0 0 0.5px rgba(0, 0, 0, 0.05);
          padding: 4px;
          min-width: 150px;
        }

        .dark .macos-dropdown-menu {
          background: rgba(30, 30, 30, 0.98);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        /* macOS Dropdown Item */
        .macos-dropdown-item {
          border-radius: 4px;
          font-size: 13px;
          padding: 6px 8px;
          transition: all 0.1s ease;
        }

        .macos-dropdown-item:hover {
          background: rgba(0, 122, 255, 0.1);
        }

        /* macOS Scroll */
        .macos-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
        }

        .macos-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .macos-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .macos-scroll::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 3px;
        }

        .dark .macos-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
        }

        .macos-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.3);
        }

        .dark .macos-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        /* macOS Button Active State */
        .macos-button-active {
          background: rgba(0, 122, 255, 0.08);
          color: #007AFF;
        }

        .dark .macos-button-active {
          background: rgba(0, 122, 255, 0.15);
          color: #0A84FF;
        }

        /* Smooth Spring Animations */
        @keyframes spring-in {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes spring-out {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(0);
            opacity: 0;
          }
        }

        /* Elastic Bounce */
        @keyframes elastic-bounce {
          0% {
            transform: scale(1);
          }
          30% {
            transform: scale(1.25);
          }
          40% {
            transform: scale(0.75);
          }
          50% {
            transform: scale(1.15);
          }
          65% {
            transform: scale(0.95);
          }
          75% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
          }
        }

        /* Smooth Transitions */
        * {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        /* Prevent layout shift */
        .macos-notification-item * {
          will-change: transform;
        }

        /* Performance optimizations */
        .macos-card {
          will-change: transform, opacity;
          transform: translateZ(0);
          backface-visibility: hidden;
        }

        /* Responsive adjustments */
        @media (max-width: 640px) {
          .macos-card {
            width: calc(100vw - 2rem);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        /* Dark mode optimizations */
        @media (prefers-color-scheme: dark) {
          .macos-badge {
            background: linear-gradient(135deg, #FF453A 0%, #FF6961 100%);
          }
          
          .macos-icon-container {
            background: linear-gradient(135deg, #0A84FF 0%, #0051D5 100%);
          }
          
          .macos-unread-dot {
            background: linear-gradient(135deg, #0A84FF 0%, #0051D5 100%);
          }
        }

        /* High contrast mode */
        @media (prefers-contrast: high) {
          .macos-card {
            border: 2px solid currentColor;
          }
          
          .macos-notification-item {
            border-bottom: 1px solid currentColor;
          }
        }

        /* Focus states for accessibility */
        .macos-close-button:focus-visible,
        .macos-action-button:focus-visible,
        .macos-notification-menu:focus-visible {
          outline: 2px solid #007AFF;
          outline-offset: 2px;
        }

        /* Hover effects enhancement */
        @supports (backdrop-filter: blur(20px)) {
          .macos-card {
            background: rgba(255, 255, 255, 0.85);
          }
          
          .dark .macos-card {
            background: rgba(30, 30, 30, 0.85);
          }
        }

        /* Animation performance */
        @supports (animation-timeline: scroll()) {
          .macos-notification-item {
            animation-timeline: scroll();
            animation-range: entry 0% cover 30%;
          }
        }
      `}</style>
    </div>
  );
}
          