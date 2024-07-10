import Vue from 'vue';

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

interface ParentComponent {
    screenToSvgPoint(x: number, y: number): SvgPoint;
    pan: {
        translateX: number;
        translateY: number;
    };
    zoom: {
        level: number;
    };
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
            this.startX = (svgPoint.x - this.$parent.pan.translateX) / this.$parent.zoom.level;
            this.startY = (svgPoint.y - this.$parent.pan.translateY) / this.$parent.zoom.level;
            this.endX = this.startX;
            this.endY = this.startY;
        },
        updateSelection(this: SelectionBoxInstance, event: MouseEvent) {
            if (!this.isActive) return;
            const svgPoint: SvgPoint = this.$parent.screenToSvgPoint(event.clientX, event.clientY);
            this.endX = (svgPoint.x - this.$parent.pan.translateX) / this.$parent.zoom.level;
            this.endY = (svgPoint.y - this.$parent.pan.translateY) / this.$parent.zoom.level;
        },
        endSelection(this: SelectionBoxInstance, event: MouseEvent) {
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
