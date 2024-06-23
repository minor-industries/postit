export function textInput(message, existingText, useTextarea = false) {
    return new Promise((resolve) => {
        const inputId = 'vex-input-note-text';
        const inputElement = useTextarea
            ? `<textarea id="${inputId}" name="noteText" class="vex-dialog-prompt-input" style="height: 100px;">${existingText}</textarea>`
            : `<input type="text" id="${inputId}" name="noteText" class="vex-dialog-prompt-input" value="${existingText}" />`;
        const dialog = vex.dialog.open({
            message: message,
            input: inputElement,
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
            callback: (data) => {
                if (data && data.noteText) {
                    resolve(data.noteText);
                }
                else {
                    resolve(null);
                }
            }
        });
    });
}
