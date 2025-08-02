/**
 * Accessibility utilities and helpers
 */

/**
 * Focus management utilities
 */
export const focusUtils = {
  /**
   * Set focus to element with optional delay
   * @param {HTMLElement|string} element - Element or selector
   * @param {number} delay - Delay in milliseconds
   */
  setFocus: (element, delay = 0) => {
    const targetElement = typeof element === 'string' 
      ? document.querySelector(element) 
      : element;
    
    if (targetElement) {
      if (delay > 0) {
        setTimeout(() => targetElement.focus(), delay);
      } else {
        targetElement.focus();
      }
    }
  },

  /**
   * Get all focusable elements within a container
   * @param {HTMLElement} container - Container element
   * @returns {NodeList} - Focusable elements
   */
  getFocusableElements: (container) => {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');
    
    return container.querySelectorAll(focusableSelectors);
  },

  /**
   * Trap focus within a container (for modals, dialogs)
   * @param {HTMLElement} container - Container element
   * @returns {Function} - Cleanup function
   */
  trapFocus: (container) => {
    const focusableElements = focusUtils.getFocusableElements(container);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    
    // Set initial focus
    if (firstElement) {
      firstElement.focus();
    }

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }
};

/**
 * ARIA utilities
 */
export const ariaUtils = {
  /**
   * Announce message to screen readers
   * @param {string} message - Message to announce
   * @param {string} priority - Priority level (polite, assertive)
   */
  announce: (message, priority = 'polite') => {
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.textContent = message;
    
    document.body.appendChild(announcer);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 1000);
  },

  /**
   * Generate unique ID for ARIA relationships
   * @param {string} prefix - ID prefix
   * @returns {string} - Unique ID
   */
  generateId: (prefix = 'aria') => {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Set ARIA expanded state
   * @param {HTMLElement} element - Element to update
   * @param {boolean} expanded - Expanded state
   */
  setExpanded: (element, expanded) => {
    element.setAttribute('aria-expanded', expanded.toString());
  },

  /**
   * Set ARIA selected state
   * @param {HTMLElement} element - Element to update
   * @param {boolean} selected - Selected state
   */
  setSelected: (element, selected) => {
    element.setAttribute('aria-selected', selected.toString());
  },

  /**
   * Set ARIA pressed state for toggle buttons
   * @param {HTMLElement} element - Element to update
   * @param {boolean} pressed - Pressed state
   */
  setPressed: (element, pressed) => {
    element.setAttribute('aria-pressed', pressed.toString());
  }
};

/**
 * Keyboard navigation utilities
 */
export const keyboardUtils = {
  /**
   * Handle arrow key navigation in lists
   * @param {KeyboardEvent} event - Keyboard event
   * @param {NodeList} items - List items
   * @param {number} currentIndex - Current focused index
   * @returns {number} - New focused index
   */
  handleArrowNavigation: (event, items, currentIndex) => {
    let newIndex = currentIndex;
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'ArrowUp':
        event.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = items.length - 1;
        break;
    }
    
    if (newIndex !== currentIndex && items[newIndex]) {
      items[newIndex].focus();
    }
    
    return newIndex;
  },

  /**
   * Handle escape key to close modals/dropdowns
   * @param {KeyboardEvent} event - Keyboard event
   * @param {Function} closeHandler - Function to call on escape
   */
  handleEscape: (event, closeHandler) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeHandler();
    }
  },

  /**
   * Handle enter/space key activation
   * @param {KeyboardEvent} event - Keyboard event
   * @param {Function} activateHandler - Function to call on activation
   */
  handleActivation: (event, activateHandler) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activateHandler();
    }
  }
};

/**
 * Color contrast utilities
 */
