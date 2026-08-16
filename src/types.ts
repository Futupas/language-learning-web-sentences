export interface Language {
    code: string;
    name: string;
}

export interface WordEntry {
    word: Record<string, string>;
    example?: Record<string, string>;
}

export interface TopicData {
    id: number;
    title: Record<string, string>;
    topicMetadata?: string;
    words: WordEntry[];
    totalWords?: number;
}

export interface CourseConfig {
    learningLanguage: Language;
    targetLanguages: Language[];
    courseMetadata?: string;
    topics: string[];
}

export interface QueuedWord extends WordEntry {
    topicId: number;
    targetLangCode: string;
}

export interface HistoryAction {
    word: QueuedWord;
    isKnown: boolean;
}

export interface Language {
    code: string;
    htmlCode?: string; // E.g., 'de-DE' for flawless browser hyphenation
    name: string;
}
