# Language Learning Reader App

A lightweight, high-performance, client-side web application designed for language learners to read structured texts, click on any word, phrase, or sentence to view inline explanations and translations, and track reading progress dynamically.

---

## 🚀 Core Features

- **Multi-Language Support**: Dynamically loads course configurations and supports multiple target languages (e.g., English, Ukrainian, Czech, Russian) with a base learning language (e.g., German).
- **Inline Splitting Explanations ("Knife-Cut" Accordions)**: Clicking any segment within a heading (`h1`, `h2`) or paragraph (`p`) instantly splits the text inline, showing translations and grammar/usage explanations directly beneath it without breaking reading flow. Multiple explanations can be opened simultaneously.
- **Dynamic Scroll-Based Progress**: Automatically computes reading progress ratio (`0` to `1`) based on real-time scroll depth (`scrollTop / maxScroll`), persisting percentages locally and updating the main menu instantly.
- **Position Restoration**: Remembers your exact scroll position per text, automatically restoring it when reopening the document.
- **Custom Audio Player**: Built-in minimalist audio bar with play/pause, progress scrubbing, and skip back/forward (-10s / +10s) controls.
- **Tag Filtering**: Toggle multiple tags on the setup screen to easily filter through available reading materials.
- **Client-Side Storage**: Runs completely offline using `localStorage` for progress persistence.

---

## 🏗️ Architecture

The app is built with **Vanilla TypeScript**, **SCSS**, and bundled using **Vite**. It contains zero backend frameworks and operates entirely via client-side routing and dynamic JSON fetching.

### File Structure
```text
├── about.html                 # About / Legal and course entry links
├── index.html                 # Main application view (Setup & Reader)
├── public/
│   └── words_de/
│       ├── course_config.json # Course metadata, language setup, and text index
│       ├── text_1.json        # Individual multi-lingual text content block
│       └── text_2.json        # ...
└── src/
    ├── main.ts                # Entry point, tag filters, course initialization
    ├── reader.ts              # Document parser, inline accordion renderer, scroll tracking
    ├── state.ts               # LocalStorage wrappers, progress calculations, app state
    ├── dom.ts                 # View switcher and UI notification toasts
    ├── types.ts               # TypeScript interfaces (CourseConfig, TextData, Block, Segment)
    ├── style.scss             # Stylesheet importer
    └── styles/                # Modular SCSS stylesheets (_base, _setup, _reader, _variables)
```

---

## 📄 JSON Architecture & Examples

Courses are driven by two levels of configuration: a global **Course Config** index and individual **Text Data** files. Every language (learning and target) is treated equally in the structural data layout.

### 1. Course Config Example (`course_config.json`)
Acts as the index mapping out metadata, language codes, target options, and available reading texts.

```json
{
  "learningLanguage": { "code": "de", "htmlCode": "de-DE", "name": "Deutsch" },
  "targetLanguages": [
    { "code": "en", "htmlCode": "en-US", "name": "English" },
    { "code": "uk", "htmlCode": "uk-UA", "name": "Українська" },
    { "code": "cs", "htmlCode": "cs-CZ", "name": "Čeština" },
    { "code": "ru", "htmlCode": "ru-RU", "name": "Русский" }
  ],
  "courseMetadata": "German A1 Real-Life Reading Practice",
  "texts": [
    {
      "id": "text_1",
      "file": "text_1.json",
      "tags": ["A1", "Basics"],
      "hasAudio": false,
      "title": {
        "de": "Ein ganz normaler Montag",
        "en": "A completely normal Monday",
        "uk": "Звичайнісінький понеділок",
        "cs": "Úplně normální pondělí",
        "ru": "Совершенно обычный понедельник"
      }
    }
  ]
}
```

### 2. Text Data Example (`text_1.json`)
Contains structural blocks (`h1`, `h2`, `p`) made up of fine-grained granular segments. Each segment provides text and optional linguistic explanations across all supported language keys.

```json
{
  "id": "text_1",
  "metadata": "Source: Real-Life Conversations (A1 Level)",
  "audio": "./audio/text_1.mp3",
  "blocks": [
    {
      "type": "h1",
      "segments": [
        {
          "de": { "text": "Guten Tag!", "explanation": "Die offizielle Begrüßung." },
          "en": { "text": "Good day!", "explanation": "Standard polite greeting." },
          "uk": { "text": "Добрий день!", "explanation": "Стандартне ввічливе привітання." },
          "cs": { "text": "Dobrý den!", "explanation": "Standardní zdvořilý pozdrav." },
          "ru": { "text": "Добрый день!", "explanation": "Стандартное вежливое приветствие." }
        }
      ]
    },
    {
      "type": "p",
      "segments": [
        {
          "de": { "text": "Mein Name ist ", "explanation": "Verwendung von 'mein Name ist' zur Vorstellung." },
          "en": { "text": "My name is ", "explanation": "Use of 'my name is' for introductions." },
          "uk": { "text": "Мене звати ", "explanation": "Використання для знайомства." },
          "cs": { "text": "Jmenuji se ", "explanation": "Použití pro představování." },
          "ru": { "text": "Меня зовут ", "explanation": "Используется для знакомства." }
        },
        {
          "de": { "text": "Thomas.", "explanation": "Ein typischer deutscher Vorname." },
          "en": { "text": "Thomas.", "explanation": "A typical German first name." },
          "uk": { "text": "Томас.", "explanation": "Типове німецьке ім'я." },
          "cs": { "text": "Thomas.", "explanation": "Typické německé jméno." },
          "ru": { "text": "Томас.", "explanation": "Типичное немецкое имя." }
        }
      ]
    }
  ]
}
```

---

## 🛠️ Local Development & Scripts

- **Install dependencies**: `npm install`
- **Run local development server**: `npm run dev`
- **Build for production**: `npm run build`
- **Preview production build**: `npm run preview`
