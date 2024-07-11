interface SvgPoint {
    x: number;
    y: number;
}


export class ZoomService {
    zoom = {level: 1};
    pan = {translateX: 0, translateY: 0};

    getScreenCenter(svg: SVGSVGElement): SvgPoint {
        // const svg = this.$refs.svgContainer as SVGSVGElement;
        const rect = svg.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        return {x: centerX, y: centerY};
    }

    handleZoom(svg: SVGSVGElement, zoomFactor: number,) {
        const c = this.getScreenCenter(svg);
        let oldZoom = this.zoom.level;
        let newZoom = oldZoom * (1 + zoomFactor);
        newZoom = Math.max(newZoom, 0.25);
        newZoom = Math.min(newZoom, 2);

        const x = this.pan.translateX;
        const y = this.pan.translateY;

        const newX = c.x + (newZoom / oldZoom) * (x - c.x);
        const newY = c.y + (newZoom / oldZoom) * (y - c.y);

        this.zoom.level = newZoom;
        this.pan.translateX = newX;
        this.pan.translateY = newY;
    }

    restoreZoomAndPan() {
        const storedZoomLevel = sessionStorage.getItem('zoomLevel');
        if (storedZoomLevel) {
            this.zoom.level = parseFloat(storedZoomLevel);
        }

        const storedPanTranslateX = sessionStorage.getItem('panTranslateX');
        if (storedPanTranslateX) {
            this.pan.translateX = parseFloat(storedPanTranslateX);
        }

        const storedPanTranslateY = sessionStorage.getItem('panTranslateY');
        if (storedPanTranslateY) {
            this.pan.translateY = parseFloat(storedPanTranslateY);
        }
    }

    groupTransform(): string {
        return `translate(${this.pan.translateX}, ${this.pan.translateY}) scale(${this.zoom.level})`;
    }
}
