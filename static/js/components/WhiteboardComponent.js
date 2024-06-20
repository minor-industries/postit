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
            this.notes = [];
            let y = 0
            notes.forEach(note => {
                this.notes.push({
                    id: uuid.v4(),
                    text: note,
                    x: 10,
                    y: y += 55,
                    width: 10 * note.length + 10,
                    height: 50,
                    selected: false,
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
            } else if (event.key === 'd') {
                this.deleteSelectedNotes();
            } else if (event.key === 'Escape') {
                this.unselectAllNotes();
            }
        },
        addNoteAt(event) {
            const svgPoint = this.screenToSvgPoint(event.clientX, event.clientY);
            const newNote = {
                id: uuid.v4(),
                text: 'New Note',
                x: (svgPoint.x - this.pan.translateX) / this.zoom.level - 50,
                y: (svgPoint.y - this.pan.translateY) / this.zoom.level - 25,
                width: 100,
                height: 50,
                selected: false,
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
            if (note.selected) {
                this.notes.forEach(n => {
                    if (n.selected) {
                        n.x += dx / this.zoom.level;
                        n.y += dy / this.zoom.level;
                    }
                });
            } else {
                note.x += dx / this.zoom.level;
                note.y += dy / this.zoom.level;
            }
        },
        handleSelectNotes(selectionBox) {
            this.notes.forEach(note => {
                const selected = (
                    note.x + note.width >= selectionBox.x &&
                    note.x <= selectionBox.x + selectionBox.width &&
                    note.y + note.height >= selectionBox.y &&
                    note.y <= selectionBox.y + selectionBox.height
                );
                if (selected) {
                    console.log("selected2", note.text);
                }
                note.selected = selected;
            });
        },
        selectNoteHandler(selectedNote) {
            this.notes.forEach(note => {
                note.selected = note.id === selectedNote.id;
            });
        },
        unselectAllNotes() {
            this.notes.forEach(note => {
                note.selected = false;
            });
        },
        deleteSelectedNotes() {
            this.notes = this.notes.filter(note => !note.selected);
        },
        handleShiftMouseDown(event) {
            if (event.shiftKey) {
                this.$refs.selectionBox.startSelection(event);
            }
        },
        handleMouseMove(event) {
            if (this.$refs.selectionBox.isActive) {
                this.$refs.selectionBox.updateSelection(event);
            }
        },
        handleMouseUp(event) {
            if (this.$refs.selectionBox.isActive) {
                this.$refs.selectionBox.endSelection(event);
            }
        }
    },
    mounted() {
        this.$refs.whiteboard.focus();
        window.addEventListener('keydown', this.handleKeydown);

        interact(this.$refs.svgContainer).draggable({
            listeners: {
                move: (event) => {
                    if (event.shiftKey) {
                        return; // Skip panning if shift key is pressed
                    }
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
             @dblclick="addNoteAt"
             @mousedown.shift="handleShiftMouseDown">
            <svg ref="svgContainer" id="svgContainer" xmlns="http://www.w3.org/2000/svg"
                @mousemove="handleMouseMove" @mouseup="handleMouseUp">
                <g :transform="groupTransform">
                    <note-component v-for="note in notes" 
                                    :key="note.id" 
                                    :note="note" 
                                    @select-note="selectNoteHandler"
                                    @drag-start="isDragging = true"
                                    @drag-move="updateNotePosition(note, $event.dx, $event.dy)"
                                    @drag-end="isDragging = false"></note-component>
                    <selection-box ref="selectionBox" @select-notes="handleSelectNotes"></selection-box>
                </g>
            </svg>
        </div>
    `
});