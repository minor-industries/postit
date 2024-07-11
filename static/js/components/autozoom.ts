export interface BoundingBox {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

interface ScreenDimensions {
    width: number;
    height: number;
}

function calculateBoundingBox(objects: BoundingBox[]): BoundingBox {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    objects.forEach(obj => {
        minX = Math.min(minX, obj.minX);
        minY = Math.min(minY, obj.minY);
        maxX = Math.max(maxX, obj.maxX);
        maxY = Math.max(maxY, obj.maxY);
    });
    return {minX, minY, maxX, maxY};
}

function calculateOptimalZoomAndPan({boundingBox, screen, maxZoom = 2, padding = 20}: {
    boundingBox: BoundingBox,
    screen: ScreenDimensions,
    maxZoom?: number,
    padding?: number
}): {
    zoom: number,
    panX: number,
    panY: number
} {
    const bboxWidth = boundingBox.maxX - boundingBox.minX;
    const bboxHeight = boundingBox.maxY - boundingBox.minY;

    const availableWidth = screen.width - padding * 2;
    const availableHeight = screen.height - padding * 2;

    const zoomX = availableWidth / bboxWidth;
    const zoomY = availableHeight / bboxHeight;

    const zoom = Math.min(zoomX, zoomY, maxZoom);

    const panX = (screen.width - bboxWidth * zoom) / 2 - boundingBox.minX * zoom;
    const panY = (screen.height - bboxHeight * zoom) / 2 - boundingBox.minY * zoom;

    return {zoom, panX, panY};
}

export function calculateZoom(
    boundingBoxes: BoundingBox[],
    maxZoom: number,
    padding: number
) {
    const boundingBox = calculateBoundingBox(boundingBoxes);
    const screen = {
        width: window.innerWidth,
        height: window.innerHeight,
    };

    return calculateOptimalZoomAndPan({
        boundingBox: boundingBox,
        screen: screen,
        maxZoom,
        padding,
    });
}
