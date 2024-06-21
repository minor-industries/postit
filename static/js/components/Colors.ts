interface ColorOption {
    color: string;
    label: string;
    textColor: string;
}

const colorOptions: ColorOption[] = [
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

export function getColorOptions(): ColorOption[] {
    return colorOptions;
}

export function getTextColorForBackground(color: string): string {
    const option = colorOptions.find(option => option.color === color);
    return option ? option.textColor : 'black';
}
