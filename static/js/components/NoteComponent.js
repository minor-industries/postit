Vue.component('note-component', {
    props: ['note'],
    computed: {
        noteStyle() {
            const regularColor = this.note.color || "yellow";
            return {
                fill: this.note.selected ? 'lightblue' : regularColor,
                stroke: this.note.selected ? 'red' : 'black', // Add a stroke for selected notes
                strokeWidth: this.note.selected ? 2 : 1 // Thicker stroke for selected notes
            };
        },
        textStyle() {
            return {
                fill: this.note.textColor || 'black' // Default text color is black
            };
        }
    },
    methods: {
        selectNote() {
            if (!this.note.isNoteDragging) { // Only select if not dragging
                this.$emit('select-note', this.note);
            }
        }
    },
    template: `
        <g :transform="'translate(' + note.x + ',' + note.y + ')'" class="draggable-note" @click.stop="selectNote">
            <rect class="note" :width="note.width" :height="note.height" :style="noteStyle"></rect>
            <text x="10" y="30" :style="textStyle">
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
                    this.note.isNoteDragging = true; // Set dragging flag
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
                    setTimeout(() => {
                        this.note.isNoteDragging = false; // Unset dragging flag with a slight delay
                    }, 100); // Adjust the delay as needed
                    this.$emit('drag-end', this.note.selected);
                }
            }
        });
    }
});
