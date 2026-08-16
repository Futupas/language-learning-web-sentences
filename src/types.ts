export interface Language {
    code: string;
    htmlCode?: string;
    name: string;
}

export interface TextConfig {
    id: string;
    file: string;
    tags: string[];
    hasAudio?: boolean;
    title: Record<string, string>;
}

export interface CourseConfig {
    learningLanguage: Language;
    targetLanguages: Language[];
    courseMetadata?: string;
    texts: TextConfig[];
}

export interface SegmentLang {
    text: string;
    explanation?: string;
}

export interface Segment {
    [langCode: string]: SegmentLang;
}

export interface Block {
    type: string;
    segments: Segment[];
}

export interface TextData {
    id: string;
    metadata?: string | Record<string, string>;
    audio?: string;
    blocks: Block[];
}
