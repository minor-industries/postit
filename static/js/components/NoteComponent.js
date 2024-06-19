Vue.component('note-component', {
    props: ['note'],
    template: `
        <g :transform="'translate(' + note.x + ',' + note.y + ')'" class="draggable-note"
           @mousedown.stop="startDrag">
            <rect class="note" :width="note.width" :height="note.height"></rect>
            <text x="10" y="30">{{ note.text }}</text>
        </g>
    `,
    methods: {
        startDrag(event) {
            this.$emit('drag-start', this.note, event.clientX, event.clientY);
        }
    },
    mounted() {
        interact(this.$el)
            .draggable({
                listeners: {
                    start: (event) => {
                        this.$emit('drag-start', this.note, event.clientX, event.clientY);
                    },
                    move: (event) => {
                        this.$emit('drag-move', this.note, event.dx, event.dy);
                    },
                    end: (event) => {
                        this.$emit('drag-end', this.note);
                    }
                }
            });
    }
});
