export function editNoteText(note) {
    return new Promise((resolve) => {
        const inputId = 'vex-input-note-text';

        const dialog = vex.dialog.open({
            message: 'Edit Note Text',
            input: `<input type="text" id="${inputId}" name="noteText" class="vex-dialog-prompt-input" value="${note.text}" />`,
            buttons: [
                {
                    text: 'OK',
                    type: 'button',
                    className: 'vex-dialog-button-primary',
                    click: function () {
                        const inputElement = document.getElementById(inputId);
                        if (inputElement && inputElement.value) {
                            resolve(inputElement.value);
                            dialog.close(); // Close the dialog
                        } else {
                            // Show validation error
                            vex.dialog.alert('You need to write something!');
                        }
                    }
                },
                {
                    text: 'Cancel',
                    type: 'button',
                    className: 'vex-dialog-button-secondary',
                    click: function () {
                        resolve(null);
                        dialog.close(); // Close the dialog
                    }
                }
            ]
        });
    });
}

