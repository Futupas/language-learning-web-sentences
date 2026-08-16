import { CourseConfig, TopicData, QueuedWord, HistoryAction } from './types';

export const getCourseUrl = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('course') || './words_ge/course_config.json';
};

export const courseUrl = getCourseUrl();
export const courseStorageKey = courseUrl.replace(/[^a-zA-Z0-9]/g, '_');

export const STORAGE_LANG = `selected_lang_${courseStorageKey}`;
export const STORAGE_KNOWN_PREFIX = `known_${courseStorageKey}_topic_`;

export const appState = {
    config: null as unknown as CourseConfig,
    topicsData: [] as TopicData[],
    quizQueue: [] as QueuedWord[],
    quizHistory: [] as HistoryAction[],
    currentWord: null as QueuedWord | null,
    currentDirection: 'learning-to-target'
};

export function getKnownWords(topicId: number): string[] {
    const data = localStorage.getItem(STORAGE_KNOWN_PREFIX + topicId);
    return data ? JSON.parse(data) : [];
}

export function saveKnownWord(topicId: number, learningWord: string) {
    const known = getKnownWords(topicId);
    if (!known.includes(learningWord)) {
        known.push(learningWord);
        localStorage.setItem(STORAGE_KNOWN_PREFIX + topicId, JSON.stringify(known));
    }
}

export function removeKnownWord(topicId: number, learningWord: string) {
    const known = getKnownWords(topicId);
    const index = known.indexOf(learningWord);
    if (index > -1) {
        known.splice(index, 1);
        localStorage.setItem(STORAGE_KNOWN_PREFIX + topicId, JSON.stringify(known));
    }
}
