import { appState, courseUrl, getReadTexts, toggleReadText, getSavedScrollPosition, saveScrollPosition } from './state';
import { TextConfig, TextData, Segment } from './types';
import { switchView, customAlert } from './dom';
import { renderTextsList } from './main';

const readerUI = {
    container: document.getElementById('text-container') as HTMLElement,
    backBtn: document.getElementById('back-btn') as HTMLButtonElement,
    markBtn: document.getElementById('mark-read-btn') as HTMLButtonElement,
    audioContainer: document.getElementById('audio-container') as HTMLElement,
    panel: document.getElementById('translation-panel') as HTMLElement,
    panelText: document.getElementById('trans-text') as HTMLElement,
    panelExpl: document.getElementById('trans-expl') as HTMLElement,
    closePanelBtn: document.getElementById('close-panel-btn') as HTMLButtonElement
};

let activeAudio: HTMLAudioElement | null = null;
let scrollTimeout: ReturnType<typeof setTimeout>;

export async function openReader(textConfig: TextConfig) {
    appState.currentTextConfig = textConfig;
    readerUI.container.innerHTML = '<p>Loading...</p>';
    readerUI.audioContainer.innerHTML = '';
    closePanel();
    switchView('reader');

    try {
        const baseUrl = new URL(courseUrl, window.location.href);
        const textUrl = new URL(textConfig.file, baseUrl).href;
        
        const res = await fetch(textUrl);
        const data: TextData = await res.json();
        appState.currentTextData = data;
        
        renderText();
        setupAudio(textUrl);
        updateMarkButton();
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
            
            span.addEventListener('click', () => {
                document.querySelectorAll('.segment').forEach(s => s.classList.remove('active'));
                span.classList.add('active');
                showTranslation(segment);
            });

            el.appendChild(span);
        });

        readerUI.container.appendChild(el);
    });
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

function showTranslation(segment: Segment) {
    const targetLang = appState.activeTargetLang;
    const data = segment[targetLang] || segment[appState.config.targetLanguages[0].code];
    
    if (!data) return;

    readerUI.panelText.innerText = data.text;
    readerUI.panelExpl.innerText = data.explanation || '';
    
    if (!data.explanation) readerUI.panelExpl.style.display = 'none';
    else readerUI.panelExpl.style.display = 'block';

    readerUI.panel.classList.add('show');
}

function closePanel() {
    readerUI.panel.classList.remove('show');
    document.querySelectorAll('.segment').forEach(s => s.classList.remove('active'));
}

function updateMarkButton() {
    if (!appState.currentTextConfig) return;
    const isRead = getReadTexts().includes(appState.currentTextConfig.id);
    readerUI.markBtn.innerText = isRead ? 'Mark Unread' : '✔ Mark Read';
    readerUI.markBtn.classList.toggle('is-read', isRead);
}

readerUI.backBtn.addEventListener('click', () => {
    if (activeAudio) {
        activeAudio.pause();
        activeAudio = null;
    }
    window.removeEventListener('scroll', handleScroll);
    closePanel();
    renderTextsList();
    switchView('setup');
});

readerUI.closePanelBtn.addEventListener('click', closePanel);

readerUI.markBtn.addEventListener('click', () => {
    if (!appState.currentTextConfig) return;
    const isRead = getReadTexts().includes(appState.currentTextConfig.id);
    toggleReadText(appState.currentTextConfig.id, !isRead);
    updateMarkButton();
    if (!isRead) {
        customAlert('Marked as read!');
    }
});

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && readerUI.panel.classList.contains('show')) {
        closePanel();
    }
});
