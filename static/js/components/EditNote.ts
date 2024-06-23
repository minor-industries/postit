declare const vex: any; //TODO

export function textInput(
    message: string,
    existingText: string,
    useTextarea: boolean = false
): Promise<string | null> {
    return new Promise<string | null>((resolve) => {
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