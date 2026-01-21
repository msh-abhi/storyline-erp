/**
 * Accessibility Utilities
 * Implements WCAG 2.1 AA compliance improvements
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';

// ARIA utilities
export const useAriaAnnouncement = () => {
  const announcementRef = useRef<HTMLDivElement>(null);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announcementRef.current) {
      announcementRef.current.setAttribute('aria-live', priority);
      announcementRef.current.textContent = message;
      
      // Clear after announcement
      setTimeout(() => {
        if (announcementRef.current) {
          announcementRef.current.textContent = '';
        }
      }, 1000);
    }
  }, []);

  const AnnounceComponent = () =>
    React.createElement('div', {
      ref: announcementRef,
      className: "sr-only",
      'aria-live': "polite",
      'aria-atomic': "true"
    });

  return { announce, AnnounceComponent };
};

// Focus management utilities
export const useFocusManagement = () => {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const trapFocus = useCallback((container: HTMLElement) => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;
    
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstFocusable) {
            lastFocusable.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            firstFocusable.focus();
            e.preventDefault();
          }
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    firstFocusable?.focus();

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }, []);

  const restoreFocus = useCallback(() => {
    if (previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
  }, []);

  return { trapFocus, restoreFocus };
};

// Keyboard navigation utilities
export const useKeyboardNavigation = (
  items: HTMLElement[],
  onSelect?: (index: number) => void
) => {
  const currentIndexRef = useRef(0);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault();
        currentIndexRef.current = (currentIndexRef.current + 1) % items.length;
        items[currentIndexRef.current]?.focus();
        break;
        
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault();
        currentIndexRef.current = currentIndexRef.current === 0 
          ? items.length - 1 
          : currentIndexRef.current - 1;
        items[currentIndexRef.current]?.focus();
        break;
        
      case 'Home':
        e.preventDefault();
        currentIndexRef.current = 0;
        items[0]?.focus();
        break;
        
      case 'End':
        e.preventDefault();
        currentIndexRef.current = items.length - 1;
        items[items.length - 1]?.focus();
        break;
        
      case 'Enter':
      case ' ':
        e.preventDefault();
        onSelect?.(currentIndexRef.current);
        break;
    }
  }, [items, onSelect]);

  return { handleKeyDown, currentIndex: currentIndexRef.current };
};

// Screen reader utilities
export const useScreenReader = () => {
  const announceToScreenReader = useCallback((message: string) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, []);

  return { announceToScreenReader };
};

// Color contrast utilities
export const checkColorContrast = (foreground: string, background: string): number => {
  const getLuminance = (color: string): number => {
    const rgb = color.match(/\d+/g);
    if (!rgb) return 0;
    
    const [r, g, b] = rgb.map(val => {
      const normalized = parseInt(val) / 255;
      return normalized <= 0.03928 
        ? normalized / 12.92 
        : Math.pow((normalized + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
};

export const meetsWCAGStandard = (
  contrastRatio: number,
  level: 'AA' | 'AAA' = 'AA',
  largeText: boolean = false
): boolean => {
  if (level === 'AA') {
    return largeText ? contrastRatio >= 3.0 : contrastRatio >= 4.5;
  } else {
    return largeText ? contrastRatio >= 4.5 : contrastRatio >= 7.0;
  }
};

// Skip navigation utilities
export const SkipLink = ({ href, children }: { href: string; children: React.ReactNode }) =>
  React.createElement('a', {
    href,
    className: "sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
  }, children);

// Focus visible utilities
export const useFocusVisible = () => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleMouseDown = () => {
      element.classList.remove('focus-visible');
    };

    const handleKeyDown = () => {
      element.classList.add('focus-visible');
    };

    element.addEventListener('mousedown', handleMouseDown);
    element.addEventListener('keydown', handleKeyDown);

    return () => {
      element.removeEventListener('mousedown', handleMouseDown);
      element.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return ref;
};

// Reduced motion utilities
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
};

// High contrast utilities
export const useHighContrast = () => {
  const [prefersHighContrast, setPrefersHighContrast] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setPrefersHighContrast(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersHighContrast(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersHighContrast;
};

// Accessible form utilities
export const useAccessibleField = (label: string, error?: string) => {
  const fieldId = useRef(`field-${Math.random().toString(36).substr(2, 9)}`);
  const errorId = useRef(`error-${Math.random().toString(36).substr(2, 9)}`);

  const fieldProps = {
    id: fieldId.current,
    'aria-label': label,
    'aria-describedby': error ? errorId.current : undefined,
    'aria-invalid': !!error
  };

  const labelProps = {
    htmlFor: fieldId.current
  };

  const errorProps = {
    id: errorId.current,
    role: 'alert',
    'aria-live': 'polite' as const
  };

  return { fieldProps, labelProps, errorProps };
};

// Accessible modal utilities
export const useAccessibleModal = (isOpen: boolean, onClose: () => void) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      
      // Trap focus within modal
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as NodeListOf<HTMLElement>;
      
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }

      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Restore focus and scroll
      previousFocusRef.current?.focus();
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    const modal = modalRef.current;
    if (modal && isOpen) {
      modal.addEventListener('keydown', handleKeyDown);
      return () => modal.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  const modalProps = {
    ref: modalRef,
    role: 'dialog',
    'aria-modal': true,
    'aria-labelledby': 'modal-title',
    'aria-describedby': 'modal-description'
  };

  return { modalProps };
};

// Accessible table utilities
export const useAccessibleTable = () => {
  const tableProps = {
    role: 'table'
  };

  const createHeaderProps = (scope: 'col' | 'row' = 'col') => ({
    scope,
    role: 'columnheader'
  });

  const createCellProps = (headers?: string) => ({
    role: 'cell',
    headers
  });

  const createRowProps = (rowIndex?: number) => ({
    role: 'row',
    'aria-rowindex': rowIndex
  });

  return {
    tableProps,
    createHeaderProps,
    createCellProps,
    createRowProps
  };
};

// Accessible chart utilities
export const useAccessibleChart = (title: string, description: string) => {
  const chartProps = {
    role: 'img',
    'aria-label': title,
    'aria-describedby': 'chart-description'
  };

  const descriptionProps = {
    id: 'chart-description',
    className: 'sr-only'
  };

  return {
    chartProps,
    descriptionProps,
    description
  };
};

// Screen reader only class utility
export const srOnly = 'sr-only';

// CSS for screen reader only content
export const srOnlyStyles = `
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  
  .focus:not(.focus-visible) {
    outline: none;
  }
  
  .focus-visible {
    outline: 2px solid #2563eb;
    outline-offset: 2px;
  }
  
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;