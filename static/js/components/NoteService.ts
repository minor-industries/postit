import Vue from 'vue';
import {TextMeasurer} from "./Util.js";
import {CouchClient} from "./CouchClient.js";
import {Note} from "./NoteComponent.js";

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
}
