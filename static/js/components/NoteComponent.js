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
                    move: (event) => {
                        this.note.x += event.dx / this.$parent.zoom.level;
                        this.note.y += event.dy / this.$parent.zoom.level;
                    }
                }
            });
    }
});
