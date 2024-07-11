import Vue from 'vue';

import {nearbyColor, TextMeasurer} from "./Util.js";
import {changeNoteColor} from "./ColorChanger.js";
import {textInput} from "./EditNote.js";
import {loadValue} from "./Api.js";
import {getTextColorForBackground} from "./Colors.js";
import {CouchClient, Document} from "./CouchClient.js";
import {getBoundingBox, Note} from "./NoteComponent.js";
import {ZoomService} from "./ZoomService.js";

declare const vex: any; //TODO
declare const uuid: any; //TODO
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
    notes: Note[];
    toDelete: Note[];
    isDragging: boolean;
    isDialogOpen: boolean;
    textMeasure: TextMeasurer;
    db: CouchClient | null;
    currentBoard: string;
    zoomService: ZoomService;
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
            notes: [],
            toDelete: [],
            isDragging: false,
            isDialogOpen: false,
            textMeasure: new TextMeasurer(),
            db: null,
            currentBoard: getCurrentBoard(),
            zoomService: new ZoomService(),
        };
    },
    computed: {
        groupTransform(): string {
            return this.zoomService.groupTransform();
        },
    },
    methods: {
        async saveNotes() {
            const dirty = this.notes.filter(note => note.dirty);
            for (let i = 0; i < dirty.length; i++) {
                const note = dirty[i];
                await this.putNote(note);
                note.dirty = false;
            }

            for (let i = 0; i < this.toDelete.length; i++) {
                const note = this.toDelete[i];
                if (note._rev === undefined) {
                    continue;
                }
                await this.db!.delete(note);
            }

            this.toDelete = [];
        },

        async loadNotes() {
            const json = await loadValue("notes");
            this.notes = JSON.parse(json.value);
        },

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
                await this.saveNotes();
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
                });
            } else if (event.key === 'e') {
                event.preventDefault();
                await this.oneDialog(this.handleEditNote);
            } else if (event.key === 'a') {
                this.align();
            } else if (event.key === 'b') {
                event.preventDefault();
                this.runAction();
            } else if (event.key === 'h') {
                this.horizontalAlign();
            } else if (event.key === 'z') {
                this.fitNotesToScreen();
            }
        },

        async runAction() {
            const action = await textInput('action:', '');
            if (!action) {
                return;
            }
            const selected = this.notes.filter(note => note.selected);

            switch (action) {
                case "fix-width":
                    this.fixWidth();
                    return;
                case "export":
                    for (let i = 0; i < selected.length; i++) {
                        const note = selected[i];
                        await this.putNote(note);
                    }
                    return
                case "load":
                    await this.loadNotes();
                    return;
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

        fixWidth() {
            const selectedNotes = this.notes.filter(note => note.selected);
            selectedNotes.forEach(note => {
                note.text = note.text.trim();
                note.width = this.calcWidth(note.text);
            });
        },

        calcWidth(text: string): number {
            return this.textMeasure.measureTextWidth(text, "20px Arial") + 20;
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
            const selectedNotes = this.notes.filter(note => note.selected);
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
            note.width = this.calcWidth(newText);
        },

        async addNoteAt(event: MouseEvent) {
            const newText = await textInput('New Note', '');
            if (!newText) {
                return;
            }
            const svgPoint = this.screenToSvgPoint(event.clientX, event.clientY);

            const adjustedX = (svgPoint.x - this.zoomService.panX) / this.zoomService.zoom;
            const adjustedY = (svgPoint.y - this.zoomService.panY) / this.zoomService.zoom;

            const initialColor = nearbyColor(adjustedX, adjustedY, this.notes, 'yellow');
            const textColor = getTextColorForBackground(initialColor);

            const newNote: Note = {
                id: uuid.v4(),
                text: newText,
                x: adjustedX - 50,
                y: adjustedY - 25,
                width: this.calcWidth(newText),
                height: 50,
                color: initialColor,
                textColor: textColor,
            };
            this.pushNewNote(newNote, true);
        },

        async putNote(note: Note) {
            const {
                selected,
                isNoteDragging,
                dirty,
                ...toSave
            } = note;

            await this.db!.put({
                ...toSave,
                _id: toSave.id,
            });
        },

        async addMulti(event: MouseEvent) {
            const svgPoint = this.screenToSvgPoint(event.clientX, event.clientY);
            const newText = await textInput('Add Multiple', '', true);

            if (newText === null) {
                return;
            }

            const lines = newText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            let currentY = (svgPoint.y - this.zoomService.panY) / this.zoomService.zoom;
            let x = (svgPoint.x - this.zoomService.panX) / this.zoomService.zoom - 50;

            lines.forEach((line, index) => {
                let text = line.trim();
                const newNote: Note = {
                    id: uuid.v4(),
                    text: text,
                    x: x,
                    y: currentY,
                    width: this.calcWidth(text),
                    height: 50,
                    color: "yellow",
                    textColor: "black"
                };

                this.pushNewNote(newNote, true)
                currentY += 60
            });
        },

        async handleDoubleClick(event: MouseEvent) {
            if (event.shiftKey) {
                await this.addMulti(event);
            } else {
                await this.addNoteAt(event);
            }
        },

        align() {
            const selected = this.notes.filter(note => note.selected);
            if (selected.length == 0) {
                return;
            }

            selected.sort(function (a, b): number {
                return a.y - b.y;
            })

            const top = selected[0];
            for (let i = 1; i < selected.length; i++) {
                selected[i].x = top.x;
                selected[i].y = top.y + i * 60;
            }
        },

        horizontalAlign() {
            const selected = this.notes.filter(note => note.selected);
            if (selected.length == 0) {
                return;
            }

            selected.sort(function (a, b): number {
                return a.y - b.y;
            })

            const top = selected[0];
            for (let i = 1; i < selected.length; i++) {
                selected[i].x = top.x;
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
                this.notes.forEach(n => {
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
            this.notes.forEach(note => {
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
            this.notes.forEach(note => {
                note.selected = note.id === selectedNote.id;
            });
        },

        handleNoteDragEnd() {
            this.isDragging = false;
        },

        unselectAllNotes() {
            this.notes.forEach(note => {
                note.selected = false;
            });
        },

        deleteSelectedNotes() {
            let toDelete = this.notes.filter(note => note.selected);
            this.notes = this.notes.filter(note => !note.selected);

            this.toDelete.push(...toDelete);
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

        pushNewNote(baseNote: Note, dirty: boolean) {
            let note = {
                selected: false,
                isNoteDragging: false,
                dirty: dirty,
                board: this.currentBoard,
                ...baseNote,
            };
            this.notes.push(note);

            this.$watch(() => [
                note.x,
                note.y,
                note.width,
                note.height,
                note.text,
                note.color,
                note.textColor,
                note.board,
            ], () => {
                note.dirty = true;
            });
        },

        couchCallback(kind: string, doc: Document) {
            const currentBoard = doc.board || "main";
            if (currentBoard != this.currentBoard) {
                return;
            }

            const newNote: Note = {
                id: doc.id,
                _rev: doc._rev,
                text: doc.text,
                x: doc.x,
                y: doc.y,
                width: doc.width,
                height: doc.height,
                color: doc.color,
                textColor: doc.textColor,
                board: doc.board,
            };

            const found = this.notes.filter(note => note.id === newNote.id);
            if (found.length > 1) {
                throw new Error("found more than one note with the same id");
            }

            switch (kind) {
                case "new":
                case "update":
                    if (found.length == 0) {
                        this.pushNewNote(newNote, false);
                        break;
                    }
                    const existing = found[0];
                    Object.keys(newNote).forEach(key => {
                        if (existing.hasOwnProperty(key)) {
                            if ((existing as any)[key] !== (newNote as any)[key]) {
                                (existing as any)[key] = (newNote as any)[key];
                            }
                        } else {
                            this.$set(existing, key, (newNote as any)[key]);
                        }
                    });
                    break;
                case "delete":
                    this.notes = this.notes.filter(note => note.id !== doc._id);
                    break;
            }
        },

        fitNotesToScreen(maxZoom: number = 0.7, padding: number = 20) {
            if (this.notes.length === 0) {
                return;
            }
            this.zoomService.calculateZoom(
                this.notes.map(getBoundingBox),
                maxZoom,
                padding
            );
        }
    },

    async mounted() {
        this.db = new CouchClient(dbname, (kind: string, doc: Document) => {
            this.couchCallback(kind, doc);
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
        await this.db.subscribe();
        await this.db.loadDocs();
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

            <note-component v-for="note in notes"
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