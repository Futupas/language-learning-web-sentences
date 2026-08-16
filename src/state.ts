import { CourseConfig, TextConfig, TextData } from './types';

export const getCourseUrl = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('course') || './words_de/course_config.json';
};

export const courseUrl = getCourseUrl();
export const courseStorageKey = courseUrl.replace(/[^a-zA-Z0-9]/g, '_');

export const STORAGE_LANG = `selected_lang_${courseStorageKey}`;
export const STORAGE_PROGRESS_PREFIX = `progress_${courseStorageKey}_`;
export const STORAGE_SCROLL_PREFIX = `scroll_${courseStorageKey}_`;

export const appState = {
    config: null as unknown as CourseConfig,
    activeTargetLang: '',
    currentTextConfig: null as TextConfig | null,
    currentTextData: null as TextData | null,
    selectedTags: [] as string[]
};

export function getTextProgress(textId: string): number {
    const val = localStorage.getItem(STORAGE_PROGRESS_PREFIX + textId);
    return val ? parseInt(val, 10) : 0;
}

export function saveTextProgress(textId: string, percent: number) {
    const current = getTextProgress(textId);
    if (percent > current) {
        localStorage.setItem(STORAGE_PROGRESS_PREFIX + textId, percent.toString());
    }
}

export function getSavedScrollPosition(textId: string): string {
    return localStorage.getItem(STORAGE_SCROLL_PREFIX + textId) || '';
}

export function saveScrollPosition(textId: string, headingId: string) {
    localStorage.setItem(STORAGE_SCROLL_PREFIX + textId, headingId);
}
