import Vue from 'vue';
import { TextMeasurer } from "./Util.js";
import { CouchClient, Document } from "./CouchClient.js";
import { Note } from "./NoteComponent.js";

interface NoteServiceConfig {
    textMeasure: TextMeasurer;
    db: CouchClient | null;
    currentBoard: string;
}

export class NoteService {
    public notes: Note[];
    public toDelete: Note[];
    public textMeasure: TextMeasurer;
    public db: CouchClient | null;
    public currentBoard: string;

    constructor(config: NoteServiceConfig) {
        this.notes = Vue.observable([] as Note[]);
        this.toDelete = Vue.observable([] as Note[]);
        this.textMeasure = config.textMeasure;
        this.db = config.db;
        this.currentBoard = config.currentBoard;
    }
}
