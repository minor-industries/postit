Vue.component('note-component', {
    props: ['note', 'onDragStart', 'onDrag', 'onDragEnd'],
    template: `
        <g :transform="'translate(' + note.x + ',' + note.y + ')'"
           @mousedown="startDrag">
            <rect class="note" :width="note.width" :height="note.height"></rect>
            <text x="10" y="30">{{ note.text }}</text>
        </g>
    `,
    methods: {
        startDrag(event) {
            const startX = event.clientX;
            const startY = event.clientY;
            const initialX = this.note.x;
            const initialY = this.note.y;

            const onMouseMove = (event) => {
                const dx = event.clientX - startX;
                const dy = event.clientY - startY;
                this.onDrag(this.note, initialX + dx, initialY + dy);
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                this.onDragEnd(this.note);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            this.onDragStart(this.note);
        }
    }
});
