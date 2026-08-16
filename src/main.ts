import './style.scss';
import { appState, STORAGE_LANG, getKnownWords, courseUrl, STORAGE_KNOWN_PREFIX } from './state';
import { TopicData } from './types';
import { switchView, customAlert } from './dom';
import { startQuizSession, triggerCardAction, handleUndo, updateUndoButtonState, registerQuitCallback } from './quiz';

const setupUI = {
    langGroup: document.getElementById('lang-group') as HTMLElement,
    dirGroup: document.getElementById('dir-group') as HTMLElement,
    topicsContainer: document.getElementById('topics-container') as HTMLElement,
    startBtn: document.getElementById('start-btn') as HTMLButtonElement,
    courseMeta: document.getElementById('course-metadata') as HTMLElement
};

async function init() {
    setupSingleSelectGroups();
    
    registerQuitCallback(() => {
        renderTopicsList();
        switchView('setup');
    });
    
    try {
        // Fetch the config from the full URL
        const configRes = await fetch(courseUrl);
        if (!configRes.ok) throw new Error('Config missing');
        appState.config = await configRes.json();
        
        if (appState.config.courseMetadata) setupUI.courseMeta.innerText = appState.config.courseMetadata;

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

        // Create a base URL object so we know where to look for topic files
        const baseUrl = new URL(courseUrl, window.location.href);

        await Promise.all(appState.config.topics.map(async (filename) => {
            try {
                // Dynamically resolve the topic path relative to the config file's location
                const topicUrl = new URL(filename, baseUrl).href;
                const res = await fetch(topicUrl);
                const data: TopicData = await res.json();
                
                const uniqueLearningWords = new Set(data.words.map(w => w.word[appState.config.learningLanguage.code]?.trim()));
                data.totalWords = uniqueLearningWords.size;
                appState.topicsData.push(data);
            } catch (err) {
                console.error(`Failed to load ${filename} from ${baseUrl}`);
            }
        }));

        appState.topicsData.sort((a, b) => a.id - b.id);
        updateLanguageUI();
    } catch (e) {
        setupUI.topicsContainer.innerHTML = `<p>Error loading config from <b>${courseUrl}</b>.</p>`;
    }

    setupUI.startBtn.addEventListener('click', startQuiz);
    
    document.getElementById('back-btn')?.addEventListener('click', () => { renderTopicsList(); switchView('setup'); });
    document.getElementById('finish-btn')?.addEventListener('click', () => { renderTopicsList(); switchView('setup'); });

    document.getElementById('btn-know')?.addEventListener('click', () => triggerCardAction(true));
    document.getElementById('btn-dont-know')?.addEventListener('click', () => triggerCardAction(false));
    document.getElementById('undo-btn')?.addEventListener('click', handleUndo);

    document.getElementById('toast-close')?.addEventListener('click', () => {
        document.getElementById('toast')?.classList.remove('show');
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const setupView = document.getElementById('setup-view');
            if (setupView?.classList.contains('active') && !setupUI.startBtn.disabled) {
                e.preventDefault();
                startQuiz();
            }
        }
    });
}

function setupSingleSelectGroups() {
    const handleGroupClick = (group: HTMLElement, callback?: (val: string) => void) => {
        group.addEventListener('click', (e) => {
            const btn = (e.target as HTMLElement).closest('.toggle-btn') as HTMLElement;
            if (btn) {
                group.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                if (callback) callback(btn.dataset.val!);
            }
        });
    };
    handleGroupClick(setupUI.langGroup, (val) => { localStorage.setItem(STORAGE_LANG, val); updateLanguageUI(); });
    handleGroupClick(setupUI.dirGroup, (val) => { appState.currentDirection = val; updateLanguageUI(); });
}

function getActiveTargetLang() {
    const active = setupUI.langGroup.querySelector('.selected') as HTMLElement;
    return active ? active.dataset.val! : appState.config.targetLanguages[0].code;
}

function updateLanguageUI() {
    const langCode = getActiveTargetLang();
    const langName = appState.config.targetLanguages.find(l => l.code === langCode)?.name || langCode;
    const learnName = appState.config.learningLanguage.name;
    
    const btnL2T = setupUI.dirGroup.querySelector('[data-val="learning-to-target"]');
    const btnT2L = setupUI.dirGroup.querySelector('[data-val="target-to-learning"]');
    if (btnL2T) btnL2T.innerHTML = `${learnName} ➔ ${langName}`;
    if (btnT2L) btnT2L.innerHTML = `${langName} ➔ ${learnName}`;

    renderTopicsList();
}

