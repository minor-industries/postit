import Vue from 'vue';

import {nearbyColor, TextMeasurer} from "./Util.js";
import {changeNoteColor} from "./ColorChanger.js";
import {textInput} from "./EditNote.js";
import {loadValue} from "./Api.js";
import {getTextColorForBackground} from "./Colors.js";
import {CouchClient, Document} from "./CouchClient.js";
import {Note} from "./NoteComponent.js";
import {calculateZoom} from "./autozoom.js";

declare const vex: any; //TODO
declare const uuid: any; //TODO
declare const interact: any // TODO

const dbname = "whiteboard-main"

declare global {
    interface Window {
        PouchDB: any;
    }
}

interface SvgPoint {
    x: number;
    y: number;
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
    zoom: {
        level: number;
    };
    pan: {
        translateX: number;
        translateY: number;
    };
    isDragging: boolean;
    isDialogOpen: boolean;
    textMeasure: TextMeasurer;
    db: CouchClient | null;
    currentBoard: string;
}


function getCurrentBoard() {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    return params.get('board') || "main";
}


type WhiteboardComponentInstance = Vue & WhiteboardComponentData & {
    saveNotes(): Promise<void>;
    loadNotes(): Promise<void>;
    restoreZoomAndPan(): void;
    handleKeydown(event: KeyboardEvent): Promise<void>;
    oneDialog(callback: () => Promise<any>): Promise<any>;
    handleEditNote(): Promise<void>;
    addNoteAt(event: MouseEvent): void;
    addMulti(event: MouseEvent): void;
    screenToSvgPoint(clientX: number, clientY: number): SvgPoint;
    updateNotePosition(note: Note, dx: number, dy: number): void;
    handleSelectNotes(selectionBox: SelectionBox): void;
    selectNoteHandler(selectedNote: Note): void;
    handleNoteDragEnd(): void;
    unselectAllNotes(): void;
    deleteSelectedNotes(): void;
    handleMouseDown(event: MouseEvent): void;
    handleShiftMouseDown(event: MouseEvent): void;
    handleMouseMove(event: MouseEvent): void;
    handleMouseUp(event: MouseEvent): void;
    align(): void;
    horizontalAlign(): void;
    runAction(): void;
    fixWidth(): void;
    calcWidth(text: string): number;
    couchCallback(kind: string, doc: Document): void;
    putNote(note: Note): Promise<void>;
    pushNewNote(note: Note, dirty: boolean): void;
    fitNotesToScreen(maxZoom?: number, padding?: number): void;
    getScreenCenter(): SvgPoint;
    handleZoom(zoom: number): void;
    $refs: {
        whiteboard: HTMLDivElement;
        svgContainer: SVGSVGElement;
        selectionBox: any; // Adjust the type based on the actual type of selectionBox
        [key: string]: any; // To handle dynamic refs
    };
    $set: any; //TODO?
    $watch: any; //TODO?
};

