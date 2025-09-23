"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, X, Check, Settings, Trash2, MoreHorizontal, Sparkles, ChevronRight, Archive, Clock, AlertCircle, CheckCircle, Info, User, TrendingUp, Target, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { motion, AnimatePresence } from 'framer-motion';

export default function EnhancedNotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animatingItems, setAnimatingItems] = useState<Set<number>>(new Set());
  const [deletingItems, setDeletingItems] = useState<Set<number>>(new Set());
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [hoveredNotification, setHoveredNotification] = useState<number | null>(null);
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

  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification, deleteAllNotifications, requestPermission, subscribeToPush, fetchNotifications } = useNotifications();

  // Filter notifications based on active filter
  const filteredNotifications = notifications.filter(notification => {
    if (activeFilter === 'unread') return !notification.isRead;
    if (activeFilter === 'read') return notification.isRead;
    return true;
  });

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

  const handleEnableNotifications = async () => {
    const permissionGranted = await requestPermission();
    if (permissionGranted) {
      await subscribeToPush();
    }
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
      case 'success': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertCircle className="h-4 w-4" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      case 'info': return <Info className="h-4 w-4" />;
      case 'user': return <User className="h-4 w-4" />;
      case 'activity': return <TrendingUp className="h-4 w-4" />;
      case 'target': return <Target className="h-4 w-4" />;
      case 'schedule': return <Calendar className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-600 bg-green-500/10';
      case 'warning': return 'text-yellow-600 bg-yellow-500/10';
      case 'error': return 'text-red-600 bg-red-500/10';
      case 'info': return 'text-blue-600 bg-blue-500/10';
      case 'user': return 'text-purple-600 bg-purple-500/10';
      case 'activity': return 'text-indigo-600 bg-indigo-500/10';
      case 'target': return 'text-teal-600 bg-teal-500/10';
      case 'schedule': return 'text-orange-600 bg-orange-500/10';
      default: return 'text-blue-600 bg-blue-500/10';
    }
  };

  return (
    <div className="relative">
      {/* Enhanced Bell Button */}
      <Button
        ref={buttonRef}
        variant="ghost"
        size="sm"
        className={`
          relative group 
          transition-all duration-500 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)]
          hover:scale-110 active:scale-95
          ${isOpen ? 'bg-blue-500/10 text-blue-600' : ''}
          rounded-full p-2
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
            ${unreadCount > 0 && !isOpen ? 'animate-bell-ring' : ''}
          `} />

          {/* Notification Badge with enhanced animation */}
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ 
                type: "spring", 
                stiffness: 500, 
                damping: 30 
              }}
              className={`
                absolute -top-2 -right-2 min-w-[20px] h-5 px-1
                flex items-center justify-center
                text-[10px] font-semibold
                bg-gradient-to-r from-red-500 to-red-600
                text-white rounded-full
                border-2 border-white
                shadow-lg shadow-red-500/30
                z-10
              `}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.div>
          )}

          {/* Ripple effect on click */}
          {isOpen && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="ripple-effect" />
            </div>
          )}
        </div>

        {/* Glow effect */}
        {unreadCount > 0 && !isOpen && (
          <div className="absolute inset-0 rounded-full glow-effect pointer-events-none" />
        )}
      </Button>

      {/* Enhanced Dropdown with Genie Effect */}
      <AnimatePresence>
        {(isOpen || isAnimating) && (
          <motion.div
            ref={dropdownRef}
            initial={{ 
              opacity: 0, 
              scale: 0.1, 
              y: placement.vertical === 'bottom' ? 20 : -20,
              x: placement.horizontal === 'right' ? 20 : -20
            }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0,
              x: 0,
              rotateX: 0
            }}
            exit={{ 
              opacity: 0, 
              scale: 0.1, 
              y: placement.vertical === 'bottom' ? 20 : -20,
              x: placement.horizontal === 'right' ? 20 : -20,
              rotateX: placement.vertical === 'bottom' ? -10 : 10
            }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 30,
              mass: 0.5
            }}
            className={`
              absolute z-[100] 
              ${placement.horizontal === 'right' ? 'right-0' : 'left-0'}
              ${placement.vertical === 'bottom' ? 'top-12' : 'bottom-12'}
            `}
            style={{
              transformOrigin: `${placement.vertical === 'bottom' ? 'top' : 'bottom'} ${placement.horizontal === 'right' ? 'right' : 'left'}`,
            }}
          >
            <Card className="
              w-[400px] max-w-[calc(100vw-2rem)] 
              bg-white/90 dark:bg-gray-900/90
              backdrop-blur-2xl
              border border-gray-200/50 dark:border-gray-700/50
              rounded-2xl shadow-2xl
              overflow-hidden
              transition-all duration-300
            ">
              {/* Header with enhanced styling */}
              <CardHeader className="bg-gradient-to-r from-blue-500/5 to-indigo-500/5 dark:from-gray-800/50 dark:to-gray-800/50 p-4 border-b border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="
                      w-10 h-10 rounded-xl
                      bg-gradient-to-r from-blue-500 to-indigo-500
                      flex items-center justify-center
                      shadow-md
                    ">
                      <Bell className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                        Notifications
                      </CardTitle>
                      {unreadCount > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {unreadCount} unread
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    className="rounded-full p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800"
                    aria-label="Close notifications"
                  >
                    <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  </Button>
                </div>

                {/* Enhanced Action Buttons */}
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEnableNotifications}
                    className="rounded-lg border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 text-xs"
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    Push
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchNotifications()}
                    className="rounded-lg border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 text-xs"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Refresh
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMarkAllRead}
                    disabled={unreadCount === 0}
                    className="rounded-lg border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 text-xs disabled:opacity-50"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Read All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteAll}
                    disabled={notifications.length === 0}
                    className="rounded-lg border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 text-xs text-red-600 disabled:opacity-50"
                  >
                    <Archive className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-1 mt-3 bg-gray-100/50 dark:bg-gray-800/50 rounded-lg p-1">
                  <button
                    onClick={() => setActiveFilter('all')}
                    className={`
                      flex-1 text-xs py-1.5 px-2 rounded-md transition-all
                      ${activeFilter === 'all' 
                        ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' 
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}
                    `}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setActiveFilter('unread')}
                    className={`
                      flex-1 text-xs py-1.5 px-2 rounded-md transition-all
                      ${activeFilter === 'unread' 
                        ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' 
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}
                    `}
                  >
                    Unread
                  </button>
                  <button
                    onClick={() => setActiveFilter('read')}
                    className={`
                      flex-1 text-xs py-1.5 px-2 rounded-md transition-all
                      ${activeFilter === 'read' 
                        ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' 
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}
                    `}
                  >
                    Read
                  </button>
                </div>
              </CardHeader>

              {/* Content with enhanced styling */}
              <CardContent className="p-0">
                <ScrollArea className="h-[450px]">
                  {loading ? (
                    <div className="p-8 text-center">
                      <div className="mx-auto mb-3 w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">Loading notifications...</p>
                    </div>
                  ) : filteredNotifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <Bell className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="font-medium text-gray-900 dark:text-white mb-1">No notifications</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">You're all caught up!</p>
                    </div>
                  ) : (
                    <div className="py-1">
                      <AnimatePresence>
                        {filteredNotifications.map((notification, index) => {
                          const isAnimating = animatingItems.has(notification.id);
                          const isDeleting = deletingItems.has(notification.id);
                          const isHovered = hoveredNotification === notification.id;

                          return (
                            <motion.div
                              key={notification.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: 300, height: 0 }}
                              transition={{ delay: index * 0.02 }} // Reduced from 0.05 to 0.02
                              className={`
                                relative
                                border-b border-gray-100 dark:border-gray-800
                                transition-all duration-200
                                ${!notification.isRead ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}
                                ${isDeleting ? 'opacity-0 scale-95' : ''}
                                ${isHovered ? 'bg-gray-50 dark:bg-gray-800/50' : ''}
                                overflow-hidden
                              `}
                              onClick={() => handleNotificationClick(notification)}
                              onMouseEnter={() => setHoveredNotification(notification.id)}
                              onMouseLeave={() => setHoveredNotification(null)}
                            >
                              <div className="flex items-start gap-3 p-4">
                                {/* Icon */}
                                <div className={`
                                  w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                                  ${getNotificationColor(notification.type)}
                                  transition-all duration-200
                                  ${isHovered ? 'scale-110 shadow-sm' : ''}
                                `}>
                                  {getNotificationIcon(notification.type)}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <h4 className={`
                                        text-sm font-medium
                                        ${notification.isRead 
                                          ? 'text-gray-700 dark:text-gray-300' 
                                          : 'text-gray-900 dark:text-white font-semibold'}
                                        line-clamp-1
                                      `}>
                                        {notification.title}
                                      </h4>
                                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
                                        {notification.message}
                                      </p>
                                      {notification.sender && (
                                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                          From {notification.sender.name}
                                        </p>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <span className="text-xs text-gray-500 dark:text-gray-500 whitespace-nowrap">
                                        {formatTime(notification.createdAt)}
                                      </span>

                                      {/* Action Menu */}
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="rounded-full p-1.5 opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700"
                                            onClick={(e) => e.stopPropagation()}
                                            aria-label="Actions"
                                          >
                                            <MoreHorizontal className="h-3 w-3 text-gray-500" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                          {!notification.isRead && (
                                            <DropdownMenuItem
                                              onClick={(e) => handleMarkAsRead(notification.id, e)}
                                              className="text-sm py-2 px-3 hover:bg-gray-100 dark:hover:bg-gray-700"
                                            >
                                              <Check className="mr-2 h-4 w-4" />
                                              Mark as Read
                                            </DropdownMenuItem>
                                          )}
                                          <DropdownMenuItem
                                            onClick={(e) => handleDeleteNotification(notification.id, e)}
                                            className="text-sm py-2 px-3 hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600"
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
                                  <div className="absolute left-2 top-2 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                )}
                              </div>

                              {/* Hover indicator */}
                              <motion.div
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : 10 }}
                                className="absolute right-4 top-1/2 transform -translate-y-1/2"
                              >
                                <ChevronRight className="h-4 w-4 text-gray-400" />
                              </motion.div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          /* Bell Ring Animation */
          @keyframes bell-ring {
            0%, 100% { transform: rotate(0); }
            10%, 30% { transform: rotate(-15deg); }
            20%, 40% { transform: rotate(15deg); }
          }

          .animate-bell-ring {
            animation: bell-ring 1s ease-in-out infinite; // Reduced from 2s to 1s
          }

          /* Ripple Effect */
          @keyframes ripple {
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

          .ripple-effect {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            border-radius: 50%;
            background: radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%);
            animation: ripple 0.6s ease-out;
          }

          /* Glow Effect */
          @keyframes glow {
            0%, 100% {
              box-shadow: 0 0 5px rgba(59, 130, 246, 0.2);
            }
            50% {
              box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
            }
          }

          .glow-effect {
            animation: glow 2s ease-in-out infinite;
          }

          /* Line Clamp Utility */
          .line-clamp-1 {
            display: -webkit-box;
            -webkit-line-clamp: 1;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .line-clamp-2 {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          /* Scrollbar Styling */
          ::-webkit-scrollbar {
            width: 6px;
          }

          ::-webkit-scrollbar-track {
            background: transparent;
          }

          ::-webkit-scrollbar-thumb {
            background: rgba(0, 0, 0, 0.2);
            border-radius: 3px;
          }

          ::-webkit-scrollbar-thumb:hover {
            background: rgba(0, 0, 0, 0.3);
          }

          .dark ::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
          }

          .dark ::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.3);
          }
        `
      }} />
    </div>
  );
}