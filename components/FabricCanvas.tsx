import React, { useRef, useEffect } from 'react';
import * as fabric from 'fabric';

interface FabricCanvasProps {
    width: number;
    height: number;
    onMount: (canvas: fabric.Canvas) => void;
}

const FabricCanvas: React.FC<FabricCanvasProps> = React.memo(({ width, height, onMount }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasInstanceRef = useRef<fabric.Canvas | null>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container || !width || !height) return;

        // Clean up any existing content in the container to start fresh
        container.innerHTML = '';

        // Create new canvas element
        const canvasEl = document.createElement('canvas');
        canvasEl.id = 'fabric-canvas';
        // Set explicit dimensions on the canvas element
        canvasEl.width = width;
        canvasEl.height = height;

        container.appendChild(canvasEl);

        // Initialize Fabric
        const fabricCanvas = new fabric.Canvas(canvasEl, {
            selection: true,
            preserveObjectStacking: true,
            width,
            height,
        });

        canvasInstanceRef.current = fabricCanvas;

        // Notify parent
        onMount(fabricCanvas);

        return () => {
            fabricCanvas.dispose();
            canvasInstanceRef.current = null;
            if (container) container.innerHTML = '';
        };
    }, [width, height, onMount]);

    return (
        <div
            ref={containerRef}
            className="absolute top-0 left-0"
            style={{
                width,
                height,
                zIndex: 10,
                pointerEvents: 'auto'
            }}
        />
    );
}, (prevProps, nextProps) => {
    // Only re-render if dimensions change significantly
    return prevProps.width === nextProps.width && prevProps.height === nextProps.height;
});

export default FabricCanvas;
