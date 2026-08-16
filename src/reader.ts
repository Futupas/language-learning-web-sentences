import { appState, courseUrl, getTextProgress, saveTextProgress, getSavedScrollPosition, saveScrollPosition } from './state';
import { TextConfig, TextData, Segment } from './types';
import { switchView } from './dom';
import { renderTextsList } from './main';

const readerUI = {
    container: document.getElementById('text-container') as HTMLElement,
    backBtn: document.getElementById('back-btn') as HTMLButtonElement,
    audioContainer: document.getElementById('audio-container') as HTMLElement
};

let activeAudio: HTMLAudioElement | null = null;
let scrollTimeout: ReturnType<typeof setTimeout>;

export async function openReader(textConfig: TextConfig) {
    appState.currentTextConfig = textConfig;
    readerUI.container.innerHTML = '<p>Loading...</p>';
    readerUI.audioContainer.innerHTML = '';
    switchView('reader');

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

    appState.currentTextData.blocks.forEach((block, index) => {
        const el = document.createElement(block.type);
        el.className = 'text-block';
        el.lang = learnLang.htmlCode || learnLang.code;
        
        if (block.type === 'h1' || block.type === 'h2') {
            el.id = `heading_${index}`;
        }

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

    // Close any other open expansions if desired, or keep multiple open. User said: "open as many as i want"
    span.classList.add('active');

    const targetLang = appState.activeTargetLang;
    const data = segment[targetLang] || segment[appState.config.targetLanguages[0].code];
    if (!data) return;

    const expansionBox = document.createElement('div');
    expansionBox.className = 'inline-expansion';
    expansionBox.innerHTML = `
        <div class="expansion-content">
            <div class="exp-text"><strong>${data.text}</strong></div>
            ${data.explanation ? `<div class="exp-expl">${data.explanation}</div>` : ''}
        </div>
    `;

    // Insert right after this segment (knife cut)
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
    window.removeEventListener('scroll', handleScroll);
    window.addEventListener('scroll', handleScroll);
}

function handleScroll() {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        if (!appState.currentTextConfig) return;
        
        // Calculate scroll percentage
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = docHeight > 0 ? Math.min(100, Math.round((scrollTop / docHeight) * 100)) : 100;
        saveTextProgress(appState.currentTextConfig.id, scrollPercent);

        // Save current heading position
        const headings = readerUI.container.querySelectorAll('h1, h2');
        let currentHeadingId = '';

        headings.forEach(h => {
            const rect = h.getBoundingClientRect();
            if (rect.top <= 100) {
                currentHeadingId = h.id;
            }
        });

        if (currentHeadingId) {
            saveScrollPosition(appState.currentTextConfig.id, currentHeadingId);
        }
    }, 300);
}

function restoreScrollPosition() {
    if (!appState.currentTextConfig) return;
    
    // Also set initial 0% progress if not set
    if (getTextProgress(appState.currentTextConfig.id) === 0) {
        saveTextProgress(appState.currentTextConfig.id, 0);
    }

    const savedId = getSavedScrollPosition(appState.currentTextConfig.id);
    if (savedId) {
        setTimeout(() => {
            const el = document.getElementById(savedId);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 50);
    }
}

readerUI.backBtn.addEventListener('click', () => {
    if (activeAudio) {
        activeAudio.pause();
        activeAudio = null;
    }
    window.removeEventListener('scroll', handleScroll);
    renderTextsList();
    switchView('setup');
});
