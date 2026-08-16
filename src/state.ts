import { CourseConfig, TextConfig, TextData } from './types';

export const getCourseUrl = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('course') || './words_de/course_config.json';
};

export const courseUrl = getCourseUrl();
export const courseStorageKey = courseUrl.replace(/[^a-zA-Z0-9]/g, '_');

export const STORAGE_LANG = `selected_lang_${courseStorageKey}`;
export const STORAGE_READ_PREFIX = `read_${courseStorageKey}_`;
export const STORAGE_SCROLL_PREFIX = `scroll_${courseStorageKey}_`;

export const appState = {
    config: null as unknown as CourseConfig,
    activeTargetLang: '',
    currentTextConfig: null as TextConfig | null,
    currentTextData: null as TextData | null,
    selectedTags: [] as string[]
};

export function getReadTexts(): string[] {
    const data = localStorage.getItem(STORAGE_READ_PREFIX);
    return data ? JSON.parse(data) : [];
}

export function toggleReadText(textId: string, isRead: boolean) {
    let read = getReadTexts();
    if (isRead && !read.includes(textId)) {
        read.push(textId);
    } else if (!isRead) {
        read = read.filter(id => id !== textId);
    }
    localStorage.setItem(STORAGE_READ_PREFIX, JSON.stringify(read));
}

export function getSavedScrollPosition(textId: string): string {
    return localStorage.getItem(STORAGE_SCROLL_PREFIX + textId) || '';
}

export function saveScrollPosition(textId: string, headingId: string) {
    localStorage.setItem(STORAGE_SCROLL_PREFIX + textId, headingId);
}
