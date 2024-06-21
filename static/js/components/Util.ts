export function nearbyColor(x: number, y: number, notes: Note[], defaultColor: string = 'white'): string {
    const colorSums: { [color: string]: number } = {};

    notes.forEach(note => {
        const noteCenterX = note.x + note.width / 2;
        const noteCenterY = note.y + note.height / 2;
        const dx = noteCenterX - x;
        const dy = noteCenterY - y;
        const distanceSquared = dx * dx + dy * dy;
        const inverseSquareDistance = 1 / (1 + distanceSquared); // Adding 1 to avoid divide by zero

        if (note.color) {
            if (!colorSums[note.color]) {
                colorSums[note.color] = 0;
            }
            colorSums[note.color] += inverseSquareDistance;
        }
    });

    let maxColor = defaultColor;
    let maxSum = -Infinity;
    for (const color in colorSums) {
        if (colorSums[color] > maxSum) {
            maxSum = colorSums[color];
            maxColor = color;
        }
    }

    return maxColor;
}
