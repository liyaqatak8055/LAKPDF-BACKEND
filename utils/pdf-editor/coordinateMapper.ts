// Coordinate Mapping Utilities for PDF Editor
import type { PdfViewport, PdfCoordinateMapper } from '../../types/pdfEditor';

export class CoordinateMapper implements PdfCoordinateMapper {
  private viewport: PdfViewport;
  private pdfScale: number; // PDF's internal scale (usually 1.0)
  private screenScale: number; // How much the PDF is scaled on screen

  constructor(viewport: PdfViewport) {
    this.viewport = { ...viewport };
    this.pdfScale = 1.0; // PDF coordinates are typically at scale 1.0
    this.screenScale = viewport.scale;
  }

  /**
   * Convert PDF coordinates to screen coordinates
   * PDF coordinates: (0,0) is bottom-left, Y increases upward
   * Screen coordinates: (0,0) is top-left, Y increases downward
   */
  pdfToScreen(pdfX: number, pdfY: number): { x: number; y: number } {
    // Scale PDF coordinates to screen scale
    const scaledX = pdfX * this.screenScale;
    const scaledY = pdfY * this.screenScale;

    // Flip Y coordinate (PDF bottom-left to screen top-left)
    const screenY = this.viewport.height * this.screenScale - scaledY;

    // Add viewport offset
    const finalX = scaledX + this.viewport.offsetX;
    const finalY = screenY + this.viewport.offsetY;

    return {
      x: Math.round(finalX * 100) / 100, // Round to 2 decimal places
      y: Math.round(finalY * 100) / 100
    };
  }

  /**
   * Convert screen coordinates to PDF coordinates
   */
  screenToPdf(screenX: number, screenY: number): { x: number; y: number } {
    // Remove viewport offset
    const offsetX = screenX - this.viewport.offsetX;
    const offsetY = screenY - this.viewport.offsetY;

    // Unflip Y coordinate (screen top-left to PDF bottom-left)
    const pdfY = this.viewport.height * this.screenScale - offsetY;

    // Scale back to PDF coordinates
    const pdfX = offsetX / this.screenScale;
    const pdfYFinal = pdfY / this.screenScale;

    return {
      x: Math.round(pdfX * 100) / 100,
      y: Math.round(pdfYFinal * 100) / 100
    };
  }

  /**
   * Update viewport when zoom or pan changes
   */
  updateViewport(viewport: PdfViewport): void {
    this.viewport = { ...viewport };
    this.screenScale = viewport.scale;
  }

  /**
   * Get bounding rectangle in screen coordinates
   */
  rectPdfToScreen(pdfRect: DOMRect): DOMRect {
    const topLeft = this.pdfToScreen(pdfRect.x, pdfRect.y);
    const bottomRight = this.pdfToScreen(pdfRect.x + pdfRect.width, pdfRect.y + pdfRect.height);

    return new DOMRect(
      topLeft.x,
      topLeft.y,
      bottomRight.x - topLeft.x,
      bottomRight.y - topLeft.y
    );
  }

  /**
   * Get bounding rectangle in PDF coordinates
   */
  rectScreenToPdf(screenRect: DOMRect): DOMRect {
    const topLeft = this.screenToPdf(screenRect.x, screenRect.y);
    const bottomRight = this.screenToPdf(screenRect.x + screenRect.width, screenRect.y + screenRect.height);

    return new DOMRect(
      topLeft.x,
      topLeft.y,
      bottomRight.x - topLeft.x,
      bottomRight.y - topLeft.y
    );
  }

  /**
   * Convert distance from PDF to screen coordinates
   */
  distancePdfToScreen(pdfDistance: number): number {
    return pdfDistance * this.screenScale;
  }

  /**
   * Convert distance from screen to PDF coordinates
   */
  distanceScreenToPdf(screenDistance: number): number {
    return screenDistance / this.screenScale;
  }

