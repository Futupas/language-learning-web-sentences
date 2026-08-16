import { appState, courseUrl, getTextProgress, saveTextProgress } from './state';
import { TextConfig, TextData, Segment } from './types';
import { switchView } from './dom';

const readerUI = {
    container: document.getElementById('text-container') as HTMLElement,
    backBtn: document.getElementById('back-btn') as HTMLButtonElement,
    audioContainer: document.getElementById('audio-container') as HTMLElement
};

let activeAudio: HTMLAudioElement | null = null;
let scrollListener: (() => void) | null = null;

export async function openReader(textConfig: TextConfig, updateHistory = true) {
    appState.currentTextConfig = textConfig;
    readerUI.container.innerHTML = '<p>Loading...</p>';
    readerUI.audioContainer.innerHTML = '';
    switchView('reader');

    if (updateHistory) {
        history.pushState(null, '', `#${textConfig.id}`);
    }

    try {
        const baseUrl = new URL(courseUrl, window.location.href);
        const textUrl = new URL(textConfig.file, baseUrl).href;
        
        const res = await fetch(textUrl);
        const data: TextData = await res.json();
        appState.currentTextData = data;
        
        renderText();
        setupAudio(textUrl);
        restoreScrollPosition();
        setupScrollObserver();
    } catch (err) {
        readerUI.container.innerHTML = '<p>Failed to load text data.</p>';
    }
}

function renderText() {
    if (!appState.currentTextData) return;
    
    readerUI.container.innerHTML = '';
    const learnLang = appState.config.learningLanguage;

    appState.currentTextData.blocks.forEach((block) => {
        const el = document.createElement(block.type);
        el.className = 'text-block';
        el.lang = learnLang.htmlCode || learnLang.code;

        block.segments.forEach(segment => {
            const segData = segment[learnLang.code];
            if (!segData) return;

            const span = document.createElement('span');
            span.className = 'segment';
            span.innerText = segData.text;
            
            span.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleInlineExplanation(span, segment);
            });

            el.appendChild(span);
        });

        readerUI.container.appendChild(el);
    });
}

function toggleInlineExplanation(span: HTMLElement, segment: Segment) {
    const existingExpl = span.nextElementSibling;
    if (existingExpl && existingExpl.classList.contains('inline-expansion')) {
        existingExpl.remove();
        span.classList.remove('active');
        return;
    }

    span.classList.add('active');

    const targetLang = appState.activeTargetLang;
    const learningLang = appState.config.learningLanguage.code;
    
    const transData = segment[targetLang] || segment[appState.config.targetLanguages[0].code];
    const learnData = segment[learningLang];

    const translationText = transData ? transData.text : '';
    const explanationText = (transData && transData.explanation) || (learnData && learnData.explanation) || '';

    const expansionBox = document.createElement('div');
    expansionBox.className = 'inline-expansion';
    expansionBox.innerHTML = `
        <div class="expansion-content">
            <div class="exp-text"><strong>${translationText}</strong></div>
            ${explanationText ? `<div class="exp-expl">${explanationText}</div>` : ''}
        </div>
    `;

    span.after(expansionBox);
}

function setupAudio(textUrl: string) {
    if (!appState.currentTextData?.audio) return;
    const audioUrl = new URL(appState.currentTextData.audio, textUrl).href;
    
    if (activeAudio) {
        activeAudio.pause();
        activeAudio = null;
    }

    activeAudio = new Audio(audioUrl);

    readerUI.audioContainer.innerHTML = `
        <div class="custom-audio-player">
            <button id="audio-play-btn" class="secondary-btn audio-btn">▶</button>
            <button id="audio-back-btn" class="secondary-btn audio-btn" title="-10s">↺10</button>
            <div class="audio-progress-bar" id="audio-progress">
                <div class="audio-progress-fill" id="audio-fill"></div>
            </div>
            <button id="audio-fwd-btn" class="secondary-btn audio-btn" title="+10s">10↻</button>
        </div>
    `;

    const playBtn = document.getElementById('audio-play-btn')!;
    const backBtn = document.getElementById('audio-back-btn')!;
    const fwdBtn = document.getElementById('audio-fwd-btn')!;
    const progressBar = document.getElementById('audio-progress')!;
    const fill = document.getElementById('audio-fill')!;

    playBtn.addEventListener('click', () => {
        if (activeAudio?.paused) {
            activeAudio.play();
            playBtn.innerText = '⏸';
        } else {
            activeAudio?.pause();
            playBtn.innerText = '▶';
        }
    });

    backBtn.addEventListener('click', () => {
        if (activeAudio) activeAudio.currentTime = Math.max(0, activeAudio.currentTime - 10);
    });

    fwdBtn.addEventListener('click', () => {
        if (activeAudio) activeAudio.currentTime = Math.min(activeAudio.duration || 0, activeAudio.currentTime + 10);
    });

    activeAudio.addEventListener('timeupdate', () => {
        if (!activeAudio || !activeAudio.duration) return;
        const percent = (activeAudio.currentTime / activeAudio.duration) * 100;
        fill.style.width = `${percent}%`;
    });

    activeAudio.addEventListener('ended', () => {
        playBtn.innerText = '▶';
        fill.style.width = '0%';
    });

    progressBar.addEventListener('click', (e) => {
        if (!activeAudio || !activeAudio.duration) return;
        const rect = progressBar.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        activeAudio.currentTime = pos * activeAudio.duration;
    });
}

function setupScrollObserver() {
    if (scrollListener) {
        window.removeEventListener('scroll', scrollListener);
    }

    /* 
     * TODO: NOTE FOR REFACTORING
     * Pure scroll-percentage tracking is a crude hack. Users can fling to the bottom 
     * without actually reading anything and falsely trigger completion. 
     * This should eventually be replaced by a proper Intersection Observer 
     * tracking fully read blocks or time-spent algorithms.
     */
    scrollListener = () => {
        if (!appState.currentTextConfig) return;
        
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = document.documentElement.clientHeight;
        
        const maxScroll = scrollHeight - clientHeight;
        let ratio = 0;
        
        if (maxScroll > 0) {
            ratio = Math.min(1, Math.max(0, scrollTop / maxScroll));
        } else {
            ratio = 1; 
        }

        saveTextProgress(appState.currentTextConfig.id, ratio);
    };

    window.addEventListener('scroll', scrollListener, { passive: true });
}

function restoreScrollPosition() {
    if (!appState.currentTextConfig) return;
    
    const ratio = getTextProgress(appState.currentTextConfig.id);
    if (ratio > 0) {
        setTimeout(() => {
            const scrollHeight = document.documentElement.scrollHeight;
            const clientHeight = document.documentElement.clientHeight;
            const maxScroll = scrollHeight - clientHeight;
            const targetPixelY = ratio * maxScroll;

            window.scrollTo({ top: targetPixelY, behavior: 'smooth' });
        }, 150);
    }
}

readerUI.backBtn.addEventListener('click', () => {
    if (activeAudio) {
        activeAudio.pause();
        activeAudio = null;
    }
    if (scrollListener) {
        window.removeEventListener('scroll', scrollListener);
    }
    history.pushState(null, '', window.location.pathname + window.location.search);
    switchView('setup');
});
