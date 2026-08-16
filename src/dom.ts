export const views = {
    setup: document.getElementById('setup-view') as HTMLElement,
    reader: document.getElementById('reader-view') as HTMLElement
};

export function switchView(viewName: keyof typeof views) {
    Object.values(views).forEach(el => el.classList.remove('active'));
    views[viewName].classList.add('active');
    window.scrollTo(0, 0);
}

let toastTimeout: ReturnType<typeof setTimeout>;

export function customAlert(message: string) {
    const toast = document.getElementById('toast')!;
    document.getElementById('toast-msg')!.innerText = message;
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
}