function parseHashIds(): number[] {
    const hash = window.location.hash.substring(1);
    if (!hash) return [];
    return hash.split(',').map(str => {
        const match = str.match(/topic_(\d+)/);
        return match ? parseInt(match[1]) : null;
    }).filter(id => id !== null) as number[];
}

function updateHash() {
    const selectedBtns = setupUI.topicsContainer.querySelectorAll('.lection-toggle.selected');
    const ids = Array.from(selectedBtns).map(btn => `topic_${(btn as HTMLElement).dataset.val}`);
    history.replaceState(null, '', ids.length ? `#${ids.join(',')}` : ' ');
}

function renderTopicsList() {
    setupUI.topicsContainer.innerHTML = '';
    const initialSelectedIds = parseHashIds();
    const currentLang = getActiveTargetLang();
    
    appState.topicsData.forEach(topic => {
        const row = document.createElement('div');
        row.className = 'lection-row';
        
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'toggle-btn lection-toggle';
        toggleBtn.dataset.val = topic.id.toString();

        const learnName = topic.title[appState.config.learningLanguage.code] || 'Unnamed';
        const targetName = topic.title[currentLang] || '';
        
        const knownCount = getKnownWords(topic.id).length;
        const totalCount = topic.totalWords || 0;
        const percent = totalCount > 0 ? Math.round((knownCount / totalCount) * 100) : 0;
        const isCompleted = percent === 100;

        toggleBtn.innerHTML = `
            <div class="lection-main">Topic ${topic.id}: ${learnName}</div>
            <div class="lection-sub">${targetName}</div>
            <div class="lection-progress-container"><div class="lection-progress-bar ${isCompleted ? 'completed' : ''}" style="width: ${percent}%;"></div></div>
            <div class="lection-progress-text ${isCompleted ? 'completed' : ''}">${knownCount}/${totalCount} learnt (${percent}%)</div>
        `;
        
        if (initialSelectedIds.includes(topic.id)) toggleBtn.classList.add('selected');

        toggleBtn.addEventListener('click', () => { toggleBtn.classList.toggle('selected'); validateStartButton(); updateHash(); });

        const clearBtn = document.createElement('button');
        clearBtn.className = 'clear-btn';
        clearBtn.innerText = 'Clear';
        clearBtn.addEventListener('click', () => {
            // Use the new dynamic prefix!
            localStorage.removeItem(STORAGE_KNOWN_PREFIX + topic.id);
            customAlert(`Cleared known words for Topic ${topic.id}`);
            renderTopicsList();
        });

        row.appendChild(toggleBtn);
        row.appendChild(clearBtn);
        setupUI.topicsContainer.appendChild(row);
    });
    validateStartButton();
}

function validateStartButton() {
    const selected = setupUI.topicsContainer.querySelectorAll('.lection-toggle.selected');
    setupUI.startBtn.disabled = selected.length === 0;
}

async function startQuiz() {
    const selectedBtns = setupUI.topicsContainer.querySelectorAll('.lection-toggle.selected');
    const selectedIds = Array.from(selectedBtns).map(btn => parseInt((btn as HTMLElement).dataset.val!));
    const targetLangCode = getActiveTargetLang();
    
    setupUI.startBtn.innerText = 'Loading...';
    setupUI.startBtn.disabled = true;
    appState.quizQueue = [];

    for (const topic of appState.topicsData) {
        if (selectedIds.includes(topic.id)) {
            const knownWords = getKnownWords(topic.id);
            topic.words.forEach(wordObj => {
                const learnString = wordObj.word[appState.config.learningLanguage.code];
                if (!knownWords.includes(learnString)) {
                    appState.quizQueue.push({ ...wordObj, topicId: topic.id, targetLangCode });
                }
            });
        }
    }

    setupUI.startBtn.innerText = 'Start Quiz';
    setupUI.startBtn.disabled = false;

    if (appState.quizQueue.length === 0) {
        customAlert('All words in these topics are already known! Clear data to start over.');
        return;
    }

    startQuizSession();
    updateUndoButtonState();
}

init();
