import Vue from "vue";

declare const interact: any;

interface SvgPoint {
    x: number;
    y: number;
}

interface Box {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface Note {
    id: string;
    _rev?: string;
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
    color: string;
    textColor: string;
    selected?: boolean;
    isNoteDragging?: boolean;
    dirty?: boolean;
    board?: string; // TODO: remove optionality
}

interface InteractEvent {
    shiftKey: boolean;
    dx: number;
    dy: number;
}

type NoteComponentInstance = Vue & { note: Note };

const NoteComponent = Vue.extend({
    props: {
        note: {
            type: Object as () => Note,
            required: true
        }
    },
    computed: {
        noteStyle(this: NoteComponentInstance) {
            const regularColor = this.note.color || "yellow";
            return {
                fill: this.note.selected ? 'lightblue' : regularColor,
                stroke: this.note.selected ? 'red' : 'black',
                strokeWidth: this.note.selected ? 2 : 1
            };
        },
        textStyle(this: NoteComponentInstance) {
            return {
                fill: this.note.textColor || 'black',
                fontFamily: 'Arial, sans-serif',  // Explicitly set the font family
                fontSize: '20px'  // Explicitly set the font size
            };
        }
    },
    methods: {
        selectNote(this: NoteComponentInstance) {
            if (!this.note.isNoteDragging) {
                this.$emit('select-note', this.note);
            }
        },
    },
    template: `
      <g :transform="'translate(' + note.x + ',' + note.y + ')'" class="draggable-note" @click.stop="selectNote">
        <rect class="note" :width="note.width" :height="note.height" :style="noteStyle"></rect>
        <text ref="text" x="10" y="30" :style="textStyle">
          {{ note.text }}
        </text>
      </g>
    `,
    mounted(this: NoteComponentInstance) {
        interact(this.$el).draggable({
            listeners: {
                start: (event: InteractEvent) => {
                    if (event.shiftKey) {
                        return;
                    }
                    this.note.isNoteDragging = true;
                    this.$emit('drag-start', this.note.selected);
                },
                move: (event: InteractEvent) => {
                    if (event.shiftKey) {
                        return;
                    }
                    this.$emit('drag-move', { dx: event.dx, dy: event.dy });
                },
                end: (event: InteractEvent) => {
                    if (event.shiftKey) {
                        return;
                    }
                    setTimeout(() => {
                        this.note.isNoteDragging = false;
                    }, 100);
                    this.$emit('drag-end', this.note.selected);
                }
            }
        });
    }
});

Vue.component('note-component', NoteComponent);

export default NoteComponent;
