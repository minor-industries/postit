import { getColorOptions } from './Colors.js';
export async function changeNoteColor() {
    const colorOptions = getColorOptions();
    return new Promise((resolve) => {
        const colorHtml = colorOptions.map(option => `
            <button class="vex-dialog-button" style="background-color: ${option.color}; color: ${option.textColor};" data-color="${option.color}" data-textcolor="${option.textColor}">
                ${option.label}
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
        document.querySelectorAll('.vex-dialog-button').forEach(button => {
            button.addEventListener('click', (event) => {
                const selectedButton = event.currentTarget;
                const color = selectedButton.getAttribute('data-color');
                const textColor = selectedButton.getAttribute('data-textcolor');
                resolve({ color: color, textColor: textColor });
                dialog.close(); // Close the dialog
            });
        });
    });
}
