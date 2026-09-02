// Memory Management Utilities for PDF Editor
import type { PdfPerformanceMetrics } from '../../types/pdfEditor';

class MemoryManager {
  private metrics: PdfPerformanceMetrics[] = [];
  private maxMetricsHistory = 10;
  private cleanupCallbacks: (() => void)[] = [];
  private memoryThreshold = 50 * 1024 * 1024; // 50MB threshold
  private lastGcTime = Date.now();

  /**
   * Track memory usage and performance
   */
  trackMetrics(metrics: PdfPerformanceMetrics): void {
    this.metrics.push(metrics);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.shift();
    }

    // Check memory usage and trigger cleanup if needed
    this.checkMemoryUsage();
  }

  /**
   * Get current memory metrics
   */
  getCurrentMetrics(): PdfPerformanceMetrics | null {
    return this.metrics[this.metrics.length - 1] || null;
  }

  /**
   * Get average performance metrics
   */
  getAverageMetrics(): Partial<PdfPerformanceMetrics> {
    if (this.metrics.length === 0) return {};

    const totals = this.metrics.reduce((acc, metric) => ({
      renderTime: acc.renderTime + metric.renderTime,
      memoryUsage: acc.memoryUsage + metric.memoryUsage,
      canvasCount: acc.canvasCount + metric.canvasCount,
      textLayerCount: acc.textLayerCount + metric.textLayerCount,
      annotationCount: acc.annotationCount + metric.annotationCount,
    }), {
      renderTime: 0,
      memoryUsage: 0,
      canvasCount: 0,
      textLayerCount: 0,
      annotationCount: 0,
    });

    return {
      renderTime: totals.renderTime / this.metrics.length,
      memoryUsage: totals.memoryUsage / this.metrics.length,
      canvasCount: Math.round(totals.canvasCount / this.metrics.length),
      textLayerCount: Math.round(totals.textLayerCount / this.metrics.length),
      annotationCount: Math.round(totals.annotationCount / this.metrics.length),
      lastGcTime: new Date(this.lastGcTime)
    };
  }

  /**
   * Check memory usage and trigger cleanup if needed
   */
  private checkMemoryUsage(): void {
    const currentMetrics = this.getCurrentMetrics();
    if (!currentMetrics) return;

    // Check if memory usage is above threshold
    if (currentMetrics.memoryUsage > this.memoryThreshold) {
      console.warn('High memory usage detected, triggering cleanup');
      this.forceCleanup();
    }

    // Trigger garbage collection periodically
    const now = Date.now();
    if (now - this.lastGcTime > 30000) { // Every 30 seconds
      this.suggestGarbageCollection();
      this.lastGcTime = now;
    }
  }

  /**
   * Force cleanup of resources
   */
  forceCleanup(): void {
    // Execute all cleanup callbacks
    this.cleanupCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    });

    // Clear cleanup callbacks
    this.cleanupCallbacks = [];

    // Force garbage collection if available
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc();
    }

    // Clear any cached data
    this.clearCache();
  }

  /**
   * Register cleanup callback
   */
  registerCleanup(callback: () => void): () => void {
    this.cleanupCallbacks.push(callback);

    // Return unregister function
    return () => {
      const index = this.cleanupCallbacks.indexOf(callback);
      if (index > -1) {
        this.cleanupCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Clear cached data
   */
  private clearCache(): void {
    // Clear any cached canvases
    const canvases = document.querySelectorAll('canvas[data-pdf-editor]');
    canvases.forEach(canvas => {
      if (canvas instanceof HTMLCanvasElement) {
        const context = canvas.getContext('2d');
        if (context) {
          context.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    });

    // Clear image caches
    const images = document.querySelectorAll('img[data-pdf-editor]');
    images.forEach(img => {
      if (img instanceof HTMLImageElement) {
        img.src = '';
      }
    });
  }

  /**
   * Suggest garbage collection
   */
  private suggestGarbageCollection(): void {
    // Create a small object to help trigger GC
    const tempObject = { data: new Array(1000).fill('x') };

    // Immediately release reference
    setTimeout(() => {
      // This helps hint to the GC that cleanup can happen
      if (typeof window !== 'undefined' && (window as any).gc) {
        (window as any).gc();
      }
    }, 100);
  }

  /**
   * Create a virtualized canvas pool for memory efficiency
   */
  createCanvasPool(size: number = 5): HTMLCanvasElement[] {
    const canvases: HTMLCanvasElement[] = [];

    for (let i = 0; i < size; i++) {
      const canvas = document.createElement('canvas');
      canvas.setAttribute('data-pdf-editor', 'canvas-pool');
      canvas.style.display = 'none';
      document.body.appendChild(canvas);
      canvases.push(canvas);

      // Register cleanup for this canvas
      this.registerCleanup(() => {
        if (canvas.parentNode) {
          canvas.parentNode.removeChild(canvas);
        }
      });
    }

    return canvases;
  }

  /**
   * Get optimized canvas from pool
   */
  getOptimizedCanvas(width: number, height: number, pool?: HTMLCanvasElement[]): HTMLCanvasElement {
    let canvas: HTMLCanvasElement;

    if (pool && pool.length > 0) {
      // Reuse from pool
      canvas = pool.pop()!;
    } else {
      // Create new canvas
      canvas = document.createElement('canvas');
      canvas.setAttribute('data-pdf-editor', 'optimized');
    }

    // Set dimensions
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    const context = canvas.getContext('2d');
    if (context) {
      context.clearRect(0, 0, width, height);

      // Enable image smoothing for better quality
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
    }

    return canvas;
  }

  /**
   * Return canvas to pool
   */
  returnCanvasToPool(canvas: HTMLCanvasElement, pool?: HTMLCanvasElement[]): void {
    if (pool && pool.length < 10) { // Limit pool size
      // Clear canvas
      const context = canvas.getContext('2d');
      if (context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
      }

      pool.push(canvas);
    } else {
      // Destroy canvas if pool is full
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    }
  }

  /**
   * Monitor performance and log warnings
   */
  monitorPerformance(operation: string, startTime: number, endTime: number): void {
    const duration = endTime - startTime;

    if (duration > 1000) { // Operations taking more than 1 second
      console.warn(`Slow operation detected: ${operation} took ${duration}ms`);
    }

    if (duration > 5000) { // Operations taking more than 5 seconds
      console.error(`Critical performance issue: ${operation} took ${duration}ms`);
    }
  }

  /**
   * Get memory usage information
   */
  getMemoryInfo(): { used: number; total: number; limit: number } | null {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      };
    }
    return null;
  }

  /**
   * Check if browser supports required features
   */
  checkBrowserSupport(): {
    canvas: boolean;
    webgl: boolean;
    webworkers: boolean;
    indexeddb: boolean;
    memoryInfo: boolean;
  } {
    return {
      canvas: typeof HTMLCanvasElement !== 'undefined',
      webgl: (() => {
        try {
          const canvas = document.createElement('canvas');
          return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch {
          return false;
        }
      })(),
      webworkers: typeof Worker !== 'undefined',
      indexeddb: typeof indexedDB !== 'undefined',
      memoryInfo: typeof performance !== 'undefined' && !!(performance as any).memory
    };
  }
}

// Export singleton instance
export const memoryManager = new MemoryManager();

// Export utility functions
export const memoryUtils = {
  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * Get memory usage percentage
   */
  getMemoryUsagePercentage(): number | null {
    const memoryInfo = memoryManager.getMemoryInfo();
    if (!memoryInfo) return null;

    return (memoryInfo.used / memoryInfo.limit) * 100;
  },

  /**
   * Check if memory usage is critical
   */
  isMemoryCritical(threshold: number = 80): boolean {
    const percentage = this.getMemoryUsagePercentage();
    return percentage !== null && percentage > threshold;
  }
};