  /**
   * Check if a point is within the viewport bounds
   */
  isPointInViewport(screenX: number, screenY: number): boolean {
    const pdfPoint = this.screenToPdf(screenX, screenY);
    return pdfPoint.x >= 0 &&
           pdfPoint.x <= this.viewport.width &&
           pdfPoint.y >= 0 &&
           pdfPoint.y <= this.viewport.height;
  }

  /**
   * Get the visible area in PDF coordinates
   */
  getVisiblePdfArea(): DOMRect {
    const topLeft = this.screenToPdf(0, 0);
    const bottomRight = this.screenToPdf(this.viewport.width, this.viewport.height);

    return new DOMRect(
      Math.max(0, topLeft.x),
      Math.max(0, topLeft.y),
      Math.min(this.viewport.width, bottomRight.x - topLeft.x),
      Math.min(this.viewport.height, bottomRight.y - topLeft.y)
    );
  }

  /**
   * Center a PDF point on screen
   */
  centerOnScreen(pdfX: number, pdfY: number, containerWidth: number, containerHeight: number): { offsetX: number; offsetY: number } {
    const screenPoint = this.pdfToScreen(pdfX, pdfY);

    return {
      offsetX: containerWidth / 2 - screenPoint.x,
      offsetY: containerHeight / 2 - screenPoint.y
    };
  }

  /**
   * Fit PDF to container with specified mode
   */
  calculateFitScale(containerWidth: number, containerHeight: number, fitMode: 'width' | 'height' | 'page'): number {
    const pdfWidth = this.viewport.width;
    const pdfHeight = this.viewport.height;

    switch (fitMode) {
      case 'width':
        return containerWidth / pdfWidth;
      case 'height':
        return containerHeight / pdfHeight;
      case 'page':
        return Math.min(containerWidth / pdfWidth, containerHeight / pdfHeight);
      default:
        return 1.0;
    }
  }

  /**
   * Calculate zoom to fit PDF in container
   */
  calculateZoomToFit(containerWidth: number, containerHeight: number, padding: number = 20): number {
    const availableWidth = containerWidth - padding * 2;
    const availableHeight = containerHeight - padding * 2;

    const scaleX = availableWidth / this.viewport.width;
    const scaleY = availableHeight / this.viewport.height;

    return Math.min(scaleX, scaleY);
  }

  /**
   * Get viewport information
   */
  getViewport(): PdfViewport {
    return { ...this.viewport };
  }

  /**
   * Clone the mapper with new viewport
   */
  clone(newViewport?: Partial<PdfViewport>): CoordinateMapper {
    const viewport = newViewport
      ? { ...this.viewport, ...newViewport }
      : this.viewport;

    return new CoordinateMapper(viewport);
  }
}

/**
 * Factory function to create coordinate mapper
 */
export function createCoordinateMapper(viewport: PdfViewport): CoordinateMapper {
  return new CoordinateMapper(viewport);
}

/**
 * Utility functions for coordinate transformations
 */
export const coordinateUtils = {
  /**
   * Check if two rectangles intersect
   */
  rectsIntersect(rect1: DOMRect, rect2: DOMRect): boolean {
    return !(rect1.x + rect1.width < rect2.x ||
             rect2.x + rect2.width < rect1.x ||
             rect1.y + rect1.height < rect2.y ||
             rect2.y + rect2.height < rect1.y);
  },

  /**
   * Check if point is inside rectangle
   */
  isPointInRect(x: number, y: number, rect: DOMRect): boolean {
    return x >= rect.x &&
           x <= rect.x + rect.width &&
           y >= rect.y &&
           y <= rect.y + rect.height;
  },

  /**
   * Get distance between two points
   */
  distance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  },

  /**
   * Clamp value between min and max
   */
  clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  },

  /**
   * Round to nearest grid point
   */
  snapToGrid(value: number, gridSize: number): number {
    return Math.round(value / gridSize) * gridSize;
  }
};
