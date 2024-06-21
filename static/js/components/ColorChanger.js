export function changeNoteColor() {
    const colorButtons = [
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

    return new Promise((resolve) => {
        const colorHtml = colorButtons.map(button => `
            <button class="vex-dialog-button" style="background-color: ${button.color}; color: ${button.textColor};" onclick="selectColor('${button.color}', '${button.textColor}')">
                ${button.label}
            </button>
        `).join('');

        vex.dialog.open({
            message: 'Select a color',
            input: colorHtml,
            buttons: [],
            callback: () => {}
        });

        window.selectColor = (color, textColor) => {
            resolve({ color, textColor });
            vex.closeAll();  // Close all vex dialogs
        };
    });
}
