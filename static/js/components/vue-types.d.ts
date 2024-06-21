// vue-types.d.ts
declare const Vue: {
    extend: (options: any) => any;
    component: (name: string, options: any) => void;
    prototype: any;
};

interface Vue {
    $emit(event: string, ...args: any[]): void;
}
