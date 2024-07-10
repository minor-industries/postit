import Vue from 'vue';
Vue.component('selection-box', {
    data() {
        return {
            startX: 0,
            startY: 0,
            endX: 0,
            endY: 0,
            isActive: false
        };
    },
    computed: {
        box() {
            const x = Math.min(this.startX, this.endX);
            const y = Math.min(this.startY, this.endY);
            const width = Math.abs(this.startX - this.endX);
            const height = Math.abs(this.startY - this.endY);
            return { x, y, width, height };
        }
    },
    methods: {
        startSelection(event) {
            this.isActive = true;
            const svgPoint = this.$parent.screenToSvgPoint(event.clientX, event.clientY);
            this.startX = (svgPoint.x - this.$parent.pan.translateX) / this.$parent.zoom.level;
            this.startY = (svgPoint.y - this.$parent.pan.translateY) / this.$parent.zoom.level;
            this.endX = this.startX;
            this.endY = this.startY;
        },
        updateSelection(event) {
            if (!this.isActive)
                return;
            const svgPoint = this.$parent.screenToSvgPoint(event.clientX, event.clientY);
            this.endX = (svgPoint.x - this.$parent.pan.translateX) / this.$parent.zoom.level;
            this.endY = (svgPoint.y - this.$parent.pan.translateY) / this.$parent.zoom.level;
        },
        endSelection(event) {
            if (!this.isActive)
                return;
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
