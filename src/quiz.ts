import { appState, saveKnownWord, removeKnownWord } from './state';
import { QueuedWord, HistoryAction } from './types';
import { switchView, views } from './dom';

const SWIPE_THRESHOLD = 100;
const MAX_UNDO_HISTORY = 5;

const quizUI = {
    container: document.getElementById('card-container') as HTMLElement,
    progress: document.getElementById('quiz-progress') as HTMLElement,
    btnKnow: document.getElementById('btn-know') as HTMLButtonElement,
    btnDontKnow: document.getElementById('btn-dont-know') as HTMLButtonElement
};

let quitCallback: (() => void) | null = null;

export function registerQuitCallback(cb: () => void) {
    quitCallback = cb;
}

export function startQuizSession() {
    appState.quizHistory = [];
    shuffleArray(appState.quizQueue);
    switchView('quiz');
    nextCard();
}

export function nextCard() {
    if (appState.quizQueue.length === 0) {
        switchView('end');
        return;
    }
    appState.currentWord = appState.quizQueue.shift()!;
    quizUI.progress.innerText = `${appState.quizQueue.length + 1} left`;
    
    renderCards(appState.currentWord, appState.quizQueue[0] || null);
}

function shuffleArray(arr: any[]) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

function formatWordText(str?: string) {
    if (!str) return '';
    return str.replace(/([^\s])\(/g, '$1 (').replace(/\)([^\s])/g, ') $1');
}

