/**
 * Layer Utilities for PDF Editor
 * Helper functions for layer manipulation, rendering, and calculations
 */

import type {
    Layer,
    TextLayer,
    ImageLayer,
    ShapeLayer,
    DrawingLayer,
    Transform,
    Point,
    Rect
} from '../types/pdfEditor';
import {
    isTextLayer,
    isImageLayer,
    isShapeLayer,
    isDrawingLayer,
    MIN_LAYER_SIZE,
    SELECTION_HANDLE_SIZE
} from '../types/pdfEditor';

// ============ TRANSFORM UTILITIES ============

/**
 * Apply transform to a point
 */
export function transformPoint(point: Point, transform: Transform): Point {
    const { x, y, rotation } = transform;
    const rad = (rotation * Math.PI) / 180;

    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    return {
        x: point.x * cos - point.y * sin + x,
        y: point.x * sin + point.y * cos + y
    };
}

/**
 * Get bounding box of a layer
 */
export function getLayerBounds(layer: Layer): Rect {
    const { transform } = layer;
    return {
        x: transform.x,
        y: transform.y,
        width: transform.width,
        height: transform.height
    };
}

/**
 * Check if a point is inside a layer
 */
export function isPointInLayer(point: Point, layer: Layer): boolean {
    const bounds = getLayerBounds(layer);

    return (
        point.x >= bounds.x &&
        point.x <= bounds.x + bounds.width &&
        point.y >= bounds.y &&
        point.y <= bounds.y + bounds.height
    );
}

/**
 * Get selection handles for a layer
 */
export function getSelectionHandles(layer: Layer): Record<string, Rect> {
    const bounds = getLayerBounds(layer);
    const handleSize = SELECTION_HANDLE_SIZE;
    const halfHandle = handleSize / 2;

    return {
        nw: { x: bounds.x - halfHandle, y: bounds.y - halfHandle, width: handleSize, height: handleSize },
        n: { x: bounds.x + bounds.width / 2 - halfHandle, y: bounds.y - halfHandle, width: handleSize, height: handleSize },
        ne: { x: bounds.x + bounds.width - halfHandle, y: bounds.y - halfHandle, width: handleSize, height: handleSize },
        e: { x: bounds.x + bounds.width - halfHandle, y: bounds.y + bounds.height / 2 - halfHandle, width: handleSize, height: handleSize },
        se: { x: bounds.x + bounds.width - halfHandle, y: bounds.y + bounds.height - halfHandle, width: handleSize, height: handleSize },
        s: { x: bounds.x + bounds.width / 2 - halfHandle, y: bounds.y + bounds.height - halfHandle, width: handleSize, height: handleSize },
        sw: { x: bounds.x - halfHandle, y: bounds.y + bounds.height - halfHandle, width: handleSize, height: handleSize },
        w: { x: bounds.x - halfHandle, y: bounds.y + bounds.height / 2 - halfHandle, width: handleSize, height: handleSize }
    };
}

/**
 * Snap value to grid
 */
export function snapToGrid(value: number, gridSize: number): number {
    return Math.round(value / gridSize) * gridSize;
}

/**
 * Snap point to grid
 */
export function snapPointToGrid(point: Point, gridSize: number): Point {
    return {
        x: snapToGrid(point.x, gridSize),
        y: snapToGrid(point.y, gridSize)
    };
}

/**
 * Constrain aspect ratio during resize
 */
export function constrainAspectRatio(
    width: number,
    height: number,
    originalWidth: number,
    originalHeight: number
): { width: number; height: number } {
    const aspectRatio = originalWidth / originalHeight;

    if (width / height > aspectRatio) {
        width = height * aspectRatio;
    } else {
        height = width / aspectRatio;
    }

    return { width, height };
}

// ============ LAYER RENDERING ============

/**
 * Render a text layer to canvas
 */
