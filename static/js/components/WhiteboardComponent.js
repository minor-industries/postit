import {changeNoteColor} from "./ColorChanger.js";
import {editNoteText} from "./EditNote.js";
import {loadValue, saveValue} from "./Api.js";


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
            isDialogOpen: false,
        };
    },
    computed: {
        groupTransform() {
            return `translate(${this.pan.translateX}, ${this.pan.translateY}) scale(${this.zoom.level})`;
        },
    },
    methods: {
        async saveNotes() {
            console.log("save notes");
            await saveValue("notes", JSON.stringify(this.notes));
        },

        async loadNotes() {
            const json = await loadValue("notes");
            let notes = JSON.parse(json.value);
            notes.forEach(note => {
                if (!note.color) {
                    note.color = "yellow";
                    note.textColor = "black";
                }
            })

            this.notes = notes;
        },

        async handleKeydown(event) {
            const target = event.target;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return;
            }

            const zoomFactor = 0.1;
            if (event.key === '+' || event.key === '=') {
                event.preventDefault();
                this.zoom.level += zoomFactor;
            } else if (event.key === '-') {
                event.preventDefault();
                this.zoom.level = Math.max(0.1, this.zoom.level - zoomFactor);
            } else if (event.key === 's') {
                event.preventDefault();
                await this.saveNotes();
            } else if (event.key === 'l') {
                event.preventDefault();
                await this.loadNotes();
            } else if (event.key === 'd') {
                event.preventDefault();
                this.deleteSelectedNotes();
            } else if (event.key === 'Escape') {
                this.unselectAllNotes();
            } else if (event.key === 'c') {
                event.preventDefault();
                const value = await this.oneDialog(changeNoteColor);
                if (!value) {
                    return;
                }
                this.notes.forEach(note => {
                    if (note.selected) {
                        note.color = value.color;
                        note.textColor = value.textColor;
                    }
                })
            } else if (event.key === 'e') {
                event.preventDefault();
                await this.oneDialog(this.handleEditNote);
            }
        },

        async oneDialog(callback) {
            if (this.isDialogOpen) {
                return;
            }
            this.isDialogOpen = true;
            try {
                return await callback();
            } finally {
                this.isDialogOpen = false;
            }
        },

        handleEditNote() {
            const selectedNotes = this.notes.filter(note => note.selected);
            if (selectedNotes.length !== 1) {
                vex.dialog.alert({message: 'Please select exactly one note to edit.'});
            } else {
                const note = selectedNotes[0];
                editNoteText(note).then((newText) => {
                    console.log(newText)
                    if (newText === null) {
                        return;
                    }
                    note.text = newText;
                    note.width = 11 * note.text.length + 10;
                });
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
                isNoteDragging: false,
                color: "yellow",
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

        handleNoteDragEnd() {
            console.log("drag end");
            this.isDragging = false;
        },

        unselectAllNotes() {
            this.notes.forEach(note => {
                note.selected = false;
            });
        },

        deleteSelectedNotes() {
            this.notes = this.notes.filter(note => !note.selected);
        },

        handleMouseDown(event) {
            if (event.shiftKey) {
                this.handleShiftMouseDown(event);
            } else {
                // Normal mouse down behavior, possibly dragging notes
            }
        },

        handleShiftMouseDown(event) {
            if (event.shiftKey) {
                event.preventDefault();
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
             @mousedown="handleMouseDown">
            <svg ref="svgContainer" id="svgContainer" xmlns="http://www.w3.org/2000/svg"
                @mousemove="handleMouseMove" @mouseup="handleMouseUp">
                <g :transform="groupTransform">
                    <note-component v-for="note in notes" 
                                    :key="note.id" 
                                    :note="note" 
                                    @select-note="selectNoteHandler"
                                    @drag-start="isDragging = true"
                                    @drag-move="updateNotePosition(note, $event.dx, $event.dy)"
                                    @drag-end="handleNoteDragEnd"></note-component>
                    <selection-box ref="selectionBox" @select-notes="handleSelectNotes"></selection-box>
                </g>
            </svg>
        </div>
    `
});