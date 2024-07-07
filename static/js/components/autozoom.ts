import {Note} from "./NoteComponent";

interface BoundingBox {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

interface ScreenDimensions {
    width: number;
    height: number;
}

function calculateBoundingBox(notes: Note[]): BoundingBox {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    notes.forEach(note => {
        minX = Math.min(minX, note.x);
        minY = Math.min(minY, note.y);
        maxX = Math.max(maxX, note.x + note.width);
        maxY = Math.max(maxY, note.y + note.height);
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
    notes: Note[],
    maxZoom: number,
    padding: number
) {
    const boundingBox = calculateBoundingBox(notes);
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

