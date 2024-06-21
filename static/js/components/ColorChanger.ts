declare const vex: any; //TODO

export async function changeNoteColor(): Promise<{ color: string; textColor: string } | null> {
    interface ColorButton {
        color: string;
        label: string;
        textColor: string;
    }

    const colorButtons: ColorButton[] = [
        { color: 'darkslategray', label: 'Dark Slate Gray', textColor: 'white' },
        { color: 'saddlebrown', label: 'Saddle Brown', textColor: 'white' },
        { color: 'green', label: 'Green', textColor: 'white' },
        { color: 'darkblue', label: 'Dark Blue', textColor: 'white' },
        { color: 'red', label: 'Red', textColor: 'white' },
        { color: 'yellow', label: 'Yellow', textColor: 'black' },
        { color: 'lime', label: 'Lime', textColor: 'black' },
        { color: 'aqua', label: 'Aqua', textColor: 'black' },
        { color: 'fuchsia', label: 'Fuchsia', textColor: 'white' },
        { color: 'dodgerblue', label: 'Dodger Blue', textColor: 'white' },
        { color: 'hotpink', label: 'Hot Pink', textColor: 'black' },
        { color: 'blanchedalmond', label: 'Blanched Almond', textColor: 'black' }
    ];

    return new Promise<{ color: string; textColor: string } | null>((resolve) => {
        const colorHtml = colorButtons.map(button => `
            <button class="vex-dialog-button" style="background-color: ${button.color}; color: ${button.textColor};" data-color="${button.color}" data-textcolor="${button.textColor}">
                ${button.label}
            </button>
        `).join('');

        const dialog = vex.dialog.open({
            message: 'Select a color',
            input: colorHtml,
            buttons: [],
            callback: () => {
                resolve(null); // Resolve with null if dialog is dismissed
            }
        });

        document.querySelectorAll<HTMLButtonElement>('.vex-dialog-button').forEach(button => {
            button.addEventListener('click', (event) => {
                const selectedButton = event.currentTarget as HTMLButtonElement;
                const color = selectedButton.getAttribute('data-color');
                const textColor = selectedButton.getAttribute('data-textcolor');
                resolve({ color: color!, textColor: textColor! });
                dialog.close();  // Close the dialog
            });
        });
    });
}