Vue.component('whiteboard-component', {
    data(): WhiteboardComponentData {
        return {
            notes: [],
            toDelete: [],
            zoom: {
                level: 1,
            },
            pan: {
                translateX: 0,
                translateY: 0,
            },
            isDragging: false,
            isDialogOpen: false,
            textMeasure: new TextMeasurer(),
            db: null,
            currentBoard: getCurrentBoard(),
        };
    },
    computed: {
        groupTransform(this: WhiteboardComponentInstance) {
            return `translate(${this.pan.translateX}, ${this.pan.translateY}) scale(${this.zoom.level})`;
        },
    },
    watch: {
        'zoom.level'(newZoomLevel: number) {
            // console.log("zoomlevel");
            sessionStorage.setItem('zoomLevel', newZoomLevel.toString());
        },
        'pan.translateX'(newTranslateX: number) {
            sessionStorage.setItem('panTranslateX', newTranslateX.toString());
        },
        'pan.translateY'(newTranslateY: number) {
            sessionStorage.setItem('panTranslateY', newTranslateY.toString());
        }
    },
    methods: {
        async saveNotes(this: WhiteboardComponentInstance) {
            // console.log("save notes");
            // await saveValue("notes", JSON.stringify(this.notes));
            const dirty = this.notes.filter(note => note.dirty);
            for (let i = 0; i < dirty.length; i++) {
                const note = dirty[i];
                // console.log('saving', note.id);
                await this.putNote(note);
                note.dirty = false;
            }

            for (let i = 0; i < this.toDelete.length; i++) {
                const note = this.toDelete[i];
                console.log(note.text, note._rev);
                if (note._rev === undefined) {
                    continue; // this probably hasn't been stored to couch yet
                }
                await this.db!.delete(note);
            }

            this.toDelete = [];
        },

        async loadNotes(this: WhiteboardComponentInstance) {
            const json = await loadValue("notes");
            this.notes = JSON.parse(json.value);
        },

        getScreenCenter(this: WhiteboardComponentInstance): SvgPoint {
            const svg = this.$refs.svgContainer as SVGSVGElement;
            const rect = svg.getBoundingClientRect();
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            return {x: centerX, y: centerY};
        },

        handleZoom(this: WhiteboardComponentInstance, zoomFactor: number) {
            const c = this.getScreenCenter();
            let oldZoom = this.zoom.level;
            let newZoom = oldZoom * (1 + zoomFactor);
            newZoom = Math.max(newZoom, 0.25);
            newZoom = Math.min(newZoom, 2);

            const x = this.pan.translateX;
            const y = this.pan.translateY;

            // this is based on the idea of keeping the point corresponding to the "content center" the same
            const newX = c.x + (newZoom / oldZoom) * (x - c.x);
            const newY = c.y + (newZoom / oldZoom) * (y - c.y);

            // these should also be stored automatically in sessions storage due to watchers
            this.zoom.level = newZoom;
            this.pan.translateX = newX;
            this.pan.translateY = newY;
        },

        async handleKeydown(this: WhiteboardComponentInstance, event: KeyboardEvent) {
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

        async runAction(this: WhiteboardComponentInstance) {
            const action = await textInput('action:', '');
            if (!action) {
                return;
            }
            // console.log("action:", action);
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

        fixWidth(this: WhiteboardComponentInstance) {
            const selectedNotes = this.notes.filter(note => note.selected);
            selectedNotes.forEach(note => {
                note.text = note.text.trim();
                note.width = this.calcWidth(note.text);
            });
        },

        calcWidth(this: WhiteboardComponentInstance, text: string): number {
            return this.textMeasure.measureTextWidth(text, "20px Arial") + 20;
        },

        async oneDialog(this: WhiteboardComponentInstance, callback: () => Promise<any>) {
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

        async handleEditNote(this: WhiteboardComponentInstance) {
            const selectedNotes = this.notes.filter(note => note.selected);
            if (selectedNotes.length !== 1) {
                vex.dialog.alert({message: 'Please select exactly one note to edit.'});
                return;
            }
            const note = selectedNotes[0];
            const newText = await textInput('Edit Note Text', note.text);
            // console.log(newText);
            if (newText === null) {
                return;
            }
            note.text = newText;
            note.width = this.calcWidth(newText);
        },

        async addNoteAt(this: WhiteboardComponentInstance, event: MouseEvent) {
            const newText = await textInput('New Note', '');
            if (!newText) {
                return;
            }
            const svgPoint = this.screenToSvgPoint(event.clientX, event.clientY);

            // Adjust the coordinates based on pan and zoom
            const adjustedX = (svgPoint.x - this.pan.translateX) / this.zoom.level;
            const adjustedY = (svgPoint.y - this.pan.translateY) / this.zoom.level;

            // Determine the initial color based on nearby notes
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

        async putNote(this: WhiteboardComponentInstance, note: Note) {
            const {
                selected,
                isNoteDragging,
                dirty,
                ...toSave
            } = note;

            console.log("putting", toSave.id, JSON.stringify(toSave));
            await this.db!.put({
                ...toSave,
                _id: toSave.id,
            });
        },

        async addMulti(this: WhiteboardComponentInstance, event: MouseEvent) {
            const svgPoint = this.screenToSvgPoint(event.clientX, event.clientY);
            const newText = await textInput('Add Multiple', '', true); // Use textarea

            if (newText === null) {
                return;
            }

            const lines = newText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            let currentY = (svgPoint.y - this.pan.translateY) / this.zoom.level;
            let x = (svgPoint.x - this.pan.translateX) / this.zoom.level - 50;

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

        async handleDoubleClick(this: WhiteboardComponentInstance, event: MouseEvent) {
            if (event.shiftKey) {
                await this.addMulti(event);
            } else {
                await this.addNoteAt(event);
            }
        },

        align(this: WhiteboardComponentInstance) {
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

        horizontalAlign(this: WhiteboardComponentInstance) {
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

        screenToSvgPoint(this: WhiteboardComponentInstance, clientX: number, clientY: number): SvgPoint {
            const svg = this.$refs.svgContainer as SVGSVGElement;
            const point = svg.createSVGPoint();
            point.x = clientX;
            point.y = clientY;
            return point.matrixTransform(svg.getScreenCTM()!.inverse());
        },

        updateNotePosition(this: WhiteboardComponentInstance, note: Note, dx: number, dy: number) {
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

        handleSelectNotes(this: WhiteboardComponentInstance, selectionBox: SelectionBox) {
            this.notes.forEach(note => {
                const selected = (
                    note.x + note.width >= selectionBox.x &&
                    note.x <= selectionBox.x + selectionBox.width &&
                    note.y + note.height >= selectionBox.y &&
                    note.y <= selectionBox.y + selectionBox.height
                );
                if (selected) {
                    // console.log("selected2", note.text);
                }
                note.selected = selected;
            });
        },

        selectNoteHandler(this: WhiteboardComponentInstance, selectedNote: Note) {
            this.notes.forEach(note => {
                note.selected = note.id === selectedNote.id;
            });
        },

        handleNoteDragEnd(this: WhiteboardComponentInstance) {
            // console.log("drag end");
            this.isDragging = false;
        },

        unselectAllNotes(this: WhiteboardComponentInstance) {
            this.notes.forEach(note => {
                note.selected = false;
            });
        },

        deleteSelectedNotes(this: WhiteboardComponentInstance) {
            let toDelete = this.notes.filter(note => note.selected);
            this.notes = this.notes.filter(note => !note.selected);

            this.toDelete.push(...toDelete);
            toDelete.forEach(note => {
                note.selected = false;
            });
        },

        handleMouseDown(this: WhiteboardComponentInstance, event: MouseEvent) {
            if (event.shiftKey) {
                this.handleShiftMouseDown(event);
            } else {
                // Normal mouse down behavior, possibly dragging notes
            }
        },

        handleShiftMouseDown(this: WhiteboardComponentInstance, event: MouseEvent) {
            if (event.shiftKey) {
                event.preventDefault();
                this.$refs.selectionBox.startSelection(event);
            }
        },

        handleMouseMove(this: WhiteboardComponentInstance, event: MouseEvent) {
            if (this.$refs.selectionBox.isActive) {
                this.$refs.selectionBox.updateSelection(event);
            }
        },

        handleMouseUp(this: WhiteboardComponentInstance, event: MouseEvent) {
            if (this.$refs.selectionBox.isActive) {
                this.$refs.selectionBox.endSelection(event);
            }
        },

        restoreZoomAndPan(this: WhiteboardComponentInstance) {
            const storedZoomLevel = sessionStorage.getItem('zoomLevel');
            if (storedZoomLevel) {
                this.zoom.level = parseFloat(storedZoomLevel);
            }

            const storedPanTranslateX = sessionStorage.getItem('panTranslateX');
            if (storedPanTranslateX) {
                this.pan.translateX = parseFloat(storedPanTranslateX);
            }

            const storedPanTranslateY = sessionStorage.getItem('panTranslateY');
            if (storedPanTranslateY) {
                this.pan.translateY = parseFloat(storedPanTranslateY);
            }
        },

        pushNewNote(this: WhiteboardComponentInstance, baseNote: Note, dirty: boolean) {
            let note = {
                selected: false,
                isNoteDragging: false,
                dirty: dirty,
                board: this.currentBoard,
                ...baseNote,
            };
            this.notes.push(note);

            // console.log("watch");
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
                // console.log(baseNote.text, "dirtied");
                note.dirty = true;
            });
        },

        couchCallback(this: WhiteboardComponentInstance, kind: string, doc: Document) {
            const currentBoard = doc.board || "main"; // TODO: remove main fallback?
            if (currentBoard != this.currentBoard) {
                // TODO: might want to remove from this.notes
                return;
            }

            // console.log("callback", kind, JSON.stringify(doc));
            // SHOULD I SIMPLY USE THE RAW COUCH OBJECT?

            // TODO: This seems like it will be brittle (yes, this is bad)
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
                    // TODO: perhaps after getting an update from the server we might unset the dirty flag?
                    const existing = found[0];
                    Object.keys(newNote).forEach(key => {
                        if (existing.hasOwnProperty(key)) {
                            if ((existing as any)[key] !== (newNote as any)[key]) {
                                (existing as any)[key] = (newNote as any)[key]; // Update existing properties only if the value has changed
                            }
                        } else {
                            this.$set(existing, key, (newNote as any)[key]); // Add new properties reactively
                        }
                    });
                    const keys = Object.keys(existing).filter(k => existing.hasOwnProperty(k)).join(", ")
                    // // console.log("keys:", keys);
                    break;
                case "delete":
                    this.notes = this.notes.filter(note => note.id !== doc._id);
                    break;
            }
        },

        fitNotesToScreen(this: WhiteboardComponentInstance, maxZoom: number = 0.7, padding: number = 20) {
            if (this.notes.length === 0) {
                return;
            }

            const {zoom, panX, panY} = calculateZoom(this.notes, maxZoom, padding);

            this.zoom.level = zoom;
            this.pan.translateX = panX;
            this.pan.translateY = panY;

            // Store the new zoom and pan settings
            sessionStorage.setItem('zoomLevel', zoom.toString());
            sessionStorage.setItem('panTranslateX', panX.toString());
            sessionStorage.setItem('panTranslateY', panY.toString());
        }
    },

    async mounted(this: WhiteboardComponentInstance) {
        this.db = new CouchClient(dbname, (kind: string, doc: Document) => {
            this.couchCallback(kind, doc);
        });

        this.$refs.whiteboard.focus();
        window.addEventListener('keydown', this.handleKeydown);

        interact(this.$refs.svgContainer).draggable({
            listeners: {
                move: (event: any) => {
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

        this.restoreZoomAndPan();
        // await this.loadNotes();

        // await this.db.connect(); // connecting through proxy so not needed
        await this.db.subscribe();
        await this.db.loadDocs();
    },

    beforeDestroy(this: WhiteboardComponentInstance) {
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