/// <reference path="./vue-types.d.ts" />
Vue.component('note-component', {
    props: ['note'],
    computed: {
        noteStyle() {
            const regularColor = this.note.color || "yellow";
            return {
                fill: this.note.selected ? 'lightblue' : regularColor,
                stroke: this.note.selected ? 'red' : 'black',
                strokeWidth: this.note.selected ? 2 : 1
            };
        },
        textStyle() {
            return {
                fill: this.note.textColor || 'black',
                fontFamily: 'Arial, sans-serif', // Explicitly set the font family
                fontSize: '20px' // Explicitly set the font size
            };
        }
    },
    methods: {
        selectNote() {
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
    mounted() {
        interact(this.$el).draggable({
            listeners: {
                start: (event) => {
                    if (event.shiftKey) {
                        return;
                    }
                    this.note.isNoteDragging = true;
                    this.$emit('drag-start', this.note.selected);
                },
                move: (event) => {
                    if (event.shiftKey) {
                        return;
                    }
                    this.$emit('drag-move', { dx: event.dx, dy: event.dy });
                },
                end: (event) => {
                    if (event.shiftKey) {
                        return;
                    }
                    this.note.dirty = true;
                    setTimeout(() => {
                        this.note.isNoteDragging = false;
                    }, 100);
                    this.$emit('drag-end', this.note.selected);
                }
            }
        });
    },
});
export {};
