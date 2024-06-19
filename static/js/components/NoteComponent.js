Vue.component('note-component', {
    props: ['note'],
    template: `
        <g :transform="'translate(' + note.x + ',' + note.y + ')'" class="draggable-note">
            <rect class="note" :width="note.width" :height="note.height"></rect>
            <text x="10" y="30">{{ note.text }}</text>
        </g>
    `,
    mounted() {
        interact(this.$el)
            .draggable({
                listeners: {
                    start: (event) => {
                        this.$emit('drag-start');
                    },
                    move: (event) => {
                        this.$emit('drag-move', { dx: event.dx, dy: event.dy });
                    },
                    end: (event) => {
                        this.$emit('drag-end');
                    }
                }
            });
    }
});
