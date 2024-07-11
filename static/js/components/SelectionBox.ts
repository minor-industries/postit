import Vue from 'vue';
import { ZoomService } from './ZoomService';

interface SvgPoint {
    x: number;
    y: number;
}

interface Box {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface ParentComponent extends Vue {
    screenToSvgPoint(x: number, y: number): SvgPoint;
    zoomService: ZoomService;
}

interface SelectionBoxData {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    isActive: boolean;
}

export type SelectionBoxInstance = SelectionBoxData & {
    $parent: ParentComponent;
    $emit(event: string, ...args: any[]): void;
    box: Box;
};

Vue.component('selection-box', {
    data(): SelectionBoxData {
        return {
            startX: 0,
            startY: 0,
            endX: 0,
            endY: 0,
            isActive: false
        };
    },
    computed: {
        box(this: SelectionBoxInstance): Box {
            const x = Math.min(this.startX, this.endX);
            const y = Math.min(this.startY, this.endY);
            const width = Math.abs(this.startX - this.endX);
            const height = Math.abs(this.startY - this.endY);
            return { x, y, width, height };
        }
    },
    methods: {
        startSelection(this: SelectionBoxInstance, event: MouseEvent) {
            this.isActive = true;
            const svgPoint: SvgPoint = this.$parent.screenToSvgPoint(event.clientX, event.clientY);
            const zoomService = this.$parent.zoomService;
            this.startX = (svgPoint.x - zoomService.panX) / zoomService.zoom;
            this.startY = (svgPoint.y - zoomService.panY) / zoomService.zoom;
            this.endX = this.startX;
            this.endY = this.startY;
        },
        updateSelection(this: SelectionBoxInstance, event: MouseEvent) {
            if (!this.isActive) return;
            const svgPoint: SvgPoint = this.$parent.screenToSvgPoint(event.clientX, event.clientY);
            const zoomService = this.$parent.zoomService;
            this.endX = (svgPoint.x - zoomService.panX) / zoomService.zoom;
            this.endY = (svgPoint.y - zoomService.panY) / zoomService.zoom;
        },
        endSelection(this: SelectionBoxInstance) {
            if (!this.isActive) return;
            this.isActive = false;
            this.$emit('select-notes', this.box);
        }
    },
    template: `
      <g v-if="isActive">
        <rect :x="box.x" :y="box.y" :width="box.width" :height="box.height" fill="none" stroke="blue" />
      </g>
    `
});
