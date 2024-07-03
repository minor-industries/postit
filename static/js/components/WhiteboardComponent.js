/// <reference path="./vue-types.d.ts" />
import { nearbyColor, TextMeasurer } from "./Util.js";
import { changeNoteColor } from "./ColorChanger.js";
import { textInput } from "./EditNote.js";
import { loadValue } from "./Api.js";
import { getTextColorForBackground } from "./Colors.js";
import { CouchClient } from "./CouchClient.js";
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
            textMeasure: new TextMeasurer(),
            db: null,
        };
    },
    computed: {
        groupTransform() {
            return `translate(${this.pan.translateX}, ${this.pan.translateY}) scale(${this.zoom.level})`;
        },
    },
    watch: {
        'zoom.level'(newZoomLevel) {
            console.log("zoomlevel");
            sessionStorage.setItem('zoomLevel', newZoomLevel.toString());
        },
        'pan.translateX'(newTranslateX) {
            sessionStorage.setItem('panTranslateX', newTranslateX.toString());
        },
        'pan.translateY'(newTranslateY) {
            sessionStorage.setItem('panTranslateY', newTranslateY.toString());
        }
    },
    methods: {
        async saveNotes() {
            console.log("save notes");
            // await saveValue("notes", JSON.stringify(this.notes));
            const dirty = this.notes.filter(note => note.dirty);
            for (let i = 0; i < dirty.length; i++) {
                const note = dirty[i];
                await this.putNote(note);
                note.dirty = false;
            }
        },
        async loadNotes() {
            const json = await loadValue("notes");
            let notes = JSON.parse(json.value);
            notes.forEach(note => {
                if (!note.color) {
                    note.color = "yellow";
                    note.textColor = "black";
                }
            });
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
            }
            else if (event.key === '-') {
                event.preventDefault();
                this.zoom.level = Math.max(0.1, this.zoom.level - zoomFactor);
            }
            else if (event.key === 's') {
                event.preventDefault();
                await this.saveNotes();
                // } else if (event.key === 'l') {
                //     event.preventDefault();
                //     await this.loadNotes();
            }
            else if (event.key === 'd') {
                event.preventDefault();
                this.deleteSelectedNotes();
            }
            else if (event.key === 'Escape') {
                this.unselectAllNotes();
            }
            else if (event.key === 'c') {
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
            }
            else if (event.key === 'e') {
                event.preventDefault();
                await this.oneDialog(this.handleEditNote);
            }
            else if (event.key === 'a') {
                this.align();
            }
            else if (event.key === 'b') {
                event.preventDefault();
                this.runAction();
            }
            else if (event.key === 'h') {
                this.horizontalAlign();
            }
        },
        async runAction() {
            const action = await textInput('action:', '');
            console.log("action:", action);
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
                    return;
                case "load":
                    await this.loadNotes();
                    return;
                case "show":
                    selected.forEach(note => {
                        console.log(JSON.stringify(note, null, 2));
                    });
                    return;
            }
        },
        fixWidth() {
            const selectedNotes = this.notes.filter(note => note.selected);
            selectedNotes.forEach(note => {
                note.text = note.text.trim();
                note.width = this.calcWidth(note.text);
            });
        },
        calcWidth(text) {
            return this.textMeasure.measureTextWidth(text, "20px Arial") + 20;
        },
        async oneDialog(callback) {
            if (this.isDialogOpen) {
                return;
            }
            this.isDialogOpen = true;
            try {
                return await callback();
            }
            finally {
                this.isDialogOpen = false;
            }
        },
        async handleEditNote() {
            const selectedNotes = this.notes.filter(note => note.selected);
            if (selectedNotes.length !== 1) {
                vex.dialog.alert({ message: 'Please select exactly one note to edit.' });
                return;
            }
            const note = selectedNotes[0];
            const newText = await textInput('Edit Note Text', note.text);
            console.log(newText);
            if (newText === null) {
                return;
            }
            note.text = newText;
            note.width = this.calcWidth(newText);
        },
        async addNoteAt(event) {
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
            const newNote = {
                id: uuid.v4(),
                text: newText,
                x: adjustedX - 50,
                y: adjustedY - 25,
                width: this.calcWidth(newText),
                height: 50,
                selected: false,
                isNoteDragging: false,
                color: initialColor,
                textColor: textColor,
                dirty: true,
            };
            this.notes.push(newNote);
        },
        async putNote(note) {
            const { selected, isNoteDragging, dirty, ...toSave } = note;
            await this.db.put({
                _id: toSave.id,
                ...toSave
            });
        },
        async addMulti(event) {
            const svgPoint = this.screenToSvgPoint(event.clientX, event.clientY);
            const newText = await textInput('Add Multiple', '', true); // Use textarea
            if (newText === null) {
                return;
            }
            const lines = newText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            let currentY = (svgPoint.y - this.pan.translateY) / this.zoom.level;
            let x = (svgPoint.x - this.pan.translateX) / this.zoom.level - 50;
            lines.forEach((line, index) => {
                const newNote = {
                    id: uuid.v4(),
                    text: line,
                    x: x,
                    y: currentY,
                    width: this.calcWidth(newText),
                    height: 50,
                    selected: false,
                    isNoteDragging: false,
                    color: "yellow",
                    textColor: "black"
                };
                this.notes.push(newNote);
                currentY += 60;
            });
        },
        async handleDoubleClick(event) {
            if (event.shiftKey) {
                await this.addMulti(event);
            }
            else {
                await this.addNoteAt(event);
            }
        },
        align() {
            const selected = this.notes.filter(note => note.selected);
            if (selected.length == 0) {
                return;
            }
            selected.sort(function (a, b) {
                return a.y - b.y;
            });
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
            selected.sort(function (a, b) {
                return a.y - b.y;
            });
            const top = selected[0];
            for (let i = 1; i < selected.length; i++) {
                selected[i].x = top.x;
            }
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
            }
            else {
                note.x += dx / this.zoom.level;
                note.y += dy / this.zoom.level;
            }
        },
        handleSelectNotes(selectionBox) {
            this.notes.forEach(note => {
                const selected = (note.x + note.width >= selectionBox.x &&
                    note.x <= selectionBox.x + selectionBox.width &&
                    note.y + note.height >= selectionBox.y &&
                    note.y <= selectionBox.y + selectionBox.height);
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
            }
            else {
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
        },
        restoreZoomAndPan() {
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
        couchCallback(kind, doc) {
            console.log("callback", kind, JSON.stringify(doc));
            switch (kind) {
                case "new":
                    // TODO: can I use the note directly?
                    const newNote = {
                        id: doc.id,
                        _rev: doc._rev,
                        text: doc.text,
                        x: doc.x,
                        y: doc.y,
                        width: doc.width,
                        height: doc.height,
                        color: doc.color,
                        textColor: doc.textColor,
                        selected: false,
                        isNoteDragging: false,
                    };
                    this.notes.push(newNote);
                    break;
            }
        },
    },
    async mounted() {
        this.db = new CouchClient((kind, doc) => {
            this.couchCallback(kind, doc);
        });
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
        this.restoreZoomAndPan();
        // await this.loadNotes();
        await this.db.connect();
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
