"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import EnhancedNotificationBell from "@/components/EnhancedNotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSubContent,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  Building2,
  Briefcase,
  Calendar,
  LogOut,
  User,
  Menu,
  X,
  ChevronDown,
  Settings,
  Home,
  FileText,
  CheckCircle,
  BarChart3,
  FolderOpen,
  DollarSign,
  FileClock,
  Clock,
  Globe,
  Workflow,
} from "lucide-react";
import { Button } from "../ui/button";

const AttendanceSubmenuItems = [
  {
    name: "Mark Attendance",
    href: "/attendance",
    icon: Calendar,
    roles: ["admin", "user"],
    badge: null,
  },
  {
    name: "Attendance Log",
    href: "/attendance-log",
    icon: FileText,
    roles: ["admin", "user"],
    badge: null,
  },
  {
    name: "Attendance Review",
    href: "/attendance-review",
    icon: CheckCircle,
    roles: ["admin"],
    badge: null,
  },
]


// Clean navigation structure
const navigationItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: Home,
    roles: ["admin", "user"],
    badge: null,
  },
  {
    name: "Immediate Sales",
    href: "/immediate-sales",
    icon: DollarSign,
    roles: ["admin", "user"],
    badge: null,
  },
  {
    name: "Pipeline",
    href: "/pipeline",
    icon: Workflow,
    roles: ["admin","user"],
    badge: null,
  },
  {
    name: "Opportunities",
    href: "/opportunities",
    icon: Briefcase,
    roles: ["admin", "user"],
    badge: null,
  },

  {
    name: "Leads",
    href: "/leads",
    icon: Users,
    roles: ["admin", "user"],
    badge: null,
  },
  {
    name: "Attendance",
    href: "/attendance",
    icon: Calendar,
    roles: ["admin", "user"],
    badge: null,
  },
  {
    name: "Companies",
    href: "/companies",
    icon: Building2,
    roles: ["admin", "user"],
    badge: null,
  },

  {
    name: "Reports",
    href: "/reports",
    icon: FileText,
    roles: ["admin"],
    badge: null,
  },
  {
    name: "CRM Analytics",
    href: "/analytics",
    icon: BarChart3,
    roles: ["admin"],
    badge: null,
  },
  // New Airtable Features
  {
    name: "Projects",
    href: "/projects",
    icon: FolderOpen,
    roles: ["admin", "user"],
    badge: null,
  },

  {
    name: "Pending Quotations",
    href: "/pending-quotations",
    icon: FileClock,
    roles: ["admin", "user"],
    badge: null,
  },
  {
    name: "Daily Follow-ups",
    href: "/daily-followups",
    icon: Clock,
    roles: ["admin", "user"],
    badge: null,
  },
  {
    name: "Web Portal Sales",
    href: "/web-portal-sales",
    icon: Globe,
    roles: ["admin"],
    badge: null,
  },
  {
    name: "Members",
    href: "/members",
    icon: Users,
    roles: ["admin", "manager", "user"],
    badge: null,
  },
];

