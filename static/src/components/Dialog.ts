declare const vex: any; // This needs to be loaded in the html

vex.defaultOptions.className = 'vex-theme-default';

export function openDialog(options: any) {
    return vex.dialog.open(options);
}

export function alertMessage(message: string) {
    return vex.dialog.alert({message: message});
}
