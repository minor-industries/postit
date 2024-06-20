import {notes} from "./seed.js"

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
            },
            isDragging: false,
        };
    },
    computed: {
        groupTransform() {
            return `translate(${this.pan.translateX}, ${this.pan.translateY}) scale(${this.zoom.level})`;
        },
    },
    methods: {
        saveNotes() {
            localStorage.setItem("notes", JSON.stringify(this.notes, null, 2));
        },

        loadNotes() {
            const notes = localStorage.getItem("notes");
            if (!notes) {
                return;
            }
            this.notes = JSON.parse(notes);
        },

        seedNotes() {
            let y = 0
            notes.forEach(note => {
                this.notes.push({
                    id: Date.now(),
                    text: note,
                    x: 10,
                    y: y += 55,
                    width: 10 * note.length + 10,
                    height: 50,
                });
            });
        },

        handleKeydown(event) {
            const zoomFactor = 0.1;
            if (event.key === '+' || event.key === '=') {
                this.zoom.level += zoomFactor;
            } else if (event.key === '-') {
                this.zoom.level = Math.max(0.1, this.zoom.level - zoomFactor);
            } else if (event.key === 's') {
                this.saveNotes();
            } else if (event.key === 'e') {
                this.seedNotes();
            } else if (event.key === 'l') {
                this.loadNotes();
            }
        },
        addNoteAt(event) {
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
        },
        screenToSvgPoint(clientX, clientY) {
            const svg = this.$refs.svgContainer;
            const point = svg.createSVGPoint();
            point.x = clientX;
            point.y = clientY;
            return point.matrixTransform(svg.getScreenCTM().inverse());
        },
        updateNotePosition(note, dx, dy) {
            note.x += dx / this.zoom.level;
            note.y += dy / this.zoom.level;
        }
    },
    mounted() {
        this.$refs.whiteboard.focus();
        window.addEventListener('keydown', this.handleKeydown);

        interact(this.$refs.svgContainer).draggable({
            listeners: {
                move: (event) => {
                    this.isDragging = true;
                    this.pan.translateX += event.dx;
                    this.pan.translateY += event.dy;
                },
                end: () => {
                    this.isDragging = false;
                }
            }
        });

        this.loadNotes();
    },
    beforeDestroy() {
        window.removeEventListener('keydown', this.handleKeydown);
    },
    template: `
        <div ref="whiteboard" class="whiteboard" 
             :style="{ cursor: isDragging ? 'grabbing' : 'default' }" 
             tabindex="0" 
             @dblclick="addNoteAt">
            <svg ref="svgContainer" id="svgContainer" xmlns="http://www.w3.org/2000/svg">
                <g :transform="groupTransform">
                    <note-component v-for="note in notes" 
                                    :key="note.id" 
                                    :note="note" 
                                    @drag-start="isDragging = true"
                                    @drag-move="updateNotePosition(note, $event.dx, $event.dy)"
                                    @drag-end="isDragging = false"></note-component>
                </g>
            </svg>
        </div>
    `
});