export const colorUtils = {
  /**
   * Calculate relative luminance of a color
   * @param {string} color - Hex color string
   * @returns {number} - Relative luminance
   */
  getLuminance: (color) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    const sRGB = [r, g, b].map(c => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
  },

  /**
   * Calculate contrast ratio between two colors
   * @param {string} color1 - First color (hex)
   * @param {string} color2 - Second color (hex)
   * @returns {number} - Contrast ratio
   */
  getContrastRatio: (color1, color2) => {
    const lum1 = colorUtils.getLuminance(color1);
    const lum2 = colorUtils.getLuminance(color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    
    return (brightest + 0.05) / (darkest + 0.05);
  },

  /**
   * Check if color combination meets WCAG contrast requirements
   * @param {string} foreground - Foreground color (hex)
   * @param {string} background - Background color (hex)
   * @param {string} level - WCAG level (AA, AAA)
   * @param {string} size - Text size (normal, large)
   * @returns {boolean} - Whether contrast is sufficient
   */
  meetsContrastRequirement: (foreground, background, level = 'AA', size = 'normal') => {
    const ratio = colorUtils.getContrastRatio(foreground, background);
    
    const requirements = {
      AA: { normal: 4.5, large: 3 },
      AAA: { normal: 7, large: 4.5 }
    };
    
    return ratio >= requirements[level][size];
  }
};

/**
 * Screen reader utilities
 */
export const screenReaderUtils = {
  /**
   * Create screen reader only text
   * @param {string} text - Text for screen readers
   * @returns {HTMLElement} - Hidden element with text
   */
  createSROnlyText: (text) => {
    const element = document.createElement('span');
    element.className = 'sr-only';
    element.textContent = text;
    return element;
  },

  /**
   * Add screen reader description to element
   * @param {HTMLElement} element - Target element
   * @param {string} description - Description text
   */
  addDescription: (element, description) => {
    const descId = ariaUtils.generateId('desc');
    const descElement = screenReaderUtils.createSROnlyText(description);
    descElement.id = descId;
    
    element.parentNode.insertBefore(descElement, element.nextSibling);
    element.setAttribute('aria-describedby', descId);
  },

  /**
   * Add screen reader label to element
   * @param {HTMLElement} element - Target element
   * @param {string} label - Label text
   */
  addLabel: (element, label) => {
    const labelId = ariaUtils.generateId('label');
    const labelElement = screenReaderUtils.createSROnlyText(label);
    labelElement.id = labelId;
    
    element.parentNode.insertBefore(labelElement, element);
    element.setAttribute('aria-labelledby', labelId);
  }
};

/**
 * Motion and animation utilities for accessibility
 */
export const motionUtils = {
  /**
   * Check if user prefers reduced motion
   * @returns {boolean} - Whether reduced motion is preferred
   */
  prefersReducedMotion: () => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  /**
   * Apply animation with respect to user preferences
   * @param {HTMLElement} element - Element to animate
   * @param {Object} animation - Animation properties
   * @param {Object} reducedAnimation - Reduced animation properties
   */
  respectfulAnimate: (element, animation, reducedAnimation = {}) => {
    const shouldReduce = motionUtils.prefersReducedMotion();
    const animationProps = shouldReduce ? reducedAnimation : animation;
    
    if (element.animate) {
      return element.animate(animationProps.keyframes || [], {
        duration: shouldReduce ? 0 : (animationProps.duration || 300),
        easing: animationProps.easing || 'ease',
        ...animationProps.options
      });
    }
  }
};

/**
 * Form accessibility utilities
 */
export const formUtils = {
  /**
   * Associate label with form control
   * @param {HTMLElement} label - Label element
   * @param {HTMLElement} control - Form control element
   */
  associateLabel: (label, control) => {
    const controlId = control.id || ariaUtils.generateId('control');
    control.id = controlId;
    label.setAttribute('for', controlId);
  },

  /**
   * Add error message to form control
   * @param {HTMLElement} control - Form control element
   * @param {string} errorMessage - Error message
   */
  addErrorMessage: (control, errorMessage) => {
    const errorId = ariaUtils.generateId('error');
    const errorElement = document.createElement('div');
    errorElement.id = errorId;
    errorElement.className = 'error-message';
    errorElement.setAttribute('role', 'alert');
    errorElement.textContent = errorMessage;
    
    control.parentNode.insertBefore(errorElement, control.nextSibling);
    control.setAttribute('aria-describedby', errorId);
    control.setAttribute('aria-invalid', 'true');
  },

  /**
   * Remove error message from form control
   * @param {HTMLElement} control - Form control element
   */
  removeErrorMessage: (control) => {
    const errorId = control.getAttribute('aria-describedby');
    if (errorId) {
      const errorElement = document.getElementById(errorId);
      if (errorElement) {
        errorElement.remove();
      }
    }
    
    control.removeAttribute('aria-describedby');
    control.removeAttribute('aria-invalid');
  }
};

/**
 * Initialize accessibility features
 */
export const initializeAccessibility = () => {
  // Add skip link
  const skipLink = document.createElement('a');
  skipLink.href = '#main-content';
  skipLink.textContent = 'Skip to main content';
  skipLink.className = 'skip-link';
  document.body.insertBefore(skipLink, document.body.firstChild);
  
  // Add screen reader only styles
  const style = document.createElement('style');
  style.textContent = `
    .sr-only {
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    }
    
    .skip-link {
      position: absolute;
      top: -40px;
      left: 6px;
      background: #000;
      color: #fff;
      padding: 8px;
      text-decoration: none;
      z-index: 10000;
    }
    
    .skip-link:focus {
      top: 6px;
    }
    
    .error-message {
      color: #d32f2f;
      font-size: 0.875rem;
      margin-top: 4px;
    }
    
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }
  `;
  document.head.appendChild(style);
  
  // Set up focus visible polyfill for older browsers
  if (!CSS.supports('selector(:focus-visible)')) {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        document.body.classList.add('keyboard-navigation');
      }
    });
    
    document.addEventListener('mousedown', () => {
      document.body.classList.remove('keyboard-navigation');
    });
  }
};

export default {
  focusUtils,
  ariaUtils,
  keyboardUtils,
  colorUtils,
  screenReaderUtils,
  motionUtils,
  formUtils,
  initializeAccessibility
};