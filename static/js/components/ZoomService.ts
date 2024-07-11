export class ZoomService {
    private _zoom: number = 1;
    private _panX: number = 0;
    private _panY: number = 0;

    get zoom(): number {
        return this._zoom;
    }

    set zoom(value: number) {
        this._zoom = value;
        sessionStorage.setItem('zoomLevel', value.toString());
    }

    get panX(): number {
        return this._panX;
    }

    set panX(value: number) {
        this._panX = value;
        sessionStorage.setItem('panTranslateX', value.toString());
    }

    get panY(): number {
        return this._panY;
    }

    set panY(value: number) {
        this._panY = value;
        sessionStorage.setItem('panTranslateY', value.toString());
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

    getScreenCenter(svg: SVGSVGElement) {
        const rect = svg.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        return { x: centerX, y: centerY };
    }

    restoreZoomAndPan() {
        const storedZoomLevel = sessionStorage.getItem('zoomLevel');
        if (storedZoomLevel) {
            this.zoom = parseFloat(storedZoomLevel);
        }

        const storedPanTranslateX = sessionStorage.getItem('panTranslateX');
        if (storedPanTranslateX) {
            this.panX = parseFloat(storedPanTranslateX);
        }

        const storedPanTranslateY = sessionStorage.getItem('panTranslateY');
        if (storedPanTranslateY) {
            this.panY = parseFloat(storedPanTranslateY);
        }
    }

    groupTransform(): string {
        return `translate(${this.panX}, ${this.panY}) scale(${this.zoom})`;
    }
}
