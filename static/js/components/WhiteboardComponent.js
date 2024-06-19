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
                movementThreshold: 5,
            },
            dragging: {
                note: null,
                inProgress: false,
            }
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
        addNoteAt(x, y) {
            const newNote = {
                id: Date.now(),
                text: 'New Note',
                x: x - 50,
                y: y - 25,
                width: 100,
                height: 50,
            };
            this.notes.push(newNote);
        },
        startPanOrClick(event) {
            // Check if dragging is in progress
            if (this.dragging.inProgress) return;

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
            if (Math.abs(dx) > this.pan.movementThreshold || Math.abs(dy) > this.pan.movementThreshold) {
                this.pan.translateX = this.pan.initialTranslateX + dx;
                this.pan.translateY = this.pan.initialTranslateY + dy;
            }
        },
        endPanOrClick(event) {
            document.removeEventListener('mousemove', this.onPan);
            document.removeEventListener('mouseup', this.endPanOrClick);

            this.pan.isPanning = false;

            // If it was a click (not a drag or pan), add a new note
            const dx = event.clientX - this.pan.startX;
            const dy = event.clientY - this.pan.startY;
            if (Math.abs(dx) <= this.pan.movementThreshold && Math.abs(dy) <= this.pan.movementThreshold) {
                const { x, y } = this.screenToLogical(event.clientX, event.clientY);
                this.addNoteAt(x, y);
            }
        },
        screenToLogical(clientX, clientY) {
            const svg = this.$refs.svgContainer;
            const point = svg.createSVGPoint();
            point.x = clientX;
            point.y = clientY;
            const svgPoint = point.matrixTransform(svg.getScreenCTM().inverse());

            return {
                x: (svgPoint.x - this.pan.translateX) / this.zoom.level,
                y: (svgPoint.y - this.pan.translateY) / this.zoom.level,
            };
        },
        dragStart(note) {
            this.dragging.inProgress = true;
            this.dragging.note = note;
        },
        drag(note, x, y) {
            note.x = x;
            note.y = y;
        },
        dragEnd(note) {
            this.dragging.inProgress = false;
            this.dragging.note = null;
        }
    },
    mounted() {
        // Ensure the component can receive keyboard events
        this.$refs.whiteboard.focus();
        window.addEventListener('keydown', this.handleKeydown);
    },
    beforeDestroy() {
        window.removeEventListener('keydown', this.handleKeydown);
    },
    template: `
        <div ref="whiteboard" class="whiteboard" tabindex="0">
            <svg ref="svgContainer" id="svgContainer" xmlns="http://www.w3.org/2000/svg"
                @mousedown="startPanOrClick">
                <g :transform="groupTransform">
                    <note-component v-for="note in notes" :key="note.id"
                                    :note="note"
                                    :onDragStart="dragStart"
                                    :onDrag="drag"
                                    :onDragEnd="dragEnd"></note-component>
                </g>
            </svg>
        </div>
    `
});
