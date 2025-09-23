"use client";

import React, { useState, useRef, useEffect } from "react";

interface TooltipProps {
  children: React.ReactNode;
  content: string | React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  interactive?: boolean;
}

export function Tooltip({ children, content, position = "top", interactive = false }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showTooltip = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setIsVisible(true);
  };

  const hideTooltip = () => {
    if (interactive) {
      // For interactive tooltips, add a small delay to allow mouse movement to tooltip content
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 100);
    } else {
      setIsVisible(false);
    }
  };

  const handleTooltipMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  const handleTooltipMouseLeave = () => {
    if (interactive) {
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 100);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsVisible(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  const getPositionClasses = () => {
    switch (position) {
      case "top":
        return "bottom-full left-1/2 transform -translate-x-1/2 mb-2";
      case "bottom":
        return "top-full left-1/2 transform -translate-x-1/2 mt-2";
      case "left":
        return "right-full top-1/2 transform -translate-y-1/2 mr-2";
      case "right":
        return "left-full top-1/2 transform -translate-y-1/2 ml-2";
      default:
        return "bottom-full left-1/2 transform -translate-x-1/2 mb-2";
    }
  };

  const getTooltipClasses = () => {
    switch (position) {
      case "top":
        return "max-w-xs";
      case "bottom":
        return "max-w-xs";
      case "left":
        return "max-w-xs";
      case "right":
        return "max-w-xs";
      default:
        return "max-w-xs";
    }
  };

  const getTooltipPosition = () => {
    if (!triggerRef.current) return {};

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipHeight = 200; // Approximate height
    const tooltipWidth = 320; // Approximate width based on max-w-xs
    const margin = 8;

    let top = 0;
    let left = 0;

    switch (position) {
      case "top":
        top = triggerRect.top - tooltipHeight - margin;
        left = triggerRect.left + (triggerRect.width / 2) - (tooltipWidth / 2);
        break;
      case "bottom":
        top = triggerRect.bottom + margin;
        left = triggerRect.left + (triggerRect.width / 2) - (tooltipWidth / 2);
        break;
      case "left":
        top = triggerRect.top + (triggerRect.height / 2) - (tooltipHeight / 2);
        left = triggerRect.left - tooltipWidth - margin;
        break;
      case "right":
        top = triggerRect.top + (triggerRect.height / 2) - (tooltipHeight / 2);
        left = triggerRect.right + margin;
        break;
      default:
        top = triggerRect.top - tooltipHeight - margin;
        left = triggerRect.left + (triggerRect.width / 2) - (tooltipWidth / 2);
    }

    // Ensure tooltip stays within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left < margin) left = margin;
    if (left + tooltipWidth > viewportWidth - margin) left = viewportWidth - tooltipWidth - margin;
    if (top < margin) top = margin;
    if (top + tooltipHeight > viewportHeight - margin) top = viewportHeight - tooltipHeight - margin;

    return { top, left };
  };

  const getArrowClasses = () => {
    switch (position) {
      case "top":
        return "top-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent";
      case "bottom":
        return "bottom-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent";
      case "left":
        return "left-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent";
      case "right":
        return "right-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent";
      default:
        return "top-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent";
    }
  };

  return (
    <div className="relative inline-block overflow-visible">
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        className="inline-block"
      >
        {children}
      </div>

      {isVisible && (
        <div
          ref={tooltipRef}
          onMouseEnter={interactive ? handleTooltipMouseEnter : undefined}
          onMouseLeave={interactive ? handleTooltipMouseLeave : undefined}
          className={`fixed z-[9999] px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-lg ${getTooltipClasses()}`}
          style={{
            wordWrap: "break-word",
            whiteSpace: "normal",
            ...getTooltipPosition(),
          }}
        >
          {content}
          <div
            className={`absolute w-0 h-0 border-4 border-gray-900 ${getArrowClasses()}`}
          />
        </div>
      )}
    </div>
  );
}