// Memoized navigation component to prevent unnecessary re-renders
const CRMNav = React.memo(function CRMNav() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    name: string;
    email: string;
    role: string;
    avatar?: string | null;
    avatarThumbnail?: string | null;
    avatarMedium?: string | null;
  } | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [activeItemIndex, setActiveItemIndex] = useState<number>(-1);
  const [liquidAnimating, setLiquidAnimating] = useState(false);
  const [liquidPosition, setLiquidPosition] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  }>({ left: 0, top: 0, width: 0, height: 0 });
  const [previousPosition, setPreviousPosition] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  }>({ left: 0, top: 0, width: 0, height: 0 });
  const navItemsRef = useRef<(HTMLAnchorElement | null)[]>([]);
  const liquidRef = useRef<HTMLDivElement>(null);
  const navContainerRef = useRef<HTMLDivElement>(null);
  const moreTriggerRef = useRef<HTMLButtonElement | null>(null);
  const pathname = usePathname();

  // Backdrop framing constants (uniform padding around target)
  const OUTSET_X = 6; // px extra on left/right
  const OUTSET_Y = 4; // px extra on top/bottom
  const SAFE_GAP_X = 8; // px minimal gap to neighbors

  const clamp = (v: number, min: number, max: number) =>
    Math.min(Math.max(v, min), max);

  const computePositionForElement = (
    el: Element,
    container: HTMLElement,
    opts?: {
      leftNeighborRight?: number | null;
      rightNeighborLeft?: number | null;
    }
  ) => {
    const targetRect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const style = getComputedStyle(container);
    const paddingLeft = parseFloat(style.paddingLeft || "0");
    const paddingRight = parseFloat(style.paddingRight || "0");
    const paddingTop = parseFloat(style.paddingTop || "0");
    const paddingBottom = parseFloat(style.paddingBottom || "0");

    // Target bounds relative to container content box
    const tLeft = targetRect.left - containerRect.left - paddingLeft;
    const tRight = targetRect.right - containerRect.left - paddingLeft;
    const tWidth = tRight - tLeft;
    const tCenter = tLeft + tWidth / 2;

    const contentWidth = containerRect.width - paddingLeft - paddingRight;
    const contentHeight = containerRect.height - paddingTop - paddingBottom;

    // Desired width and min width
    const minWidth = Math.max(tWidth, 32);
    const desiredWidth = Math.max(minWidth, tWidth + OUTSET_X * 2);

    // Neighbor-aware bounds within container content
    const leftNeighborRight = opts?.leftNeighborRight ?? null;
    const rightNeighborLeft = opts?.rightNeighborLeft ?? null;
    const leftBound = Math.max(
      0,
      leftNeighborRight !== null ? leftNeighborRight + SAFE_GAP_X : 0
    );
    const rightBound = Math.min(
      contentWidth,
      rightNeighborLeft !== null ? rightNeighborLeft - SAFE_GAP_X : contentWidth
    );

    const maxWidth = Math.max(32, rightBound - leftBound);
    const width = Math.min(desiredWidth, maxWidth);

    // Centered as much as possible around target center
    const halfW = width / 2;
    const centerMin = leftBound + halfW;
    const centerMax = rightBound - halfW;
    const center = clamp(tCenter, centerMin, centerMax);
    const left = Math.round(center - halfW);

    // Vertical framing (no neighbors vertically)
    const desiredHeight = Math.min(
      contentHeight,
      targetRect.height + OUTSET_Y * 2
    );
    const topRaw = targetRect.top - containerRect.top - paddingTop - OUTSET_Y;
    const top = clamp(
      Math.round(topRaw),
      0,
      Math.max(0, contentHeight - desiredHeight)
    );

    return {
      left,
      top,
      width: Math.round(width),
      height: Math.round(desiredHeight),
    };
  };

  // Apple-like loading animation - only run once
  useEffect(() => {
    setIsLoaded(true);
    setIsMounted(true);
  }, []);

  // Memoize user loading to prevent re-runs - only run after mount
  useEffect(() => {
    if (!isMounted) return;

    const fetchUserProfile = async () => {
      try {
        const response = await fetch("/api/profile");
        if (response.ok) {
          const data = await response.json();
          if (data.profile) {
            setCurrentUser({
              name: data.profile.name,
              email: data.profile.email,
              role: data.profile.role,
              avatar: data.profile.avatar,
              avatarThumbnail: data.profile.avatarThumbnail,
              avatarMedium: data.profile.avatarMedium,
            });
          }
        } else {
          // Fallback to localStorage if API fails
          const stored = localStorage.getItem("user");
          if (stored) {
            setCurrentUser(JSON.parse(stored));
          }
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        // Fallback to localStorage if API fails
        const stored = localStorage.getItem("user");
        if (stored) {
          setCurrentUser(JSON.parse(stored));
        }
      }
    };

    fetchUserProfile();
  }, [isMounted]);

  // Memoize filtered items to prevent recalculation on every render
  const filteredItems = useMemo(() => {
    const userRole = currentUser?.role || "user";
    return navigationItems.filter((item) => item.roles.includes(userRole));
  }, [currentUser?.role]);
  const filteredAttendanceItems = useMemo(() => {
    const userRole = currentUser?.role || "user";
    return AttendanceSubmenuItems.filter((item) => item.roles.includes(userRole));
  }, [currentUser?.role]);

  // Track active navigation item for liquid animation
  useEffect(() => {
    if (filteredItems.length > 0) {
      const activeIndex = filteredItems.findIndex(
        (item) => pathname === item.href || pathname.startsWith(item.href + "/")
      );

      // Only proceed if we have a valid active index and refs are available
      if (activeIndex !== -1 && activeIndex !== activeItemIndex) {
        const maxVisible = 5;
        const isInMore = activeIndex >= maxVisible;

        // Container for accurate alignment
        const navContainer = navContainerRef.current;

        // Determine target element: either the visible nav item or the More trigger
        const targetElement = isInMore
          ? moreTriggerRef.current
          : navItemsRef.current[activeIndex];

        if (targetElement && navContainer) {
          const getNeighborBounds = () => {
            const style = getComputedStyle(navContainer);
            const paddingLeft = parseFloat(style.paddingLeft || "0");
            const containerRect = navContainer.getBoundingClientRect();
            const toRel = (x: number) => x - containerRect.left - paddingLeft;

            let leftNeighborRight: number | null = null;
            let rightNeighborLeft: number | null = null;

            if (isInMore) {
              // Anchor to More; left neighbor is last visible nav item
              const leftNeighbor = navItemsRef.current[maxVisible - 1];
              if (leftNeighbor) {
                const r = leftNeighbor.getBoundingClientRect();
                leftNeighborRight = toRel(r.right);
              }
            } else {
              // Visible item; neighbors within visible range
              const leftNeighbor =
                activeIndex > 0 ? navItemsRef.current[activeIndex - 1] : null;
              const rightNeighbor =
                activeIndex < maxVisible - 1
                  ? navItemsRef.current[activeIndex + 1]
                  : moreTriggerRef.current;
              if (leftNeighbor) {
                const r = leftNeighbor.getBoundingClientRect();
                leftNeighborRight = toRel(r.right);
              }
              if (rightNeighbor) {
                const r = rightNeighbor.getBoundingClientRect();
                rightNeighborLeft = toRel(r.left);
              }
            }

            return { leftNeighborRight, rightNeighborLeft };
          };

          const neighborBounds = getNeighborBounds();
          const newPosition = computePositionForElement(
            targetElement,
            navContainer,
            neighborBounds
          );

          // Store previous position for smooth transition
          if (activeItemIndex !== -1) {
            const prevElement =
              activeItemIndex >= maxVisible
                ? moreTriggerRef.current
                : navItemsRef.current[activeItemIndex];
            if (prevElement) {
              const prevPos = computePositionForElement(
                prevElement,
                navContainer
              );
              setPreviousPosition(prevPos);
            }
          } else {
            setPreviousPosition({ ...newPosition });
          }

          // Start liquid animation
          setLiquidAnimating(true);

          // Use requestAnimationFrame for smoother animation timing
          requestAnimationFrame(() => {
            setLiquidPosition(newPosition);
            setActiveItemIndex(activeIndex);

            // Reset animation state after transition
            setTimeout(() => {
              setLiquidAnimating(false);
              setPreviousPosition({ ...newPosition });
            }, 800);
          });
        } else {
          // Fallback: if in More and button exists, anchor to More; otherwise hide
          const moreEl = moreTriggerRef.current;
          const navEl = navContainerRef.current;
          if (isInMore && moreEl && navEl) {
            const fallbackPosition = computePositionForElement(moreEl, navEl);
            setLiquidAnimating(true);
            requestAnimationFrame(() => {
              setLiquidPosition(fallbackPosition);
              setActiveItemIndex(activeIndex);
              setTimeout(() => {
                setLiquidAnimating(false);
                setPreviousPosition({ ...fallbackPosition });
              }, 800);
            });
          } else {
            // No reliable target, hide indicator
            setActiveItemIndex(activeIndex);
          }
        }
      } else if (activeIndex === -1) {
        setActiveItemIndex(-1);
      }
    }
  }, [pathname, filteredItems, activeItemIndex]);

  // Handle window resize to recalculate liquid position
  useEffect(() => {
    const handleResize = () => {
      if (activeItemIndex === -1) return;
      const maxVisible = 5;
      const targetElement =
        activeItemIndex >= maxVisible
          ? moreTriggerRef.current
          : navItemsRef.current[activeItemIndex];
      const navContainer = navContainerRef.current;
      if (!targetElement || !navContainer) return;
      // Compute neighbor-aware bounds on resize as well
      const style = getComputedStyle(navContainer);
      const paddingLeft = parseFloat(style.paddingLeft || "0");
      const containerRect = navContainer.getBoundingClientRect();
      const toRel = (x: number) => x - containerRect.left - paddingLeft;
      let leftNeighborRight: number | null = null;
      let rightNeighborLeft: number | null = null;
      if (activeItemIndex >= maxVisible) {
        const leftNeighbor = navItemsRef.current[maxVisible - 1];
        if (leftNeighbor)
          leftNeighborRight = toRel(leftNeighbor.getBoundingClientRect().right);
      } else {
        const leftNeighbor =
          activeItemIndex > 0 ? navItemsRef.current[activeItemIndex - 1] : null;
        const rightNeighbor =
          activeItemIndex < maxVisible - 1
            ? navItemsRef.current[activeItemIndex + 1]
            : moreTriggerRef.current;
        if (leftNeighbor)
          leftNeighborRight = toRel(leftNeighbor.getBoundingClientRect().right);
        if (rightNeighbor)
          rightNeighborLeft = toRel(rightNeighbor.getBoundingClientRect().left);
      }
      const newPosition = computePositionForElement(
        targetElement,
        navContainer,
        { leftNeighborRight, rightNeighborLeft }
      );
      setLiquidPosition(newPosition);
      setPreviousPosition(newPosition);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activeItemIndex]);

  const handleLogout = async () => {
    localStorage.removeItem("user");
    try {
      await fetch("/api/signin");
    } catch (err) {
      console.error("Error during logout:", err);
    }
    window.location.href = "/login";
  };

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 border-b border-gray-200/20 dark:border-gray-700/20">
      <div className="container mx-auto px-6 sm:px-8 lg:px-12">
        <div className="flex h-20 items-center justify-between">
          {/* Logo Section with Apple-inspired spacing */}
          <div
            className={`flex items-center transition-all duration-700 ease-out ${
              isLoaded
                ? "translate-x-0 opacity-100"
                : "-translate-x-4 opacity-0"
            }`}
          >
            <Link
              href="/dashboard"
              className="group flex items-center relative"
            >
              {/* Background glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div>

              {/* Rashmi Group Logo with smooth animation - Much bigger size for desktop */}
              <div className="relative z-10 mr-4 transition-all duration-300 ease-out group-hover:scale-105">
                <div className="relative overflow-hidden rounded-lg">
                  <img
                    src="/Rashmi Logo.png"
                    alt="Rashmi Group"
                    className="w-52 h-14 object-contain filter brightness-110 contrast-105 transition-all duration-500 ease-out group-hover:brightness-125"
                  />
                  {/* Subtle shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
                </div>
              </div>

              {/* Elegant separator */}
              <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300 dark:via-gray-600 to-transparent mx-1 opacity-60"></div>

              {/* CRM Text with elegant calligraphy */}
              <div className="hidden lg:flex items-center">
                <h1
                  className="text-xl font-semibold tracking-wide"
                  style={{ fontFamily: "var(--font-crimson-text)" }}
                >
                  <span className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 bg-clip-text text-transparent transition-all duration-300 group-hover:from-blue-700 group-hover:via-blue-800 group-hover:to-indigo-700 drop-shadow-sm">
                    CRM
                  </span>
                </h1>
                {/* Subtle accent dot */}
                <div className="ml-2 w-1.5 h-1.5 bg-blue-500 rounded-full opacity-60 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation with Staggered Animation */}
          <div
            className={`hidden md:flex items-center transition-all duration-700 ease-out delay-200 ml-8 ${
              isLoaded ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            }`}
          >
            {/* Navigation Links with Liquid Flowing Animation */}
            <div
              ref={navContainerRef}
              className="relative flex items-center bg-white/40 dark:bg-gray-800/40 backdrop-blur-md rounded-2xl border border-white/20 dark:border-gray-700/20 px-2 py-1"
            >
              {/* Liquid Trail Effect - Subtle background that fades */}
              {liquidAnimating &&
                activeItemIndex !== -1 &&
                previousPosition.width > 0 && (
                  <div
                    className="absolute rounded-xl liquid-trail opacity-30 will-change-transform"
                    style={{
                      left: 0,
                      top: 0,
                      width: `${previousPosition.width}px`,
                      height: `${previousPosition.height}px`,
                      transform: `translate3d(${previousPosition.left}px, ${
                        previousPosition.top || 0
                      }px, 0)`,
                      zIndex: 0,
                      background:
                        "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(99, 102, 241, 0.1) 50%, rgba(139, 92, 246, 0.1) 100%)",
                      border: "1px solid rgba(59, 130, 246, 0.1)",
                      transition:
                        "transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.6s ease-out",
                    }}
                  />
                )}

              {/* Advanced Liquid Flowing Background */}
              {activeItemIndex !== -1 && (
                <div
                  ref={liquidRef}
                  className={`
                    absolute rounded-xl will-change-transform
                    ${
                      liquidAnimating ? "liquid-flow-advanced" : "liquid-stable"
                    }
                    overflow-hidden border border-blue-400/30
                  `}
                  style={{
                    left: 0,
                    top: 0,
                    width: `${liquidPosition.width || 64}px`,
                    height: `${liquidPosition.height || 40}px`,
                    transform: `translate3d(${liquidPosition.left || 0}px, ${
                      liquidPosition.top || 0
                    }px, 0)`,
                    zIndex: 1,
                    background:
                      "linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(99, 102, 241, 0.15) 50%, rgba(139, 92, 246, 0.15) 100%)",
                    boxShadow:
                      "0 2px 10px rgba(59, 130, 246, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
                    transition: liquidAnimating
                      ? "transform 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55), filter 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94), border-radius 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
                      : "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                  }}
                >
                  {/* Main Liquid Gradient Background */}
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/20 via-blue-600/20 to-indigo-500/20 shadow-lg shadow-blue-500/15"></div>

                  {/* Liquid Surface Effect */}
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400/30 via-blue-500/30 to-indigo-400/30 opacity-90"></div>

                  {/* Liquid Shine Animation */}
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/40 to-transparent animate-liquid-shine opacity-60"></div>

                  {/* Liquid Ripple Effect */}
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-300/20 via-transparent to-blue-300/20 animate-liquid-ripple"></div>

                  {/* Advanced Liquid Flow Particles */}
                  <div className="absolute inset-0 rounded-xl overflow-hidden">
                    {/* Main liquid blob particles */}
                    <div className="absolute top-0 left-1/4 w-1 h-1 bg-white/60 rounded-full animate-liquid-particle-1 shadow-sm"></div>
                    <div className="absolute top-1/3 right-1/3 w-0.5 h-0.5 bg-blue-200/70 rounded-full animate-liquid-particle-2"></div>
                    <div className="absolute bottom-1/4 left-1/2 w-0.5 h-0.5 bg-indigo-200/70 rounded-full animate-liquid-particle-3"></div>

                    {/* Additional liquid droplets for more realistic effect */}
                    <div className="absolute top-1/2 left-1/6 w-0.5 h-0.5 bg-blue-300/50 rounded-full animate-liquid-droplet-1"></div>
                    <div className="absolute top-1/4 right-1/4 w-0.5 h-0.5 bg-indigo-300/50 rounded-full animate-liquid-droplet-2"></div>
                    <div className="absolute bottom-1/3 right-1/6 w-0.5 h-0.5 bg-purple-300/50 rounded-full animate-liquid-droplet-3"></div>
                  </div>

                  {/* Liquid Wave Overlay */}
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-blue-200/20 to-transparent animate-liquid-wave opacity-50"></div>

                  {/* Liquid Glow Effect */}
                  <div className="absolute inset-0 rounded-xl shadow-inner shadow-blue-400/30"></div>
                </div>
              )}

              {filteredItems.slice(0, 5).map((item, index) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={`nav-${item.name}-${index}`}
                    ref={(el) => {
                      if (el) {
                        navItemsRef.current[index] = el;
                      }
                    }}
                    href={item.href}
                    className={`
                      relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ease-out whitespace-nowrap
                       group transform hover:scale-105 active:scale-95 z-10
                       ${
                         isMounted && isLoaded
                           ? "translate-y-0 opacity-100"
                           : "translate-y-1 opacity-0"
                       }
                    ${index === 0 ? "ml-0" : "ml-1.5"}`}
                    style={{ transitionDelay: `${200 + index * 50}ms` }}
                  >
                    {/* Icon with enhanced animation */}
                    <Icon
                      className={`h-4 w-4 transition-all duration-300 relative z-10 ${
                        isActive
                          ? "text-blue-600 dark:text-blue-400 scale-110 drop-shadow-sm"
                          : "text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 group-hover:scale-105"
                      }`}
                    />

                    {/* Text with enhanced transitions */}
                    <span
                      className={`relative z-10 transition-all duration-300 ${
                        isActive
                          ? "text-blue-700 dark:text-blue-300 font-semibold drop-shadow-sm"
                          : "text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-gray-100"
                      }`}
                    >
                      {item.name}
                    </span>

                    {/* Badge with enhanced styling */}
                    {item.badge && (
                      <Badge
                        className={`ml-1 h-5 px-2 text-xs relative z-10 transition-all duration-300 ${
                          isActive
                            ? "bg-blue-500 text-white shadow-md scale-105"
                            : "bg-gray-500/80 text-white group-hover:bg-blue-500 group-hover:shadow-md"
                        }`}
                      >
                        {item.badge}
                      </Badge>
                    )}

                    {/* Active indicator with enhanced design */}
                    {isActive && (
                      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full shadow-sm animate-pulse"></div>
                    )}

                    {/* Enhanced hover glow effect */}
                    <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 bg-gradient-to-r from-blue-400/10 to-indigo-400/10 blur-sm transition-opacity duration-300"></div>
                  </Link>
                );
              })}

              {/* More Menu with Apple-like design */}
              {filteredItems.length > 5 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      ref={moreTriggerRef}
                      variant="ghost"
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ease-out group relative ml-3 whitespace-nowrap
            ${
              filteredItems
                .slice(5)
                .some(
                  (i) =>
                    pathname === i.href || pathname.startsWith(i.href + "/")
                )
                ? "text-blue-700 dark:text-blue-300"
                : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
            }
          `}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-transparent group-hover:from-white/20 group-hover:to-gray-100/20 dark:group-hover:from-gray-700/20 dark:group-hover:to-gray-600/20 rounded-xl transition-all duration-300"></div>
                      <span className="relative z-10">More</span>
                      <ChevronDown className="h-4 w-4 relative z-10 transition-transform duration-300 group-hover:rotate-180" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl shadow-black/5 rounded-2xl overflow-hidden"
                  >
                    <DropdownMenuGroup>
                      {filteredItems.slice(5).map((item, index) => {
                        const Icon = item.icon;
                        const inPath =
                          pathname === item.href ||
                          pathname.startsWith(item.href + "/");

                        // Check if this item is "Attendance" to show submenu
                        if (item.name === "Attendance") {
                          return (
                            <DropdownMenuSub
                              key={`dropdown-${item.name}-${index}`}
                            >
                              <DropdownMenuSubTrigger
                                className={`transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 ${
                                  inPath
                                    ? "bg-blue-50/60 dark:bg-blue-900/20"
                                    : ""
                                }`}
                                style={{ animationDelay: `${index * 50}ms` }}
                              >
                                <div className="flex items-center gap-3 w-full px-2 py-2">
                                  <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                  <span
                                    className={`font-medium ${
                                      inPath
                                        ? "text-blue-700 dark:text-blue-300 font-semibold"
                                        : ""
                                    }`}
                                  >
                                    {item.name}
                                  </span>
                                  {item.badge && (
                                    <Badge className="ml-auto h-5 px-2 text-xs bg-blue-500 text-white">
                                      {item.badge}
                                    </Badge>
                                  )}
                                </div>
                              </DropdownMenuSubTrigger>
                              <DropdownMenuPortal>
                                <DropdownMenuSubContent className="w-48 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl shadow-black/5 rounded-2xl overflow-hidden">
                                  {
                                    filteredAttendanceItems.length === 0 && (
                                      <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                        No attendance options available.
                                      </div>
                                    )}
                                  {filteredAttendanceItems.map((item, index) => (
                                    <DropdownMenuItem asChild key={index}>
                                      <Link
                                        href={item.href}
                                        className="flex items-center gap-3 w-full px-4 py-3 transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20"
                                      >
                                        <item.icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                        <span className="font-medium">
                                          {item.name}
                                        </span>
                                        {item.badge && (
                                          <Badge className="ml-auto h-5 px-2 text-xs bg-blue-500 text-white">
                                            {item.badge}
                                          </Badge>
                                        )}
                                      </Link>
                                    </DropdownMenuItem>
                                  ))}
                                  {/* <DropdownMenuItem asChild>
                                    <Link
                                      href="/attendance"
                                      className="flex items-center gap-3 w-full px-4 py-3 transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20"
                                    >
                                      <span className="font-medium">
                                        Attendance
                                      </span>
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link
                                      href="/attendance/review"
                                      className="flex items-center gap-3 w-full px-4 py-3 transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20"
                                    >
                                      <span className="font-medium">
                                        Attendance Review
                                      </span>
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link
                                      href="/attendance/log"
                                      className="flex items-center gap-3 w-full px-4 py-3 transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20"
                                    >
                                      <span className="font-medium">
                                        Attendance Log
                                      </span>
                                    </Link>
                                  </DropdownMenuItem> */}
                                </DropdownMenuSubContent>
                              </DropdownMenuPortal>
                            </DropdownMenuSub>
                          );
                        }

                        return (
                          <DropdownMenuItem
                            key={`dropdown-${item.name}-${index}`}
                            asChild
                            className={`transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 ${
                              inPath ? "bg-blue-50/60 dark:bg-blue-900/20" : ""
                            }`}
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            <Link
                              href={item.href}
                              className={`flex items-center gap-3 w-full px-4 py-3 ${
                                inPath
                                  ? "text-blue-700 dark:text-blue-300 font-semibold"
                                  : ""
                              }`}
                            >
                              <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                              <span className="font-medium">{item.name}</span>
                              {item.badge && (
                                <Badge className="ml-auto h-5 px-2 text-xs bg-blue-500 text-white">
                                  {item.badge}
                                </Badge>
                              )}
                            </Link>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Right Actions with Apple-like design */}
          <div
            className={`flex items-center gap-3 transition-all duration-700 ease-out delay-400 ${
              isLoaded ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
            }`}
          >
            {/* Enhanced Notifications with Apple-style */}
            <div className="relative">
              <EnhancedNotificationBell />
            </div>

            {/* User Menu with Apple-inspired design */}
            {currentUser && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 px-3 py-2 rounded-2xl hover:bg-white/20 dark:hover:bg-gray-700/20 transition-all duration-300 ease-out group relative">
                    {/* Background glow */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-lg"></div>

                    {/* User Avatar with smooth animations */}
                    <div className="relative w-9 h-9 rounded-xl overflow-hidden shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/30 group-hover:scale-105 transition-all duration-300">
                      {currentUser?.avatar ? (
                        <Image
                          src={
                            currentUser.avatarThumbnail || currentUser.avatar
                          }
                          alt={currentUser.name}
                          width={36}
                          height={36}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback to default avatar on error
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `
                                <div class="w-full h-full bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 flex items-center justify-center">
                                  <svg class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                  </svg>
                                </div>
                              `;
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 flex items-center justify-center">
                          <User className="h-4 w-4 text-white" />
                        </div>
                      )}
                      {/* Online indicator */}
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white dark:border-gray-900"></div>
                    </div>

                    {/* User Info */}
                    <div className="hidden sm:flex flex-col items-start">
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors duration-300">
                        {currentUser.name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 capitalize font-medium group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors duration-300">
                        {currentUser.role}
                      </span>
                    </div>

                    {/* Chevron with rotation animation */}
                    <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500 hidden sm:block transition-transform duration-300 group-hover:rotate-180 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-64 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl shadow-black/10 rounded-2xl overflow-hidden"
                >
                  <DropdownMenuLabel className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-lg shadow-blue-500/20">
                        {currentUser?.avatar ? (
                          <Image
                            src={currentUser.avatarMedium || currentUser.avatar}
                            alt={currentUser.name}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback to default avatar on error
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = `
                                  <div class="w-full h-full bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 flex items-center justify-center">
                                    <svg class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                    </svg>
                                  </div>
                                `;
                              }
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 flex items-center justify-center">
                            <User className="h-5 w-5 text-white" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {currentUser.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {currentUser.email}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium capitalize mt-1">
                          {currentUser.role}
                        </p>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-200/50 dark:bg-gray-700/50" />
                  <DropdownMenuGroup className="p-2">
                    <DropdownMenuItem
                      onClick={() => (window.location.href = "/profile")}
                      className="rounded-xl transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20"
                    >
                      <User className="mr-3 h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <span className="font-medium">Profile</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator className="bg-gray-200/50 dark:bg-gray-700/50" />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="rounded-xl transition-all duration-200 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 dark:hover:from-red-900/20 dark:hover:to-pink-900/20 text-red-600 dark:text-red-400 mx-2 mb-2"
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    <span className="font-medium">Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Mobile Menu Toggle with Apple-style */}
            <button
              className="md:hidden w-10 h-10 rounded-xl bg-white/20 dark:bg-gray-700/20 backdrop-blur-md border border-white/30 dark:border-gray-600/30 flex items-center justify-center transition-all duration-300 ease-out hover:bg-white/30 dark:hover:bg-gray-600/30 hover:scale-105 active:scale-95 relative"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
              {isMobileMenuOpen ? (
                <X className="h-5 w-5 text-gray-700 dark:text-gray-200 relative z-10 transition-transform duration-300 rotate-0 hover:rotate-90" />
              ) : (
                <Menu className="h-5 w-5 text-gray-700 dark:text-gray-200 relative z-10 transition-transform duration-300 hover:scale-110" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu with Apple-inspired design */}
        {isMobileMenuOpen && (
          <div
            className={`md:hidden border-t border-gray-200/20 dark:border-gray-700/20 backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 transition-all duration-500 ease-out ${
              isMobileMenuOpen
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-2"
            }`}
          >
            {/* Mobile Logo */}
            <div className="px-6 py-6">
              <Link href="/dashboard" className="flex items-center group">
                {/* Rashmi Logo with mobile styling - Bigger size */}
                <div className="relative mr-2 transition-all duration-300 group-hover:scale-105">
                  <div className="relative overflow-hidden rounded-lg">
                    <img
                      src="/Rashmi Logo.png"
                      alt="Rashmi Group"
                      className="w-36 h-9 object-contain filter brightness-110 contrast-105 transition-all duration-500 ease-out group-hover:brightness-125"
                    />
                  </div>
                </div>

                {/* Elegant separator */}
                <div className="h-5 w-px bg-gradient-to-b from-transparent via-gray-300 dark:via-gray-600 to-transparent mx-1 opacity-60"></div>

                {/* CRM Text with mobile styling and elegant calligraphy */}
                <h1
                  className="text-lg font-semibold tracking-wide"
                  style={{ fontFamily: "var(--font-crimson-text)" }}
                >
                  <span className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 bg-clip-text text-transparent transition-all duration-300 group-hover:from-blue-700 group-hover:via-blue-800 group-hover:to-indigo-700 drop-shadow-sm">
                    CRM
                  </span>
                </h1>
              </Link>
            </div>

            {/* Mobile Navigation Links with Apple-inspired design */}
            <div className="px-6 pb-6">
              <div className="space-y-2">
                {filteredItems.map((item, index) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={`mobile-${item.name}-${index}`}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`
                        flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-medium transition-all duration-300 ease-out
                        group transform hover:scale-[1.02] active:scale-[0.98]
                        ${
                          isLoaded
                            ? "translate-x-0 opacity-100"
                            : "translate-x-2 opacity-0"
                        }
                      `}
                      style={{ transitionDelay: `${300 + index * 100}ms` }}
                    >
                      {/* Background with smooth gradient */}
                      <div
                        className={`
                        absolute inset-0 rounded-2xl transition-all duration-300
                        ${
                          isActive
                            ? "bg-gradient-to-r from-blue-500/15 via-blue-600/15 to-indigo-500/15 shadow-lg shadow-blue-500/10"
                            : "bg-gradient-to-r from-transparent to-transparent group-hover:from-white/15 group-hover:to-gray-100/15 dark:group-hover:from-gray-700/15 dark:group-hover:to-gray-600/15"
                        }
                      `}
                      ></div>

                      {/* Icon with subtle animation */}
                      <Icon
                        className={`h-5 w-5 transition-all duration-300 relative z-10 ${
                          isActive
                            ? "text-blue-600 dark:text-blue-400 scale-110"
                            : "text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 group-hover:scale-105"
                        }`}
                      />

                      {/* Text with smooth transitions */}
                      <span
                        className={`flex-1 relative z-10 transition-all duration-300 ${
                          isActive
                            ? "text-blue-700 dark:text-blue-300 font-semibold"
                            : "text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-gray-100"
                        }`}
                      >
                        {item.name}
                      </span>

                      {/* Badge with enhanced styling */}
                      {item.badge && (
                        <Badge
                          className={`relative z-10 transition-all duration-300 ${
                            isActive
                              ? "bg-blue-500 text-white shadow-md"
                              : "bg-gray-500/80 text-white group-hover:bg-blue-500 group-hover:shadow-md"
                          }`}
                        >
                          {item.badge}
                        </Badge>
                      )}

                      {/* Active indicator */}
                      {isActive && (
                        <div className="absolute left-2 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full"></div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
});

// Add display name for better debugging
CRMNav.displayName = "CRMNav";

// Enhanced Liquid Flowing Animation Styles
const LiquidFlowingStyles = () => (
  <style jsx>{`
    /* Liquid Flow Animation - Creates flowing effect between navigation items */
    @keyframes liquid-flow {
      0% {
        transform: scale(1) rotate(0deg);
        filter: blur(0px) brightness(1);
      }
      25% {
        transform: scale(1.05) rotate(1deg);
        filter: blur(0.5px) brightness(1.1);
      }
      50% {
        transform: scale(1.1) rotate(-1deg);
        filter: blur(1px) brightness(1.2);
      }
      75% {
        transform: scale(1.05) rotate(0.5deg);
        filter: blur(0.5px) brightness(1.1);
      }
      100% {
        transform: scale(1) rotate(0deg);
        filter: blur(0px) brightness(1);
      }
    }

    /* Liquid Shine Effect - Creates flowing highlight across the background */
    @keyframes liquid-shine {
      0% {
        transform: translateX(-100%) skew(-15deg);
      }
      100% {
        transform: translateX(200%) skew(-15deg);
      }
    }

    /* Liquid Wave Effect - Creates subtle wave animation */
    @keyframes liquid-wave {
      0%,
      100% {
        transform: scaleY(1) translateX(0px);
        opacity: 0.3;
      }
      50% {
        transform: scaleY(1.1) translateX(2px);
        opacity: 0.6;
      }
    }

    /* Liquid Morph Animation - For smooth shape transitions */
    @keyframes liquid-morph {
      0% {
        border-radius: 0.75rem;
        transform: scaleX(1) scaleY(1);
      }
      50% {
        border-radius: 1rem;
        transform: scaleX(1.02) scaleY(1.05);
      }
      100% {
        border-radius: 0.75rem;
        transform: scaleX(1) scaleY(1);
      }
    }

    /* Enhanced Genie Effect for Notification Bell */
    @keyframes genie-appear {
      0% {
        opacity: 0;
        transform: scale(0.1) translateY(-10px) translateX(5px) rotateX(-90deg)
          skew(-10deg, -5deg);
        filter: blur(2px);
      }
      25% {
        opacity: 0.3;
        transform: scale(0.3) translateY(-5px) translateX(2px) rotateX(-45deg)
          skew(-5deg, -2deg);
        filter: blur(1px);
      }
      50% {
        opacity: 0.7;
        transform: scale(0.7) translateY(-2px) translateX(1px) rotateX(-15deg)
          skew(-2deg, -1deg);
        filter: blur(0.5px);
      }
      75% {
        opacity: 0.9;
        transform: scale(0.9) translateY(-1px) translateX(0px) rotateX(-5deg)
          skew(-1deg, 0deg);
        filter: blur(0px);
      }
      100% {
        opacity: 1;
        transform: scale(1) translateY(0px) translateX(0px) rotateX(0deg)
          skew(0deg, 0deg);
        filter: blur(0px);
      }
    }

    @keyframes dissolve {
      0% {
        opacity: 1;
        transform: scale(1);
      }
      100% {
        opacity: 0;
        transform: scale(0.8) rotate(5deg);
      }
    }

    /* Ultra-Advanced Liquid Flow Animation - True morphing effect */
    @keyframes liquid-flow-advanced {
      0% {
        transform: scale(0.95) rotateX(5deg) rotateY(-2deg);
        filter: blur(0.5px) brightness(1.1) saturate(1.2) contrast(1.1);
        box-shadow: 0 4px 20px rgba(59, 130, 246, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.2);
        border-radius: 0.75rem 0.5rem 0.75rem 0.5rem;
      }
      15% {
        transform: scale(1.02) rotateX(3deg) rotateY(1deg);
        filter: blur(0.8px) brightness(1.2) saturate(1.3) contrast(1.15);
        box-shadow: 0 6px 25px rgba(59, 130, 246, 0.3),
          inset 0 2px 0 rgba(255, 255, 255, 0.25);
        border-radius: 1rem 0.5rem 0.5rem 1rem;
      }
      30% {
        transform: scale(1.08) rotateX(-1deg) rotateY(2deg);
        filter: blur(1px) brightness(1.3) saturate(1.4) contrast(1.2);
        box-shadow: 0 8px 30px rgba(59, 130, 246, 0.4),
          inset 0 2px 0 rgba(255, 255, 255, 0.3);
        border-radius: 0.5rem 1rem 1rem 0.5rem;
      }
      45% {
        transform: scale(1.12) rotateX(2deg) rotateY(-1deg);
        filter: blur(1.2px) brightness(1.4) saturate(1.5) contrast(1.25);
        box-shadow: 0 10px 35px rgba(59, 130, 246, 0.5),
          inset 0 3px 0 rgba(255, 255, 255, 0.35);
        border-radius: 1rem 0.75rem 0.75rem 1rem;
      }
      60% {
        transform: scale(1.15) rotateX(1deg) rotateY(1deg);
        filter: blur(1.5px) brightness(1.5) saturate(1.6) contrast(1.3);
        box-shadow: 0 12px 40px rgba(59, 130, 246, 0.6),
          inset 0 3px 0 rgba(255, 255, 255, 0.4);
        border-radius: 0.75rem 1rem 0.75rem 1rem;
      }
      75% {
        transform: scale(1.05) rotateX(-1deg) rotateY(1deg);
        filter: blur(0.8px) brightness(1.2) saturate(1.3) contrast(1.15);
        box-shadow: 0 6px 25px rgba(59, 130, 246, 0.3),
          inset 0 2px 0 rgba(255, 255, 255, 0.25);
        border-radius: 1rem 0.5rem 1rem 0.5rem;
      }
      90% {
        transform: scale(1.02) rotateX(0deg) rotateY(0deg);
        filter: blur(0.3px) brightness(1.1) saturate(1.1) contrast(1.05);
        box-shadow: 0 4px 20px rgba(59, 130, 246, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.15);
        border-radius: 0.75rem 0.75rem 0.75rem 0.75rem;
      }
      100% {
        transform: scale(1) rotateX(0deg) rotateY(0deg);
        filter: blur(0px) brightness(1) saturate(1) contrast(1);
        box-shadow: 0 2px 15px rgba(59, 130, 246, 0.15),
          inset 0 1px 0 rgba(255, 255, 255, 0.1);
        border-radius: 0.75rem;
      }
    }

    /* Stable state for liquid background */
    .liquid-stable {
      transform: scale(1) rotateX(0deg) rotateY(0deg);
      filter: blur(0px) brightness(1) saturate(1);
      box-shadow: 0 2px 15px rgba(59, 130, 246, 0.15),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }

    /* Enhanced Liquid Shine with multiple phases */
    @keyframes liquid-shine {
      0% {
        transform: translateX(-120%) skewX(-15deg) scaleY(0.8);
        opacity: 0;
      }
      10% {
        opacity: 0.7;
        transform: translateX(-80%) skewX(-12deg) scaleY(1);
      }
      50% {
        opacity: 1;
        transform: translateX(0%) skewX(0deg) scaleY(1.2);
      }
      90% {
        opacity: 0.8;
        transform: translateX(80%) skewX(12deg) scaleY(1);
      }
      100% {
        transform: translateX(120%) skewX(15deg) scaleY(0.8);
        opacity: 0;
      }
    }

    /* Liquid Ripple Effect */
    @keyframes liquid-ripple {
      0%,
      100% {
        transform: scale(1) translateX(0px);
        opacity: 0.3;
      }
      25% {
        transform: scale(1.1) translateX(3px);
        opacity: 0.6;
      }
      50% {
        transform: scale(1.2) translateX(-2px);
        opacity: 0.8;
      }
      75% {
        transform: scale(1.05) translateX(1px);
        opacity: 0.5;
      }
    }

    /* Liquid Wave Effect */
    @keyframes liquid-wave {
      0%,
      100% {
        transform: translateX(-10px) scaleY(1);
        opacity: 0.4;
      }
      25% {
        transform: translateX(-5px) scaleY(1.1);
        opacity: 0.7;
      }
      50% {
        transform: translateX(0px) scaleY(1.2);
        opacity: 1;
      }
      75% {
        transform: translateX(5px) scaleY(1.1);
        opacity: 0.7;
      }
    }

    /* Liquid Flow Particles */
    @keyframes liquid-particle-1 {
      0%,
      100% {
        transform: translateY(0px) scale(1);
        opacity: 0;
      }
      25% {
        transform: translateY(-8px) scale(1.2);
        opacity: 1;
      }
      50% {
        transform: translateY(-12px) scale(0.8);
        opacity: 0.8;
      }
      75% {
        transform: translateY(-8px) scale(1.1);
        opacity: 0.6;
      }
    }

    @keyframes liquid-particle-2 {
      0%,
      100% {
        transform: translateX(0px) translateY(0px) scale(1);
        opacity: 0;
      }
      30% {
        transform: translateX(4px) translateY(-6px) scale(1.3);
        opacity: 1;
      }
      60% {
        transform: translateX(-2px) translateY(-10px) scale(0.7);
        opacity: 0.7;
      }
      90% {
        transform: translateX(1px) translateY(-6px) scale(1.1);
        opacity: 0.4;
      }
    }

    @keyframes liquid-particle-3 {
      0%,
      100% {
        transform: translateX(0px) translateY(0px) rotate(0deg) scale(1);
        opacity: 0;
      }
      35% {
        transform: translateX(-3px) translateY(-4px) rotate(90deg) scale(1.4);
        opacity: 1;
      }
      65% {
        transform: translateX(2px) translateY(-8px) rotate(180deg) scale(0.6);
        opacity: 0.6;
      }
      95% {
        transform: translateX(-1px) translateY(-4px) rotate(270deg) scale(1.2);
        opacity: 0.3;
      }
    }

    /* Liquid Morph Animation - Enhanced */
    @keyframes liquid-morph {
      0% {
        border-radius: 0.75rem;
        transform: scaleX(0.9) scaleY(0.9) rotate(0deg);
      }
      25% {
        border-radius: 1rem;
        transform: scaleX(1.05) scaleY(1.1) rotate(2deg);
      }
      50% {
        border-radius: 0.5rem;
        transform: scaleX(1.1) scaleY(1.2) rotate(-1deg);
      }
      75% {
        border-radius: 0.8rem;
        transform: scaleX(1.02) scaleY(1.05) rotate(1deg);
      }
      100% {
        border-radius: 0.75rem;
        transform: scaleX(1) scaleY(1) rotate(0deg);
      }
    }

    /* Legacy classes for compatibility */
    .liquid-flow {
      animation: liquid-flow 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
    }

    .animate-liquid-shine {
      animation: liquid-shine 3s ease-in-out infinite;
    }

    .animate-liquid-wave {
      animation: liquid-wave 4s ease-in-out infinite;
    }

    .animate-liquid-ripple {
      animation: liquid-ripple 2.5s ease-in-out infinite;
    }

    .animate-liquid-particle-1 {
      animation: liquid-particle-1 2s ease-in-out infinite;
    }

    .animate-liquid-particle-2 {
      animation: liquid-particle-2 2.5s ease-in-out infinite;
    }

    .animate-liquid-particle-3 {
      animation: liquid-particle-3 3s ease-in-out infinite;
    }

    /* Liquid Droplet Animations for more realistic effect */
    @keyframes liquid-droplet-1 {
      0%,
      100% {
        transform: translateX(0px) translateY(0px) scale(1);
        opacity: 0.3;
      }
      25% {
        transform: translateX(2px) translateY(-3px) scale(1.2);
        opacity: 0.8;
      }
      50% {
        transform: translateX(-1px) translateY(-6px) scale(0.8);
        opacity: 0.6;
      }
      75% {
        transform: translateX(1px) translateY(-3px) scale(1.1);
        opacity: 0.4;
      }
    }

    @keyframes liquid-droplet-2 {
      0%,
      100% {
        transform: translateX(0px) translateY(0px) rotate(0deg) scale(1);
        opacity: 0.2;
      }
      30% {
        transform: translateX(-3px) translateY(-2px) rotate(45deg) scale(1.3);
        opacity: 0.7;
      }
      60% {
        transform: translateX(2px) translateY(-5px) rotate(90deg) scale(0.7);
        opacity: 0.5;
      }
      90% {
        transform: translateX(-1px) translateY(-2px) rotate(135deg) scale(1.2);
        opacity: 0.3;
      }
    }

    @keyframes liquid-droplet-3 {
      0%,
      100% {
        transform: translateX(0px) translateY(0px) scale(1);
        opacity: 0.4;
      }
      35% {
        transform: translateX(3px) translateY(2px) scale(1.4);
        opacity: 0.9;
      }
      65% {
        transform: translateX(-2px) translateY(4px) scale(0.6);
        opacity: 0.7;
      }
      95% {
        transform: translateX(1px) translateY(2px) scale(1.3);
        opacity: 0.5;
      }
    }

    .animate-liquid-droplet-1 {
      animation: liquid-droplet-1 2.8s ease-in-out infinite;
    }

    .animate-liquid-droplet-2 {
      animation: liquid-droplet-2 3.2s ease-in-out infinite;
    }

    .animate-liquid-droplet-3 {
      animation: liquid-droplet-3 2.6s ease-in-out infinite;
    }

    .animate-liquid-morph {
      animation: liquid-morph 1.2s ease-in-out;
    }

    .animate-dissolve {
      animation: dissolve 0.4s ease-out forwards;
    }

    /* Liquid Trail Effect */
    .liquid-trail {
      animation: liquid-trail-fade 0.8s ease-out forwards;
    }

    @keyframes liquid-trail-fade {
      0% {
        opacity: 0.3;
        transform: scale(1);
      }
      100% {
        opacity: 0;
        transform: scale(0.95);
      }
    }

    /* Smooth transitions for liquid effect */
    .liquid-transition {
      transition: all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }

    /* Enhanced hover effects */
    .liquid-hover {
      transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }

    .liquid-hover:hover {
      transform: translateY(-1px) scale(1.02);
      filter: brightness(1.05) saturate(1.1);
    }

    /* Ensure text doesn't overflow */
    .notification-text {
      word-wrap: break-word;
      overflow-wrap: break-word;
      hyphens: auto;
    }

    /* Liquid ripple effect */
    .liquid-ripple {
      position: relative;
      overflow: hidden;
    }

    .liquid-ripple::before {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      width: 0;
      height: 0;
      border-radius: 50%;
      background: radial-gradient(
        circle,
        rgba(59, 130, 246, 0.3) 0%,
        transparent 70%
      );
      transform: translate(-50%, -50%);
      transition: width 0.6s ease-out, height 0.6s ease-out;
    }

    .liquid-ripple:hover::before {
      width: 200px;
      height: 200px;
    }

    /* Accessibility: Respect user's reduced motion preferences */
    @media (prefers-reduced-motion: reduce) {
      .liquid-flow-advanced,
      .liquid-stable,
      .animate-liquid-shine,
      .animate-liquid-wave,
      .animate-liquid-ripple,
      .animate-liquid-particle-1,
      .animate-liquid-particle-2,
      .animate-liquid-particle-3,
      .animate-liquid-morph,
      .animate-dissolve {
        animation: none !important;
        transition: none !important;
      }

      /* Simplify transitions for reduced motion */
      .liquid-transition {
        transition: opacity 0.2s ease-out;
      }

      /* Remove complex transforms */
      .liquid-hover:hover {
        transform: none;
        filter: none;
      }
    }

    /* Performance optimization for low-end devices */
    @media (max-width: 768px) {
      .liquid-flow-advanced {
        animation-duration: 0.5s;
      }

      .animate-liquid-shine,
      .animate-liquid-wave,
      .animate-liquid-ripple {
        animation-duration: 2s;
      }
    }
  `}</style>
);

// Create the enhanced component with liquid styles
const CRMNavWithStyles = () => (
  <>
    <LiquidFlowingStyles />
    <CRMNav />
  </>
);

// Export the enhanced component as default
export default CRMNavWithStyles;

// Also export the original component for backward compatibility
export { CRMNav };