export function renderTextLayer(
    ctx: CanvasRenderingContext2D,
    layer: TextLayer,
    zoom: number = 1
): void {
    const { transform, content, fontSize, fontFamily, fontWeight, fontStyle, color, backgroundColor, textAlign, lineHeight } = layer;

    ctx.save();

    // Apply transform
    ctx.globalAlpha = layer.opacity;
    ctx.translate(transform.x * zoom, transform.y * zoom);
    ctx.rotate((transform.rotation * Math.PI) / 180);
    ctx.scale(transform.scaleX, transform.scaleY);

    // Background
    if (backgroundColor && backgroundColor !== 'transparent') {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, transform.width * zoom, transform.height * zoom);
    }

    // Text
    ctx.font = `${fontStyle} ${fontWeight} ${fontSize * zoom}px ${fontFamily}`;
    ctx.fillStyle = color;
    // Canvas doesn't support 'justify', map to 'left'
    ctx.textAlign = textAlign === 'justify' ? 'left' : textAlign as CanvasTextAlign;
    ctx.textBaseline = 'top';

    // Word wrap
    const lines = wrapText(ctx, content, transform.width * zoom);
    const lineHeightPx = fontSize * lineHeight * zoom;

    lines.forEach((line, index) => {
        const x = textAlign === 'center' ? (transform.width * zoom) / 2 : textAlign === 'right' ? transform.width * zoom : 0;
        const y = index * lineHeightPx;
        ctx.fillText(line, x, y);
    });

    ctx.restore();
}

/**
 * Wrap text to fit width
 */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const metrics = ctx.measureText(testLine);

        if (metrics.width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }

    if (currentLine) {
        lines.push(currentLine);
    }

    return lines;
}

/**
 * Render an image layer to canvas
 */
