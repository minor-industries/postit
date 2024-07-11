import Vue from 'vue';

import {TextMeasurer} from "./Util.js";
import {changeNoteColor} from "./ColorChanger.js";
import {textInput} from "./EditNote.js";
import {CouchClient, Document} from "./CouchClient.js";
import {getBoundingBox, Note} from "./NoteComponent.js";
import {ZoomService} from "./ZoomService.js";
import {NoteService} from "./NoteService.js";

declare const vex: any; //TODO
declare const interact: any // TODO

const dbname = "whiteboard-main"

declare global {
    interface Window {
        PouchDB: any;
    }
}

interface SelectionBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface WhiteboardComponentData {
    isDragging: boolean;
    isDialogOpen: boolean;
    zoomService: ZoomService;
    noteService: NoteService;
}

function getCurrentBoard() {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    return params.get('board') || "main";
}

export default Vue.extend({
    name: 'WhiteboardComponent',
    data(): WhiteboardComponentData {
        return {
            isDragging: false,
            isDialogOpen: false,
            zoomService: new ZoomService(),
            noteService: new NoteService({
                db: null,
                currentBoard: getCurrentBoard(),
                textMeasure: new TextMeasurer(),
            })
        };
    },
    computed: {
        groupTransform(): string {
            return this.zoomService.groupTransform();
        },
    },
    methods: {
        handleZoom(zoomFactor: number) {
            const svg = this.$refs.svgContainer as SVGSVGElement;
            this.zoomService.handleZoom(svg, zoomFactor);
        },

        async handleKeydown(event: KeyboardEvent) {
            const target = event.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return;
            }

            const zoomFactor = 0.05;

            if (event.key === '+' || event.key === '=') {
                event.preventDefault();
                this.handleZoom(zoomFactor);
            } else if (event.key === '-') {
                event.preventDefault();
                this.handleZoom(-zoomFactor);
            } else if (event.key === 's') {
                event.preventDefault();
                await this.noteService.saveNotes();
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
                this.noteService.notes.forEach(note => {
                    if (note.selected) {
                        note.color = value.color;
                        note.textColor = value.textColor;
                    }
                });
            } else if (event.key === 'e') {
                event.preventDefault();
                await this.oneDialog(this.handleEditNote);
            } else if (event.key === 'a') {
                this.noteService.align();
            } else if (event.key === 'b') {
                event.preventDefault();
                this.runAction();
            } else if (event.key === 'h') {
                this.noteService.horizontalAlign();
            } else if (event.key === 'z') {
                this.fitNotesToScreen();
            }
        },

        async runAction() {
            const action = await textInput('action:', '');
            if (!action) {
                return;
            }
            const selected = this.noteService.notes.filter(note => note.selected);

            switch (action) {
                case "fix-width":
                    this.noteService.fixWidth();
                    return;
                case "export":
                    for (let i = 0; i < selected.length; i++) {
                        const note = selected[i];
                        await this.noteService.putNote(note);
                    }
                    return
                case "show":
                    selected.forEach(note => {
                        console.log(JSON.stringify(note, null, 2));
                    })
                    return;
                case "change-board":
                    const value = await textInput('new board name:', '');
                    if (!value) {
                        return;
                    }
                    selected.forEach(note => {
                        note.board = value;
                    })
                    return;
                case "dirty":
                    selected.forEach(note => {
                        note.dirty = true;
                    })
                    return;
                default:
                    console.log(`unknown command: ${action}`)
            }
        },

        async oneDialog(callback: () => Promise<any>) {
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

        async handleEditNote() {
            const selectedNotes = this.noteService.notes.filter(note => note.selected);
            if (selectedNotes.length !== 1) {
                vex.dialog.alert({message: 'Please select exactly one note to edit.'});
                return;
            }
            const note = selectedNotes[0];
            const newText = await textInput('Edit Note Text', note.text);
            if (newText === null) {
                return;
            }
            note.text = newText;
            note.width = this.noteService.calcWidth(newText);
        },

        async addNoteAt(event: MouseEvent) {
            const newText = await textInput('New Note', '');
            if (!newText) {
                return;
            }
            const svgPoint = this.screenToSvgPoint(event.clientX, event.clientY);
            const x = (svgPoint.x - this.zoomService.panX) / this.zoomService.zoom;
            const y = (svgPoint.y - this.zoomService.panY) / this.zoomService.zoom;

            this.noteService.addNoteAt(x, y, newText, this);
        },

        async addMulti(event: MouseEvent) {
            const svgPoint = this.screenToSvgPoint(event.clientX, event.clientY);
            const newText = await textInput('Add Multiple', '', true);

            if (newText === null) {
                return;
            }

            const lines = newText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            let y = (svgPoint.y - this.zoomService.panY) / this.zoomService.zoom;
            let x = (svgPoint.x - this.zoomService.panX) / this.zoomService.zoom - 50;

            lines.forEach((line, index) => {
                let text = line.trim();
                this.noteService.addNoteAt(x, y, text, this);
                y += 60
            });
        },

        async handleDoubleClick(event: MouseEvent) {
            if (event.shiftKey) {
                await this.addMulti(event);
            } else {
                await this.addNoteAt(event);
            }
        },

        screenToSvgPoint(clientX: number, clientY: number): { x: number, y: number } {
            const svg = this.$refs.svgContainer as SVGSVGElement;
            const point = svg.createSVGPoint();
            point.x = clientX;
            point.y = clientY;
            return point.matrixTransform(svg.getScreenCTM()!.inverse());
        },

        updateNotePosition(note: Note, dx: number, dy: number) {
            if (note.selected) {
                this.noteService.notes.forEach(n => {
                    if (n.selected) {
                        n.x += dx / this.zoomService.zoom;
                        n.y += dy / this.zoomService.zoom;
                    }
                });
            } else {
                note.x += dx / this.zoomService.zoom;
                note.y += dy / this.zoomService.zoom;
            }
        },

        handleSelectNotes(selectionBox: SelectionBox) {
            this.noteService.notes.forEach(note => {
                const selected = (
                    note.x + note.width >= selectionBox.x &&
                    note.x <= selectionBox.x + selectionBox.width &&
                    note.y + note.height >= selectionBox.y &&
                    note.y <= selectionBox.y + selectionBox.height
                );
                note.selected = selected;
            });
        },

        selectNoteHandler(selectedNote: Note) {
            this.noteService.notes.forEach(note => {
                note.selected = note.id === selectedNote.id;
            });
        },

        handleNoteDragEnd() {
            this.isDragging = false;
        },

        unselectAllNotes() {
            this.noteService.notes.forEach(note => {
                note.selected = false;
            });
        },

        deleteSelectedNotes() {
            let toDelete = this.noteService.notes.filter(note => note.selected);
            this.noteService.notes = this.noteService.notes.filter(note => !note.selected);

            this.noteService.toDelete.push(...toDelete);
            toDelete.forEach(note => {
                note.selected = false;
            });
        },

        handleMouseDown(event: MouseEvent) {
            if (event.shiftKey) {
                this.handleShiftMouseDown(event);
            } else {
                // Normal mouse down behavior, possibly dragging notes
            }
        },

        handleShiftMouseDown(event: MouseEvent) {
            if (event.shiftKey) {
                event.preventDefault();
                (this.$refs as any).selectionBox.startSelection(event);
            }
        },

        handleMouseMove(event: MouseEvent) {
            if ((this.$refs as any).selectionBox.isActive) {
                (this.$refs as any).selectionBox.updateSelection(event);
            }
        },

        handleMouseUp(event: MouseEvent) {
            if ((this.$refs as any).selectionBox.isActive) {
                (this.$refs as any).selectionBox.endSelection(event);
            }
        },

        fitNotesToScreen(maxZoom: number = 0.7, padding: number = 20) {
            if (this.noteService.notes.length === 0) {
                return;
            }
            this.zoomService.calculateZoom(
                this.noteService.notes.map(getBoundingBox),
                maxZoom,
                padding
            );
        }
    },

    async mounted() {
        this.noteService.db = new CouchClient(dbname, (kind: string, doc: Document) => {
            this.noteService.couchCallback(kind, doc, this);
        });

        (this.$refs as any).whiteboard.focus();
        window.addEventListener('keydown', this.handleKeydown);

        interact(this.$refs.svgContainer).draggable({
            listeners: {
                move: (event: any) => {
                    if (event.shiftKey) {
                        return;
                    }
                    this.isDragging = true;
                    this.zoomService.panX += event.dx;
                    this.zoomService.panY += event.dy;
                },
                end: () => {
                    this.isDragging = false;
                }
            }
        });

        this.zoomService.restoreZoomAndPan();
        await this.noteService.db.subscribe();
        await this.noteService.db.loadDocs();
    },

    beforeDestroy() {
        window.removeEventListener('keydown', this.handleKeydown);
    },

    template: `
      <div ref="whiteboard" class="whiteboard"
           :style="{ cursor: isDragging ? 'grabbing' : 'default' }"
           tabindex="0"
           @dblclick="handleDoubleClick"
           @mousedown="handleMouseDown">
        <svg ref="svgContainer" id="svgContainer" xmlns="http://www.w3.org/2000/svg"
             @mousemove="handleMouseMove" @mouseup="handleMouseUp">
          <g :transform="groupTransform">

            <!-- Origin crosshair (+ sign) -->
            <line x1="-10" y1="0" x2="10" y2="0" stroke="grey" stroke-width="2"/>
            <line x1="0" y1="-10" x2="0" y2="10" stroke="grey" stroke-width="2"/>

            <note-component v-for="note in noteService.notes"
                            :key="note.id"
                            :note="note"
                            :ref="'note-' + note.id"
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