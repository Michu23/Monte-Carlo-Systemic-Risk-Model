import { useEffect, useRef, useState } from 'react';

/**
 * Custom hook for observing element resize events
 * @param {Object} options - Configuration options
 * @returns {Object} - Ref and dimensions
 */
const useResizeObserver = (options = {}) => {
  const ref = useRef();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0) return;
      
      const entry = entries[0];
      const { width, height } = entry.contentRect;
      
      setDimensions({ width, height });
    });
    
    resizeObserver.observe(element);
    
    // Set initial dimensions
    const { width, height } = element.getBoundingClientRect();
    setDimensions({ width, height });
    
    return () => {
      resizeObserver.unobserve(element);
    };
  }, []);
  
  return { ref, dimensions };
};

export default useResizeObserver;