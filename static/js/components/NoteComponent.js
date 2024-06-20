Vue.component('note-component', {
    props: ['note'],
    computed: {
        noteStyle() {
            if (this.note.selected) {
                console.log("selected", this.note.text);
            }
            return {
                fill: this.note.selected ? 'lightblue' : 'yellow', // Change fill color for selected notes
                stroke: this.note.selected ? 'red' : 'black', // Add a stroke for selected notes
                strokeWidth: this.note.selected ? 2 : 1 // Thicker stroke for selected notes
            };
        }
    },
    methods: {
        selectNote() {
            this.$emit('select-note', this.note);
        }
    },
    template: `
        <g :transform="'translate(' + note.x + ',' + note.y + ')'" class="draggable-note" @click.stop="selectNote">
            <rect class="note" :width="note.width" :height="note.height" :style="noteStyle"></rect>
            <text x="10" y="30">{{ note.text }}</text>
        </g>
    `,
    mounted() {
        interact(this.$el).draggable({
            listeners: {
                start: (event) => {
                    if (event.shiftKey) {
                        return;
                    }
                    this.$emit('drag-start', this.note.selected);
                },
                move: (event) => {
                    if (event.shiftKey) {
                        return;
                    }
                    this.$emit('drag-move', {dx: event.dx, dy: event.dy});
                },
                end: (event) => {
                    if (event.shiftKey) {
                        return;
                    }
                    this.$emit('drag-end', this.note.selected);
                }
            }
        });
    }
});
