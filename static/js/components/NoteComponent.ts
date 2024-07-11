import Vue, {computed, defineComponent, onMounted, ref, watch} from "vue";
import {BoundingBox} from "./ZoomService.js";

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

const NoteComponent = defineComponent({
    name: "NoteComponent",
    props: {
        note: {
            type: Object as () => Note,
            required: true
        }
    },
    setup(props, {emit}) {
        const note = ref(props.note);
        const noteElement = ref<SVGElement | null>(null);

        const noteStyle = computed(() => {
            const regularColor = note.value.color || "yellow";
            return {
                fill: note.value.selected ? 'lightblue' : regularColor,
                stroke: note.value.selected ? 'red' : 'black',
                strokeWidth: note.value.selected ? 2 : 1
            };
        });

        const textStyle = computed(() => {
            return {
                fill: note.value.textColor || 'black',
                fontFamily: 'Arial, sans-serif',
                fontSize: '20px'
            };
        });

        const selectNote = () => {
            if (!note.value.isNoteDragging) {
                emit('select-note', note.value);
            }
        };

        onMounted(() => {
            if (!noteElement.value) {
                return;
            }
            interact(noteElement.value).draggable({
                listeners: {
                    start: (event: InteractEvent) => {
                        if (event.shiftKey) {
                            return;
                        }
                        note.value.isNoteDragging = true;
                        emit('drag-start', note.value.selected);
                    },
                    move: (event: InteractEvent) => {
                        if (event.shiftKey) {
                            return;
                        }
                        emit('drag-move', {dx: event.dx, dy: event.dy});
                    },
                    end: (event: InteractEvent) => {
                        if (event.shiftKey) {
                            return;
                        }
                        setTimeout(() => {
                            note.value.isNoteDragging = false;
                        }, 100);
                        emit('drag-end', note.value.selected);
                    }
                }
            });
        });

        watch(() => props.note, (newVal) => {
            note.value = newVal;
        });

        return {
            note,
            noteStyle,
            textStyle,
            noteElement,
            selectNote
        };
    },
    template: `
      <g ref="noteElement" :transform="'translate(' + note.x + ',' + note.y + ')'" class="draggable-note"
         @click.stop="selectNote">
        <rect class="note" :width="note.width" :height="note.height" :style="noteStyle"></rect>
        <text ref="text" x="10" y="30" :style="textStyle">
          {{ note.text }}
        </text>
      </g>
    `
});

Vue.component('note-component', NoteComponent);

export default NoteComponent;

export function getBoundingBox(note: Note): BoundingBox {
    return {
        minX: note.x,
        minY: note.y,
        maxX: note.x + note.width,
        maxY: note.y + note.height,
    };
}