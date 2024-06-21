export function editNoteText(note) {
    return new Promise((resolve) => {
        const inputId = 'vex-input-note-text';

        const dialog = vex.dialog.open({
            message: 'Edit Note Text',
            input: `<input type="text" id="${inputId}" name="noteText" class="vex-dialog-prompt-input" value="${note.text}" />`,
            buttons: [
                {
                    text: 'OK',
                    type: 'submit',
                    className: 'vex-dialog-button-primary'
                },
                {
                    text: 'Cancel',
                    type: 'button',
                    className: 'vex-dialog-button-secondary',
                    click: function () {
                        resolve(null);
                        vex.close(dialog);
                    }
                }
            ],
            callback: (data) => {
                if (data && data.noteText) {
                    resolve(data.noteText);
                } else {
                    resolve(null);
                }
            }
        });
    });
}
