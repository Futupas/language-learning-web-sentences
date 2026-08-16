# 🌍 Language-Agnostic Flashcards

A lightning-fast, highly responsive, and completely language-agnostic flashcard application built with Vanilla TypeScript, SCSS, and Vite.

**👉 [Live Demo (GitHub Pages)](https://futupas.github.io/language-learning-web-flascards/)**

---

## 🏗 Architecture Overview

This app is built to be as lightweight and fluid as possible, relying strictly on native browser APIs. No heavy frontend frameworks (React/Vue) were used.

*   **TypeScript**: Fully typed data models (`src/types.ts`) ensuring predictable JSON parsing and strict app state.
*   **SCSS**: Modular stylesheets (`src/styles/`). Uses a highly advanced **Pure CSS Grid Stack** for 3D card flipping, allowing dynamic height adjustments without JavaScript DOM measurement recalculations.
*   **Vite**: Lightning-fast build tool and dev server. Configured to expose to LAN for easy mobile testing.
*   **GitHub Actions**: Automated CI/CD pipeline building and deploying the Vite project directly to GitHub Pages.
*   **LocalStorage**: User progress is saved locally. Keys are automatically namespaced using a sanitized version of the course URL, meaning different courses will never overwrite each other.
*   **Mobile Gestures**: Custom bulletproof touch detection. It utilizes direction-locking math (X vs Y vectors) to instantly distinguish between horizontal swiping and vertical reading/scrolling.

---

## 🚀 How to Run Locally

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the dev server (exposed to your local network for mobile testing):
   ```bash
   npm run dev
   ```

---

## 📂 Creating Your Own Courses

The app is entirely data-driven. It reads a `course_config.json` file to build the UI, determine target languages, and fetch vocabulary topics. 

You can load **any** valid course configuration by passing it via the URL parameter:
`http://localhost:5173/?course=./words_de/course_config.json`
*(It can even load courses from external servers if CORS is enabled!)*

### 1. `course_config.json`
This is the master file for a course. It defines the language being learned, the available translation languages, and the paths to the topic files.

**Important Note on `htmlCode`**: Always include the correct BCP 47/ISO code (e.g., `de-DE`, `uk-UA`). The app applies this to the HTML `lang` attribute, which triggers native OS-level grammar dictionaries for perfect hyphenation on long words!

```json
{
  "learningLanguage": { "code": "de", "htmlCode": "de-DE", "name": "Deutsch" },
  "targetLanguages": [
    { "code": "en", "htmlCode": "en-US", "name": "English" },
    { "code": "uk", "htmlCode": "uk-UA", "name": "Українська" },
    { "code": "cs", "htmlCode": "cs-CZ", "name": "Čeština" }
  ],
  "courseMetadata": "German A1 Vocabulary Basics",
  "topics": [
    "topic_1.json",
    "topic_2.json"
  ]
}
```

### 2. Topic Files (e.g., `topic_1.json`)
The topic files live relative to wherever the `course_config.json` is located. 
Each topic contains an array of words. `example` sentences are optional. If a word does not have an example, the card will perfectly center the word automatically.

```json
{
  "id": 1,
  "title": { 
    "de": "Grundlagen", 
    "en": "Basics", 
    "uk": "Основи", 
    "cs": "Základy" 
  },
  "words": [
    {
      "word": { 
        "de": "Entschuldigung", 
        "en": "Excuse me", 
        "uk": "Вибачте", 
        "cs": "Promiňte" 
      },
      "example": {
        "de": "Entschuldigung, wo ist der Bahnhof?",
        "en": "Excuse me, where is the train station?",
        "uk": "Вибачте, де знаходиться вокзал?",
        "cs": "Promiňte, kde je vlakové nádraží?"
      }
    },
    {
      "word": { 
        "de": "Hallo", 
        "en": "Hello", 
        "uk": "Привіт", 
        "cs": "Ahoj" 
      }
    }
  ]
}
```

## ⌨️ Desktop Keyboard Controls

When taking a quiz on a computer, you can use the following shortcuts:

*   **Flip Card**: `Space`, `W`, `S`, `ArrowUp`, `ArrowDown`
*   **Know (Swipe Right)**: `D`, `ArrowRight`, `RightShift`
*   **Don't Know (Swipe Left)**: `A`, `ArrowLeft`, `LeftShift`
*   **Undo Last Action**: `Ctrl+Z` / `Cmd+Z`
*   **Quit Quiz**: `Ctrl+Q` / `Cmd+Q`
*   **Start Quiz (From Setup)**: `Enter`
