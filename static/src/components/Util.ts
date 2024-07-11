import {Note} from "./NoteComponent.js";
import { Notyf } from 'notyf';
import 'notyf/notyf.min.css';

export function nearbyColor(x: number, y: number, notes: Note[], defaultColor: string = 'white'): string {
    const colorSums: { [color: string]: number } = {};

    notes.forEach(note => {
        const noteCenterX = note.x + note.width / 2;
        const noteCenterY = note.y + note.height / 2;
        const dx = noteCenterX - x;
        const dy = noteCenterY - y;
        const distanceSquared = dx * dx + dy * dy;
        const inverseSquareDistance = 1 / (1 + distanceSquared); // Adding 1 to avoid divide by zero

        if (note.color) {
            if (!colorSums[note.color]) {
                colorSums[note.color] = 0;
            }
            colorSums[note.color] += inverseSquareDistance;
        }
    });

    let maxColor = defaultColor;
    let maxSum = -Infinity;
    for (const color in colorSums) {
        if (colorSums[color] > maxSum) {
            maxSum = colorSums[color];
            maxColor = color;
        }
    }

    return maxColor;
}

export function showNotification(type: 'success' | 'error', message: string) {
    switch (type) {
        case "success":
            new Notyf().success(message);
            return;
        case "error":
            new Notyf().error(message);
            return;
        default:
            new Notyf().error("unknown alert type");
            return;
    }
}

export class TextMeasurer {
    private offscreenCanvas: HTMLCanvasElement;
    private offscreenCtx: CanvasRenderingContext2D;

    constructor() {
        this.offscreenCanvas = document.createElement('canvas');
        const ctx = this.offscreenCanvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get 2D context');
        }
        this.offscreenCtx = ctx;
    }

    measureTextWidth(text: string, font: string): number {
        this.clearCanvas();
        this.offscreenCtx.font = font; // Set the desired font properties
        const width = this.offscreenCtx.measureText(text).width;
        this.clearCanvas();
        return width;
    }

    private clearCanvas(): void {
        this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
    }
}