export function renderImageLayer(
    ctx: CanvasRenderingContext2D,
    layer: ImageLayer,
    imageCache: Map<string, HTMLImageElement>,
    zoom: number = 1
): void {
    const img = imageCache.get(layer.src);
    if (!img) return;

    ctx.save();

    // Apply transform
    ctx.globalAlpha = layer.opacity;
    ctx.translate(layer.transform.x * zoom, layer.transform.y * zoom);
    ctx.rotate((layer.transform.rotation * Math.PI) / 180);

    // Apply flip
    if (layer.flipX || layer.flipY) {
        ctx.scale(layer.flipX ? -1 : 1, layer.flipY ? -1 : 1);
        ctx.translate(
            layer.flipX ? -layer.transform.width * zoom : 0,
            layer.flipY ? -layer.transform.height * zoom : 0
        );
    }

    // Apply filters
    const { brightness, contrast, saturation, blur, grayscale } = layer.filters;
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px) grayscale(${grayscale})`;

    // Draw image
    if (layer.cropData) {
        const { x, y, width, height } = layer.cropData;
        ctx.drawImage(
            img,
            x, y, width, height,
            0, 0, layer.transform.width * zoom, layer.transform.height * zoom
        );
    } else {
        ctx.drawImage(img, 0, 0, layer.transform.width * zoom, layer.transform.height * zoom);
    }

    ctx.filter = 'none';
    ctx.restore();
}

/**
 * Render a shape layer to canvas
 */
export function renderShapeLayer(
    ctx: CanvasRenderingContext2D,
    layer: ShapeLayer,
    zoom: number = 1
): void {
    ctx.save();

    // Apply transform
    ctx.globalAlpha = layer.opacity;
    ctx.translate(layer.transform.x * zoom, layer.transform.y * zoom);
    ctx.rotate((layer.transform.rotation * Math.PI) / 180);

    ctx.fillStyle = layer.fill;
    ctx.strokeStyle = layer.stroke;
    ctx.lineWidth = layer.strokeWidth * zoom;

    const w = layer.transform.width * zoom;
    const h = layer.transform.height * zoom;

    switch (layer.shapeType) {
        case 'rectangle':
            if (layer.cornerRadius) {
                roundRect(ctx, 0, 0, w, h, layer.cornerRadius * zoom);
            } else {
                ctx.fillRect(0, 0, w, h);
                ctx.strokeRect(0, 0, w, h);
            }
            break;

        case 'circle':
            ctx.beginPath();
            ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            break;

        case 'line':
            if (layer.startPoint && layer.endPoint) {
                ctx.beginPath();
                ctx.moveTo(layer.startPoint.x * zoom, layer.startPoint.y * zoom);
                ctx.lineTo(layer.endPoint.x * zoom, layer.endPoint.y * zoom);
                ctx.stroke();
            }
            break;

        case 'arrow':
            if (layer.startPoint && layer.endPoint) {
                drawArrow(
                    ctx,
                    layer.startPoint.x * zoom,
                    layer.startPoint.y * zoom,
                    layer.endPoint.x * zoom,
                    layer.endPoint.y * zoom,
                    (layer.arrowHeadSize || 10) * zoom
                );
            }
            break;
    }

    ctx.restore();
}

/**
 * Draw rounded rectangle
 */
function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

/**
 * Draw arrow
 */
function drawArrow(
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    headSize: number
): void {
    const angle = Math.atan2(toY - fromY, toX - fromX);

    // Line
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // Arrow head
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
        toX - headSize * Math.cos(angle - Math.PI / 6),
        toY - headSize * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
        toX - headSize * Math.cos(angle + Math.PI / 6),
        toY - headSize * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
}

/**
 * Render a drawing layer to canvas
 */
export function renderDrawingLayer(
    ctx: CanvasRenderingContext2D,
    layer: DrawingLayer,
    zoom: number = 1
): void {
    ctx.save();

    ctx.globalAlpha = layer.opacity;
    ctx.strokeStyle = layer.strokeColor;
    ctx.lineWidth = layer.strokeWidth * zoom;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const path of layer.paths) {
        if (path.points.length < 2) continue;

        ctx.beginPath();
        ctx.moveTo(path.points[0].x * zoom, path.points[0].y * zoom);

        for (let i = 1; i < path.points.length; i++) {
            ctx.lineTo(path.points[i].x * zoom, path.points[i].y * zoom);
        }

        ctx.stroke();
    }

    ctx.restore();
}

/**
 * Render layer based on type
 */
export function renderLayer(
    ctx: CanvasRenderingContext2D,
    layer: Layer,
    imageCache: Map<string, HTMLImageElement>,
    zoom: number = 1
): void {
    if (!layer.visible) return;

    if (isTextLayer(layer)) {
        renderTextLayer(ctx, layer, zoom);
    } else if (isImageLayer(layer)) {
        renderImageLayer(ctx, layer, imageCache, zoom);
    } else if (isShapeLayer(layer)) {
        renderShapeLayer(ctx, layer, zoom);
    } else if (isDrawingLayer(layer)) {
        renderDrawingLayer(ctx, layer, zoom);
    }
}

/**
 * Render selection box
 */
export function renderSelectionBox(
    ctx: CanvasRenderingContext2D,
    layer: Layer,
    zoom: number = 1
): void {
    const bounds = getLayerBounds(layer);
    const handles = getSelectionHandles(layer);

    ctx.save();

    // Selection outline
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2 / zoom;
    ctx.setLineDash([5 / zoom, 5 / zoom]);
    ctx.strokeRect(
        bounds.x * zoom,
        bounds.y * zoom,
        bounds.width * zoom,
        bounds.height * zoom
    );
    ctx.setLineDash([]);

    // Resize handles
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1 / zoom;

    Object.values(handles).forEach(handle => {
        ctx.fillRect(handle.x * zoom, handle.y * zoom, handle.width, handle.height);
        ctx.strokeRect(handle.x * zoom, handle.y * zoom, handle.width, handle.height);
    });

    ctx.restore();
}

// ============ LAYER CREATION HELPERS ============

/**
 * Create default text layer
 */
export function createTextLayer(pageNumber: number, x: number, y: number): Omit<TextLayer, 'id' | 'createdAt' | 'modifiedAt'> {
    return {
        type: 'text',
        pageNumber,
        name: 'Text Layer',
        visible: true,
        locked: false,
        opacity: 1,
        zIndex: 0,
        transform: {
            x,
            y,
            width: 200,
            height: 50,
            rotation: 0,
            scaleX: 1,
            scaleY: 1
        },
        content: 'Double click to edit',
        fontFamily: 'Arial, sans-serif',
        fontSize: 16,
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        color: '#000000',
        backgroundColor: 'transparent',
        textAlign: 'left',
        lineHeight: 1.4,
        letterSpacing: 0,
        isEditable: true,
        isEditing: false
    };
}

/**
 * Create default shape layer
 */
export function createShapeLayer(
    pageNumber: number,
    x: number,
    y: number,
    shapeType: 'rectangle' | 'circle' | 'arrow' | 'line'
): Omit<ShapeLayer, 'id' | 'createdAt' | 'modifiedAt'> {
    return {
        type: 'shape',
        pageNumber,
        name: `${shapeType.charAt(0).toUpperCase() + shapeType.slice(1)} Shape`,
        visible: true,
        locked: false,
        opacity: 1,
        zIndex: 0,
        transform: {
            x,
            y,
            width: 100,
            height: 100,
            rotation: 0,
            scaleX: 1,
            scaleY: 1
        },
        shapeType,
        fill: '#3b82f6',
        stroke: '#1e40af',
        strokeWidth: 2,
        cornerRadius: shapeType === 'rectangle' ? 0 : undefined
    };
}
