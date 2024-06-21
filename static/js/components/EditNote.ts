declare const vex: any; //TODO

interface Note {
    text: string;
}

export function editNoteText(note: Note): Promise<string | null> {
    return new Promise<string | null>((resolve) => {
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
                        dialog.close(); // Correct method to close the dialog
                    }
                }
            ],
            callback: (data: { noteText?: string }) => {
                if (data && data.noteText) {
                    resolve(data.noteText);
                } else {
                    resolve(null);
                }
            }
        });
    });
}
