export function editNoteText(note) {
    return new Promise((resolve) => {
        Swal.fire({
            title: 'Edit Note Text',
            input: 'text',
            inputValue: note.text,
            showCancelButton: true,
            inputValidator: (value) => {
                if (!value) {
                    return 'You need to write something!';
                }
            }
        }).then((result) => {
            if (result.value) {
                resolve(result.value);
            }
        });
    });
}
