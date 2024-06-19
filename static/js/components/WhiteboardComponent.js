Vue.component('whiteboard-component', {
    data() {
        return {
            notes: [],
            zoom: {
                level: 1,
            },
            pan: {
                translateX: 0,
                translateY: 0,
                isPanning: false,
                startX: 0,
                startY: 0,
                initialTranslateX: 0,
                initialTranslateY: 0,
            },
            dragging: {
                note: null,
                startX: 0,
                startY: 0,
                initialX: 0,
                initialY: 0,
                inProgress: false,
            },
            isDragging: false
        };
    },
    computed: {
        groupTransform() {
            return `translate(${this.pan.translateX}, ${this.pan.translateY}) scale(${this.zoom.level})`;
        },
    },
    methods: {
        handleKeydown(event) {
            const zoomFactor = 0.1;
            if (event.key === '+' || event.key === '=') {
                this.zoom.level += zoomFactor;
            } else if (event.key === '-') {
                this.zoom.level = Math.max(0.1, this.zoom.level - zoomFactor);
            }
        },
        addNoteAt(event) {
            if (!this.isDragging) { // Only add note if not dragging
                const svgPoint = this.screenToSvgPoint(event.clientX, event.clientY);
                const newNote = {
                    id: Date.now(),
                    text: 'New Note',
                    x: (svgPoint.x - this.pan.translateX) / this.zoom.level - 50,
                    y: (svgPoint.y - this.pan.translateY) / this.zoom.level - 25,
                    width: 100,
                    height: 50,
                };
                this.notes.push(newNote);
            }
            this.isDragging = false; // Reset the flag after attempting to add a note
        },
        startPanOrClick(event) {
            this.pan.isPanning = true;
            this.pan.startX = event.clientX;
            this.pan.startY = event.clientY;
            this.pan.initialTranslateX = this.pan.translateX;
            this.pan.initialTranslateY = this.pan.translateY;
            document.addEventListener('mousemove', this.onPan);
            document.addEventListener('mouseup', this.endPanOrClick);
        },
        onPan(event) {
            if (!this.pan.isPanning) return;
            const dx = event.clientX - this.pan.startX;
            const dy = event.clientY - this.pan.startY;
            this.pan.translateX = this.pan.initialTranslateX + dx;
            this.pan.translateY = this.pan.initialTranslateY + dy;
        },
        endPanOrClick(event) {
            document.removeEventListener('mousemove', this.onPan);
            document.removeEventListener('mouseup', this.endPanOrClick);
            this.pan.isPanning = false;
            const dx = event.clientX - this.pan.startX;
            const dy = event.clientY - this.pan.startY;
            if (Math.abs(dx) <= 5 && Math.abs(dy) <= 5 && !this.isDragging) {
                this.addNoteAt(event);
            }
        },
        startDrag(note, startX, startY) {
            this.isDragging = true; // Set the flag to indicate a drag is in progress
            this.dragging.inProgress = true;
            this.dragging.note = note;
            this.dragging.startX = startX;
            this.dragging.startY = startY;
            this.dragging.initialX = note.x;
            this.dragging.initialY = note.y;
        },
        moveDrag(note, dx, dy) {
            if (!this.dragging.inProgress) return;
            note.x += dx / this.zoom.level;
            note.y += dy / this.zoom.level;
        },
        endDrag(note) {
            this.dragging.inProgress = false;
            setTimeout(() => { this.isDragging = false }, 0); // Delay resetting the flag to ensure the mouseup is processed
        },
        screenToSvgPoint(clientX, clientY) {
            const svg = this.$refs.svgContainer;
            const point = svg.createSVGPoint();
            point.x = clientX;
            point.y = clientY;
            return point.matrixTransform(svg.getScreenCTM().inverse());
        }
    },
    mounted() {
        this.$refs.whiteboard.focus();
        window.addEventListener('keydown', this.handleKeydown);
    },
    beforeDestroy() {
        window.removeEventListener('keydown', this.handleKeydown);
    },
    template: `
        <div ref="whiteboard" class="whiteboard" tabindex="0" @mousedown="startPanOrClick">
            <svg ref="svgContainer" id="svgContainer" xmlns="http://www.w3.org/2000/svg">
                <g :transform="groupTransform">
                    <note-component v-for="note in notes" :key="note.id"
                                    :note="note"
                                    @drag-start="startDrag"
                                    @drag-move="moveDrag"
                                    @drag-end="endDrag"></note-component>
                </g>
            </svg>
        </div>
    `
});
