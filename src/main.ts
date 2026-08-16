import './style.scss';
import { appState, STORAGE_LANG, getTextProgress, courseUrl } from './state';
import { switchView } from './dom';
import { openReader } from './reader';

const setupUI = {
    langGroup: document.getElementById('lang-group') as HTMLElement,
    tagsContainer: document.getElementById('tags-container') as HTMLElement,
    textsContainer: document.getElementById('texts-container') as HTMLElement,
    courseMeta: document.getElementById('course-metadata') as HTMLElement
};

async function init() {
    setupSingleSelectGroups();
    
    try {
        const configRes = await fetch(courseUrl);
        if (!configRes.ok) throw new Error('Config missing');
        appState.config = await configRes.json();
        
        if (appState.config.courseMetadata) {
            setupUI.courseMeta.innerText = appState.config.courseMetadata;
        }

        setupUI.langGroup.innerHTML = '';
        appState.config.targetLanguages.forEach(lang => {
            const btn = document.createElement('button');
            btn.className = 'toggle-btn';
            btn.dataset.val = lang.code;
            btn.innerText = lang.name;
            setupUI.langGroup.appendChild(btn);
        });

        const savedLang = localStorage.getItem(STORAGE_LANG) || appState.config.targetLanguages[0].code;
        const langBtn = setupUI.langGroup.querySelector(`[data-val="${savedLang}"]`);
        if (langBtn) langBtn.classList.add('selected');
        appState.activeTargetLang = savedLang;

        renderTagsFilter();
        renderTextsList();

        handleHashChange();
    } catch (e) {
        setupUI.textsContainer.innerHTML = `<p>Error loading config from <b>${courseUrl}</b>.</p>`;
    }

    window.addEventListener('popstate', handleHashChange);
}

function handleHashChange() {
    const hash = window.location.hash.substring(1);
    if (!hash) {
        switchView('setup');
    } else if (appState.config) {
        const targetText = appState.config.texts.find(t => t.id === hash);
        if (targetText) {
            openReader(targetText, false);
        }
    }
}

function setupSingleSelectGroups() {
    setupUI.langGroup.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest('.toggle-btn') as HTMLElement;
        if (btn) {
            setupUI.langGroup.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            const val = btn.dataset.val!;
            localStorage.setItem(STORAGE_LANG, val);
            appState.activeTargetLang = val;
            renderTextsList();
        }
    });
}

function renderTagsFilter() {
    setupUI.tagsContainer.innerHTML = '';
    const allTags = Array.from(new Set(appState.config.texts.flatMap(t => t.tags)));
    
    if (allTags.length === 0) {
        setupUI.tagsContainer.style.display = 'none';
        return;
    }

    allTags.forEach(tag => {
        const btn = document.createElement('button');
        btn.className = 'toggle-btn tag-filter-btn';
        btn.dataset.val = tag;
        btn.innerText = tag;
        
        btn.addEventListener('click', () => {
            btn.classList.toggle('selected');
            if (appState.selectedTags.includes(tag)) {
                appState.selectedTags = appState.selectedTags.filter(t => t !== tag);
            } else {
                appState.selectedTags.push(tag);
            }
            renderTextsList();
        });

        setupUI.tagsContainer.appendChild(btn);
    });
}

export function renderTextsList() {
    setupUI.textsContainer.innerHTML = '';
    
    const filteredTexts = appState.config.texts.filter(text => {
        if (appState.selectedTags.length === 0) return true;
        return appState.selectedTags.every(tag => text.tags.includes(tag));
    });

    if (filteredTexts.length === 0) {
        setupUI.textsContainer.innerHTML = '<p class="subtitle">No texts match the selected filters.</p>';
        return;
    }

    filteredTexts.forEach(text => {
        const ratio = getTextProgress(text.id); // e.g. 0.45
        const percent = Math.round(ratio * 100); // e.g. 45
        const isCompleted = percent >= 99;
        
        const row = document.createElement('div');
        row.className = 'text-row';
        
        const openBtn = document.createElement('button');
        openBtn.className = 'text-open-btn';

        const learnName = text.title[appState.config.learningLanguage.code] || 'Unnamed';
        const targetName = text.title[appState.activeTargetLang] || '';
        const tagsHtml = text.tags.map(t => `<span class="tag">${t}</span>`).join('');
        const audioIcon = text.hasAudio ? '🔊 ' : '';

        openBtn.innerHTML = `
            <div class="text-main">${audioIcon}${learnName}</div>
            <div class="text-sub">${targetName}</div>
            <div class="text-meta">
                <div class="tags">${tagsHtml}</div>
                <div class="text-progress-text ${isCompleted ? 'completed' : ''}">${percent}% read</div>
            </div>
            <div class="lection-progress-container">
                <div class="lection-progress-bar ${isCompleted ? 'completed' : ''}" style="width: ${percent}%;"></div>
            </div>
        `;
        
        openBtn.addEventListener('click', () => {
            history.pushState(null, '', `#${text.id}`);
            openReader(text);
        });
        row.appendChild(openBtn);
        setupUI.textsContainer.appendChild(row);
    });
}

init();
