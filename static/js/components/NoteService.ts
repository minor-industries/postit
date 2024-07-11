import Vue from 'vue';
import {nearbyColor, TextMeasurer} from "./Util.js";
import {CouchClient, Document} from "./CouchClient.js";
import {Note} from "./NoteComponent.js";
import {getTextColorForBackground} from "./Colors.js";

declare const uuid: any; //TODO

interface NoteServiceConfig {
    textMeasure: TextMeasurer;
    db: CouchClient | null;
    currentBoard: string;
}

export class NoteService {
    public notes: Note[];
    public toDelete: Note[];
    public textMeasure: TextMeasurer;
    public db: CouchClient | null; // TODO: remove nullability
    public currentBoard: string;

    constructor(config: NoteServiceConfig) {
        this.notes = Vue.observable([] as Note[]);
        this.toDelete = Vue.observable([] as Note[]);
        this.textMeasure = config.textMeasure;
        this.db = config.db;
        this.currentBoard = config.currentBoard;
    }

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
    }

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
    }

    fixWidth() {
        const selectedNotes = this.notes.filter(note => note.selected);
        selectedNotes.forEach(note => {
            note.text = note.text.trim();
            note.width = this.calcWidth(note.text);
        });
    }

    calcWidth(text: string): number {
        return this.textMeasure.measureTextWidth(text, "20px Arial") + 20;
    }

    pushNewNote(baseNote: Note, dirty: boolean, component: Vue) {
        const note = Vue.observable({
            selected: false,
            isNoteDragging: false,
            dirty: dirty,
            board: this.currentBoard,
            ...baseNote,
        });

        component.$watch(() => [
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
            }
        );

        this.notes.push(note);
    }

    addNoteAt(x: number, y: number, text: string, component: Vue) {
        const initialColor = nearbyColor(x, y, this.notes, 'yellow');
        const textColor = getTextColorForBackground(initialColor);

        const newNote: Note = {
            id: uuid.v4(),
            text: text,
            x: x - 50,
            y: y - 25,
            width: this.calcWidth(text),
            height: 50,
            color: initialColor,
            textColor: textColor,
        };

        this.pushNewNote(newNote, true, component);
    }

    couchCallback(kind: string, doc: Document, component: Vue) {
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
                    this.pushNewNote(newNote, false, component);
                    break;
                }
                const existing = found[0];
                Object.keys(newNote).forEach(key => {
                    if (existing.hasOwnProperty(key)) {
                        if ((existing as any)[key] !== (newNote as any)[key]) {
                            (existing as any)[key] = (newNote as any)[key];
                        }
                    } else {
                        component.$set(existing, key, (newNote as any)[key]);
                    }
                });
                break;
            case "delete":
                this.notes = this.notes.filter(note => note.id !== doc._id);
                break;
        }
    }
}
