Vue.component('whiteboard-component', {
    data() {
        return {
            notes: [],
            zoomLevel: 1,
            translateX: 0,
            translateY: 0,
            draggingNote: null,
            isPanning: false,
            panStartX: 0,
            panStartY: 0,
            initialTranslateX: 0,
            initialTranslateY: 0,
            isPanningActive: false,
            isMouseDown: false,
            mouseDownStartX: 0,
            mouseDownStartY: 0,
            movementThreshold: 5
        };
    },
    computed: {
        groupTransform() {
            return `translate(${this.translateX}, ${this.translateY}) scale(${this.zoomLevel})`;
        },
    },
    methods: {
        handleKeydown(event) {
            const zoomFactor = 0.1;
            if (event.key === '+' || event.key === '=') {
                this.zoomLevel += zoomFactor;
            } else if (event.key === '-') {
                this.zoomLevel = Math.max(0.1, this.zoomLevel - zoomFactor);
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
            this.isMouseDown = true;
            this.mouseDownStartX = event.clientX;
            this.mouseDownStartY = event.clientY;

            // Check if the mousedown event happened on text
            if (event.target.tagName === 'text') return;

            this.isPanning = true;
            this.isPanningActive = false;
            this.panStartX = event.clientX;
            this.panStartY = event.clientY;
            this.initialTranslateX = this.translateX;
            this.initialTranslateY = this.translateY;
            document.addEventListener('mousemove', this.onPan);
            document.addEventListener('mouseup', this.endPanOrClick);
        },
        onPan(event) {
            if (!this.isPanning) return;

            const dx = event.clientX - this.panStartX;
            const dy = event.clientY - this.panStartY;
            if (Math.abs(dx) > this.movementThreshold || Math.abs(dy) > this.movementThreshold) {
                this.isPanningActive = true;
            }
            this.translateX = this.initialTranslateX + dx;
            this.translateY = this.initialTranslateY + dy;
        },
        endPanOrClick(event) {
            document.removeEventListener('mousemove', this.onPan);
            document.removeEventListener('mouseup', this.endPanOrClick);

            this.isMouseDown = false;

            // If it was a click (not a drag or pan), add a new note
            const dx = event.clientX - this.mouseDownStartX;
            const dy = event.clientY - this.mouseDownStartY;
            if (Math.abs(dx) <= this.movementThreshold && Math.abs(dy) <= this.movementThreshold) {
                const { x, y } = this.screenToLogical(event.clientX, event.clientY);
                this.addNoteAt(x, y);
            }

            this.isPanning = false;
            this.isPanningActive = false;
        },
        screenToLogical(clientX, clientY) {
            const svg = this.$refs.svgContainer;
            const point = svg.createSVGPoint();
            point.x = clientX;
            point.y = clientY;
            const svgPoint = point.matrixTransform(svg.getScreenCTM().inverse());

            return {
                x: (svgPoint.x - this.translateX) / this.zoomLevel,
                y: (svgPoint.y - this.translateY) / this.zoomLevel,
            };
        },
        dragStart(note) {
            this.draggingNote = note;
        },
        drag(note, x, y) {
            note.x = x;
            note.y = y;
        },
        dragEnd(note) {
            this.draggingNote = null;
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
