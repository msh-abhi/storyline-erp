/**
 * Performance Optimization Utilities
 * Implements quick wins for ERP frontend performance improvements
 */

import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';

// Memoization utilities for heavy calculations
export const useHeavyCalculation = <T,>(
  calculation: () => T,
  dependencies: React.DependencyList
): T => {
  return useMemo(calculation, dependencies);
};

// Debounce utility for search and API calls
export const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]) as T;
};

// Throttle utility for scroll and resize events
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastRun = useRef(Date.now());
  
  return useCallback((...args: Parameters<T>) => {
    if (Date.now() - lastRun.current >= delay) {
      callback(...args);
      lastRun.current = Date.now();
    }
  }, [callback, delay]) as T;
};

// Virtual scrolling utility for large data sets
export interface VirtualScrollItem {
  id: string;
  height: number;
  data: any;
}

export const useVirtualScroll = (
  items: VirtualScrollItem[],
  containerHeight: number,
  itemHeight: number
) => {
  const scrollTop = useRef(0);
  
  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop.current / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      items.length
    );
    
    return items.slice(startIndex, endIndex).map((item, index) => ({
      ...item,
      index: startIndex + index,
      top: (startIndex + index) * itemHeight
    }));
  }, [items, containerHeight, itemHeight, scrollTop.current]);

  const totalHeight = items.length * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    scrollTop.current = e.currentTarget.scrollTop;
  }, []);

  return {
    visibleItems,
    totalHeight,
    handleScroll
  };
};

// Image lazy loading utility
export const useLazyImage = (src: string) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = new Image();
            img.src = src;
            img.onload = () => {
              setImageSrc(src);
              setIsLoading(false);
            };
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src]);

  return {
    ref: imgRef,
    src: imageSrc,
    isLoading
  };
};

// Performance monitoring utility
export interface PerformanceMetrics {
  renderTime: number;
  componentCount: number;
  reRenderCount: number;
}

export const usePerformanceMonitor = (componentName: string) => {
  const renderCount = useRef(0);
  const startTime = useRef(Date.now());

  useEffect(() => {
    renderCount.current += 1;
    const renderTime = Date.now() - startTime.current;
    
    // Log performance metrics in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`Performance - ${componentName}:`, {
        renderTime,
        renderCount: renderCount.current
      });
    }
    
    startTime.current = Date.now();
  });

  return {
    renderCount: renderCount.current,
    getMetrics: (): PerformanceMetrics => ({
      renderTime: Date.now() - startTime.current,
      componentCount: 1,
      reRenderCount: renderCount.current
    })
  };
};

// Bundle size optimization utilities
export const lazyLoadComponent = <T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
) => {
  return React.lazy(importFunc);
};

export const preloadComponent = <T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
) => {
  importFunc();
};

// Memory management utilities
export const useMemoryCleanup = (cleanupFn: () => void) => {
  useEffect(() => {
    return cleanupFn;
  }, [cleanupFn]);
};

export const clearCache = () => {
  // Clear caches and free up memory
  if ('caches' in window) {
    caches.keys().then((names) => {
      names.forEach((name) => {
        caches.delete(name);
      });
    });
  }
};

// Network optimization utilities
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    const updateConnectionType = () => {
      const connection = (navigator as any).connection;
      if (connection) {
        setConnectionType(connection.effectiveType || 'unknown');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    updateConnectionType();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    connectionType
  };
};

// Request optimization utilities
export const useRequestQueue = () => {
  const queue = useRef<Map<string, Promise<any>>>(new Map());

  const enqueueRequest = useCallback(<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> => {
    if (queue.current.has(key)) {
      return queue.current.get(key) as Promise<T>;
    }

    const promise = requestFn();
    queue.current.set(key, promise);

    promise.finally(() => {
      queue.current.delete(key);
    });

    return promise;
  }, []);

  return { enqueueRequest };
};

// Component optimization HOC
export const withPerformanceOptimization = <P extends object>(
  Component: React.ComponentType<P>
) => {
  const OptimizedComponent = React.memo(Component);

  OptimizedComponent.displayName = `withPerformanceOptimization(${
    Component.displayName || Component.name
  })`;

  return OptimizedComponent;
};

// Performance measurement utility
export const measurePerformance = (name: string, fn: () => void) => {
  const start = performance.now();
  fn();
  const end = performance.now();
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`${name} took ${end - start} milliseconds`);
  }
  
  return end - start;
};

// Resource loading optimization
export const preloadResources = (resources: string[]) => {
  resources.forEach((resource) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = resource;
    
    if (resource.endsWith('.js')) {
      link.as = 'script';
    } else if (resource.endsWith('.css')) {
      link.as = 'style';
    } else if (resource.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
      link.as = 'image';
    }
    
    document.head.appendChild(link);
  });
};

// Critical resource prioritization
export const prioritizeCriticalResources = (criticalResources: string[]) => {
  criticalResources.forEach((resource) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = resource;
    link.as = 'script';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
};