function createCardDOM(wordObj: QueuedWord) {
    let activeDir = appState.currentDirection;
    if (activeDir === 'both') activeDir = Math.random() > 0.5 ? 'learning-to-target' : 'target-to-learning';

    const learnLang = appState.config.learningLanguage;
    const targetLang = appState.config.targetLanguages.find(l => l.code === wordObj.targetLangCode);

    const learnWord = wordObj.word[learnLang.code];
    const targetWord = wordObj.word[wordObj.targetLangCode];

    let frontText, frontLangHint, frontLangAttr;
    let backText, backLangHint, backLangAttr;

    const learnHtmlAttr = learnLang.htmlCode || learnLang.code;
    const targetHtmlAttr = targetLang?.htmlCode || wordObj.targetLangCode;

    if (activeDir === 'learning-to-target') {
        frontText = learnWord; frontLangHint = learnLang.code; frontLangAttr = learnHtmlAttr;
        backText = targetWord; backLangHint = wordObj.targetLangCode; backLangAttr = targetHtmlAttr;
    } else {
        frontText = targetWord; frontLangHint = wordObj.targetLangCode; frontLangAttr = targetHtmlAttr;
        backText = learnWord; backLangHint = learnLang.code; backLangAttr = learnHtmlAttr;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'card-wrapper';

    let exampleHTML = '';
    let hasExample = false;
    
    if (wordObj.example && wordObj.example[learnLang.code] && wordObj.example[wordObj.targetLangCode]) {
        exampleHTML = `
            <div class="example-container">
                <div class="ex-learning" lang="${learnHtmlAttr}">${wordObj.example[learnLang.code]}</div>
                <div class="ex-target" lang="${targetHtmlAttr}">${wordObj.example[wordObj.targetLangCode]}</div>
            </div>
        `;
        hasExample = true;
    }

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
        <div class="card-face card-front" lang="${frontLangAttr}">
            <span class="lang-hint">${frontLangHint}</span>
            <div class="card-content">
                <div class="text">${formatWordText(frontText)}</div>
            </div>
        </div>
        <div class="card-face card-back ${hasExample ? 'has-example' : ''}" lang="${backLangAttr}">
            <span class="lang-hint">${backLangHint}</span>
            <div class="card-content">
                <div class="text">${formatWordText(backText)}</div>
                ${exampleHTML}
            </div>
        </div>
    `;

    wrapper.appendChild(card);
    wrapper.addEventListener('click', () => {
        card.classList.toggle('is-flipped');
    });
    return wrapper;
}

function renderCards(currentWordObj: QueuedWord, nextWordObj: QueuedWord | null, undoAction: HistoryAction | null = null) {
    quizUI.container.innerHTML = '';

    let bgWrapper: HTMLElement | null = null;
    if (nextWordObj) {
        bgWrapper = createCardDOM(nextWordObj);
        bgWrapper.classList.add('bg-card');
        if (undoAction) { bgWrapper.style.transition = 'none'; bgWrapper.style.transform = 'scale(1) translateY(0px)'; bgWrapper.style.opacity = '1'; }
        quizUI.container.appendChild(bgWrapper);
        if (undoAction) {
            bgWrapper.offsetHeight;
            bgWrapper.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
            bgWrapper.style.transform = 'scale(0.85) translateY(30px)'; bgWrapper.style.opacity = '0';
        }
    }

    const fgWrapper = createCardDOM(currentWordObj);
    fgWrapper.classList.add('fg-card');
    if (undoAction) {
        const direction = undoAction.isKnown ? 1 : -1;
        fgWrapper.style.transition = 'none';
        fgWrapper.style.transform = `translateX(${direction * 500}px) rotate(${direction * 30}deg)`;
        fgWrapper.style.opacity = '0';
    }
    quizUI.container.appendChild(fgWrapper);

    if (undoAction) {
        fgWrapper.offsetHeight;
        fgWrapper.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        fgWrapper.style.transform = ''; fgWrapper.style.opacity = '1';
    }

    // --- BULLETPROOF MOBILE GESTURE DETECTOR (WITH SCROLL LOCKING) ---
    let startX = 0, startY = 0, currentX = 0;
    let isDragging = false, isScrolling = false, isSwiping = false;

    const getX = (e: any) => (e.touches && e.touches.length > 0) ? e.touches[0].clientX : e.clientX;
    const getY = (e: any) => (e.touches && e.touches.length > 0) ? e.touches[0].clientY : e.clientY;

    const onDown = (e: any) => {
        isDragging = true;
        isScrolling = false;
        isSwiping = false;
        startX = getX(e);
        startY = getY(e);
        
        fgWrapper.style.transition = 'none';
        if (bgWrapper) bgWrapper.style.transition = 'none';
    };

    const onMove = (e: any) => {
        if (!isDragging) return;
        
        const x = getX(e);
        const y = getY(e);
        const deltaX = x - startX;
        const deltaY = y - startY;

        // Lock in the gesture direction (threshold of 5px to quickly determine intent)
        if (!isScrolling && !isSwiping) {
            if (Math.abs(deltaY) > 5 && Math.abs(deltaY) > Math.abs(deltaX)) {
                isScrolling = true; // User wants to scroll vertically
            } else if (Math.abs(deltaX) > 5 && Math.abs(deltaX) > Math.abs(deltaY)) {
                isSwiping = true; // User wants to swipe horizontally
            }
        }

        // If scrolling vertically, let the browser scroll, but reset the card to center
        if (isScrolling) {
            fgWrapper.style.transition = 'transform 0.3s ease'; 
            fgWrapper.style.transform = '';
            if (bgWrapper) { 
                bgWrapper.style.transition = 'transform 0.3s ease, opacity 0.3s ease'; 
                bgWrapper.style.transform = 'scale(0.85) translateY(30px)'; 
            }
            return;
        }

        // If swiping horizontally, BLOCK native vertical scrolling
        if (isSwiping) {
            if (e.cancelable) e.preventDefault();
        }

        currentX = deltaX;
        fgWrapper.style.transform = `translateX(${currentX}px) rotate(${currentX * 0.05}deg)`;
        
        if (bgWrapper) {
            const progress = Math.min(Math.abs(currentX) / (SWIPE_THRESHOLD * 1.5), 1);
            bgWrapper.style.transform = `scale(${0.85 + (0.15 * progress)}) translateY(${30 - (30 * progress)}px)`;
            bgWrapper.style.opacity = `${0 + (1.0 * progress)}`;
        }
    };

    const onUp = () => {
        if (!isDragging || isScrolling) return;
        isDragging = false;
        
        if (currentX > SWIPE_THRESHOLD) { 
            animateCardAway(fgWrapper, 1); animateBgCardUp(bgWrapper); handleAnswer(true); 
        } else if (currentX < -SWIPE_THRESHOLD) { 
            animateCardAway(fgWrapper, -1); animateBgCardUp(bgWrapper); handleAnswer(false); 
        } else {
            fgWrapper.style.transition = 'transform 0.3s ease'; 
            fgWrapper.style.transform = '';
            if (bgWrapper) { 
                bgWrapper.style.transition = 'transform 0.3s ease, opacity 0.3s ease'; 
                bgWrapper.style.transform = 'scale(0.85) translateY(30px)'; 
                bgWrapper.style.opacity = '0'; 
            }
        }
        currentX = 0;
    };

    // Bind Dual Mouse + Touch Events
    fgWrapper.addEventListener('mousedown', onDown);
    fgWrapper.addEventListener('touchstart', onDown, { passive: true });

    window.addEventListener('mousemove', onMove);
    // CRITICAL: passive MUST be false here so we can call e.preventDefault()
    window.addEventListener('touchmove', onMove, { passive: false });

    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    window.addEventListener('touchcancel', onUp);

    (fgWrapper as any).cleanup = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('mouseup', onUp);
        window.removeEventListener('touchend', onUp);
        window.removeEventListener('touchcancel', onUp);
    };
}

export function triggerCardAction(isKnown: boolean) {
    const fgWrapper = quizUI.container.querySelector('.fg-card') as HTMLElement;
    const bgWrapper = quizUI.container.querySelector('.bg-card') as HTMLElement;
    if (fgWrapper) animateCardAway(fgWrapper, isKnown ? 1 : -1);
    animateBgCardUp(bgWrapper);
    handleAnswer(isKnown);
}

function animateCardAway(wrapper: HTMLElement, direction: number) {
    wrapper.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    wrapper.style.transform = `translateX(${direction * 500}px) rotate(${direction * 30}deg)`;
    wrapper.style.opacity = '0';
    if ((wrapper as any).cleanup) (wrapper as any).cleanup();
}

function animateBgCardUp(bgWrapper: HTMLElement | null) {
    if (!bgWrapper) return;
    bgWrapper.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    bgWrapper.style.transform = 'scale(1) translateY(0px)';
    bgWrapper.style.opacity = '1';
}

function handleAnswer(isKnown: boolean) {
    if (!appState.currentWord) return;
    pushToHistory(appState.currentWord, isKnown);
    
    if (isKnown) saveKnownWord(appState.currentWord.topicId, appState.currentWord.word[appState.config.learningLanguage.code]);
    else appState.quizQueue.push(appState.currentWord);
    
    setTimeout(() => nextCard(), 300);
}

function pushToHistory(word: QueuedWord, isKnown: boolean) {
    try {
        if (appState.quizHistory.length >= MAX_UNDO_HISTORY) {
            appState.quizHistory.shift();
        }
        appState.quizHistory.push({ 
            word: JSON.parse(JSON.stringify(word)), 
            isKnown 
        });
        updateUndoButtonState();
    } catch (err) {
        console.error("Failed to push to undo history:", err);
    }
}

export function handleUndo() {
    try {
        if (appState.quizHistory.length === 0) return;
        
        const lastAction = appState.quizHistory.pop()!;
        if (appState.currentWord) {
            appState.quizQueue.unshift(appState.currentWord);
        }

        if (lastAction.isKnown) {
            const langCode = appState.config?.learningLanguage?.code;
            if (langCode) {
                removeKnownWord(lastAction.word.topicId, lastAction.word.word[langCode]);
            }
        } else {
            appState.quizQueue.pop();
        }

        appState.currentWord = lastAction.word;
        quizUI.progress.innerText = `${appState.quizQueue.length + 1} left`;
        
        renderCards(appState.currentWord, appState.quizQueue[0] || null, lastAction);
        updateUndoButtonState();
    } catch (err) {
        console.error("Undo execution failed:", err);
    }
}

export function updateUndoButtonState() {
    const undoBtn = document.getElementById('undo-btn') as HTMLButtonElement;
    if (undoBtn) {
        undoBtn.disabled = appState.quizHistory.length === 0;
    }
}

function handleKeyboardControls(e: KeyboardEvent) {
    if (!views.quiz.classList.contains('active')) return;
    const code = e.code;

    if ((e.ctrlKey || e.metaKey) && code === 'KeyZ') {
        e.preventDefault();
        handleUndo();
        return;
    }

    if ((e.ctrlKey || e.metaKey) && code === 'KeyQ') {
        e.preventDefault();
        if (quitCallback) quitCallback();
        return;
    }

    const flipCodes = ['Space', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyS'];
    const leftCodes = ['KeyA', 'ArrowLeft', 'ShiftLeft'];
    const rightCodes = ['KeyD', 'ArrowRight', 'ShiftRight'];

    if (flipCodes.includes(code)) {
        e.preventDefault();
        const card = quizUI.container.querySelector('.fg-card .card') as HTMLElement;
        if (card) {
            card.classList.toggle('is-flipped');
        }
    } else if (leftCodes.includes(code)) {
        e.preventDefault();
        triggerCardAction(false);
    } else if (rightCodes.includes(code)) {
        e.preventDefault();
        triggerCardAction(true);
    }
}

window.addEventListener('keydown', handleKeyboardControls);
