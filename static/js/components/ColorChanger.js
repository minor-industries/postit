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

    const colorHtml = colorButtons.map(button => `
        <button class="swal2-styled" style="background-color: ${button.color}; color: ${button.textColor};" onclick="selectColor('${button.color}', '${button.textColor}')">
            ${button.label}
        </button>
    `).join('');

    return new Promise((resolve) => {
        Swal.fire({
            title: 'Select a color',
            html: colorHtml,
            showConfirmButton: false,
            didOpen: () => {
                window.selectColor = (color, textColor) => {
                    resolve({ color, textColor });
                    Swal.close();
                };
            }
        });
    });
}
