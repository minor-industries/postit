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

export class ZoomService {
    constructor(board: string) {
        this.board = board;
    }

    private board: string;

    private _zoom: number = 1;
    private _panX: number = 0;
    private _panY: number = 0;

    get zoom(): number {
        return this._zoom;
    }

    set zoom(value: number) {
        this._zoom = value;
        sessionStorage.setItem(`${this.board}-zoom`, value.toString());
    }

    get panX(): number {
        return this._panX;
    }

    set panX(value: number) {
        this._panX = value;
        sessionStorage.setItem(`${this.board}-panX`, value.toString());
    }

    get panY(): number {
        return this._panY;
    }

    set panY(value: number) {
        this._panY = value;
        sessionStorage.setItem(`${this.board}-panY`, value.toString());
    }

    handleZoom(svg: SVGSVGElement, zoomFactor: number) {
        const c = this.getScreenCenter(svg);
        let oldZoom = this.zoom;
        let newZoom = oldZoom * (1 + zoomFactor);
        newZoom = Math.max(newZoom, 0.25);
        newZoom = Math.min(newZoom, 2);

        const x = this.panX;
        const y = this.panY;

        const newX = c.x + (newZoom / oldZoom) * (x - c.x);
        const newY = c.y + (newZoom / oldZoom) * (y - c.y);

        this.zoom = newZoom;
        this.panX = newX;
        this.panY = newY;
    }

    private getScreenCenter(svg: SVGSVGElement) {
        const rect = svg.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        return {x: centerX, y: centerY};
    }

    get hasSavedSettings(): boolean {
        const value = sessionStorage.getItem(`${this.board}-zoom`);
        return value !== null;
    }

    restoreZoomAndPan() {
        const storedZoomLevel = sessionStorage.getItem(`${this.board}-zoom`);
        if (storedZoomLevel) {
            this.zoom = parseFloat(storedZoomLevel);
        }

        const storedPanTranslateX = sessionStorage.getItem(`${this.board}-panX`);
        if (storedPanTranslateX) {
            this.panX = parseFloat(storedPanTranslateX);
        }

        const storedPanTranslateY = sessionStorage.getItem(`${this.board}-panY`);
        if (storedPanTranslateY) {
            this.panY = parseFloat(storedPanTranslateY);
        }
    }

    private calculateBoundingBox(objects: BoundingBox[]): BoundingBox {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        objects.forEach(obj => {
            minX = Math.min(minX, obj.minX);
            minY = Math.min(minY, obj.minY);
            maxX = Math.max(maxX, obj.maxX);
            maxY = Math.max(maxY, obj.maxY);
        });
        return {minX, minY, maxX, maxY};
    }

    private calculateOptimalZoomAndPan({boundingBox, screen, maxZoom = 2, padding = 20}: {
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

    calculateZoom(
        boundingBoxes: BoundingBox[],
        maxZoom: number,
        padding: number
    ) {
        const boundingBox = this.calculateBoundingBox(boundingBoxes);
        const screen = {
            width: window.innerWidth, // TODO: don't like this being here
            height: window.innerHeight,
        };

        const {zoom, panX, panY} = this.calculateOptimalZoomAndPan({
            boundingBox: boundingBox,
            screen: screen,
            maxZoom,
            padding,
        });

        this.zoom = zoom;
        this.panX = panX;
        this.panY = panY;
    }

    groupTransform(): string {
        return `translate(${this.panX}, ${this.panY}) scale(${this.zoom})`;
    }
}



