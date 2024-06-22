/// <reference path="./vue-types.d.ts" />

import {nearbyColor} from "./Util.js";
import {changeNoteColor} from "./ColorChanger.js";
import {editNoteText} from "./EditNote.js";
import {loadValue, saveValue} from "./Api.js";
import {getTextColorForBackground} from "./Colors.js";

declare const vex: any; //TODO
declare const uuid: any; //TODO

interface Note {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
    color?: string;
    textColor?: string;
    selected?: boolean;
    isNoteDragging?: boolean;
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
    zoom: {
        level: number;
    };
    pan: {
        translateX: number;
        translateY: number;
    };
    isDragging: boolean;
    isDialogOpen: boolean;
}

type WhiteboardComponentInstance = Vue & WhiteboardComponentData & {
    saveNotes(): Promise<void>;
    loadNotes(): Promise<void>;
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
    $refs: {
        whiteboard: HTMLDivElement;
        svgContainer: SVGSVGElement;
        selectionBox: any; // Adjust the type based on the actual type of selectionBox
    };
};

Vue.component('whiteboard-component', {
    data(): WhiteboardComponentData {
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
        groupTransform(this: WhiteboardComponentInstance) {
            return `translate(${this.pan.translateX}, ${this.pan.translateY}) scale(${this.zoom.level})`;
        },
    },
    methods: {
        async saveNotes(this: WhiteboardComponentInstance) {
            console.log("save notes");
            await saveValue("notes", JSON.stringify(this.notes));
        },

        async loadNotes(this: WhiteboardComponentInstance) {
            const json = await loadValue("notes");
            let notes: Note[] = JSON.parse(json.value);
            notes.forEach(note => {
                if (!note.color) {
                    note.color = "yellow";
                    note.textColor = "black";
                }
            });
            this.notes = notes;
        },

        async handleKeydown(this: WhiteboardComponentInstance, event: KeyboardEvent) {
            const target = event.target as HTMLElement;
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
                });
            } else if (event.key === 'e') {
                event.preventDefault();
                await this.oneDialog(this.handleEditNote);
            } else if (event.key === 'a') {
                this.align();
            }
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
            const newText = await editNoteText(note);
            console.log(newText);
            if (newText === null) {
                return;
            }
            note.text = newText;
            note.width = 11 * note.text.length + 10;
        },

        async addNoteAt(this: WhiteboardComponentInstance, event: MouseEvent) {
            const newText = await editNoteText({text: ''} as Note);
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
                width: 11 * newText.length + 10,
                height: 50,
                selected: false,
                isNoteDragging: false,
                color: initialColor,
                textColor: textColor
            };
            this.notes.push(newNote);
        },

        async addMulti(this: WhiteboardComponentInstance, event: MouseEvent) {
            const svgPoint = this.screenToSvgPoint(event.clientX, event.clientY);
            const newText = await editNoteText({text: ''}, true); // Use textarea

            if (newText === null) {
                return;
            }

            const lines = newText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            let currentY = (svgPoint.y - this.pan.translateY) / this.zoom.level;
            let x = (svgPoint.x - this.pan.translateX) / this.zoom.level - 50;

            lines.forEach((line, index) => {
                const newNote: Note = {
                    id: uuid.v4(),
                    text: line,
                    x: x,
                    y: currentY,
                    width: 11 * line.length + 10,
                    height: 50,
                    selected: false,
                    isNoteDragging: false,
                    color: "yellow",
                    textColor: "black"
                };

                this.notes.push(newNote);
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
                    console.log("selected2", note.text);
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
            console.log("drag end");
            this.isDragging = false;
        },

        unselectAllNotes(this: WhiteboardComponentInstance) {
            this.notes.forEach(note => {
                note.selected = false;
            });
        },

        deleteSelectedNotes(this: WhiteboardComponentInstance) {
            this.notes = this.notes.filter(note => !note.selected);
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
        }
    },

    mounted(this: WhiteboardComponentInstance) {
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

        this.loadNotes();
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
