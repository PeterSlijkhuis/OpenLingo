# OpenLingo

**Practise every part of the Dutch NT2 exam, for free, in your browser.**

### ▶ [Open the app: peterslijkhuis.github.io/OpenLingo](https://peterslijkhuis.github.io/OpenLingo/)

Works on phone and desktop. Nothing to install.

---

## What you can practise

Pick your level on the home screen, then pick an exam part.

| Level | Exam |
| --- | --- |
| **A2** | Inburgeringsexamen |
| **B1** | Staatsexamen NT2, Programma I |
| **B2** | Staatsexamen NT2, Programma II |

| Part | What you do in the app | The real exam |
| --- | --- | --- |
| 🗣️ **Spreken** (speaking) | Read a situation, or look at pictures to describe, compare or tell as a story, and answer out loud within the exam's time limit. Get written feedback, corrections and a model answer. Take a full mock exam. | On a computer. B1: 8 short (20 s) and 8 medium (30 s) answers. B2: 4 short, 8 medium and 1 two-minute talk. A2: 16 questions of about a minute. |
| ✍️ **Schrijven** (writing) | Write an email, message or short text. Get corrections, scores and a model answer. | B1/B2: 100 minutes of sentence tasks and writing tasks. A2: 4 writing tasks on paper. |
| 📖 **Lezen** (reading) | Read an everyday text and answer multiple-choice questions, with an explanation for each answer. | B1/B2: 6 texts with 36 multiple-choice questions. A2: 65 minutes. |
| 🎧 **Luisteren** (listening) | Listen to a conversation or announcement, answer multiple-choice questions, then read the text you heard. | B1/B2: about 40 multiple-choice questions, each fragment heard once. A2: 45 minutes. |
| 🏛️ **KNM** (knowledge of Dutch society) | Multiple-choice questions about work, health, housing, history, government and daily life. | A separate part of inburgering. Not part of the Staatsexamen. |

Exam formats come from [staatsexamensnt2.nl](https://www.staatsexamensnt2.nl/voorbereiden/hoe-ziet-het-examen-eruit)
and [inburgeren.nl](https://www.inburgeren.nl/examen-doen/inhoud-taalexamens-a2-b1-b2.jsp).

## How it works

- **Unlimited, adaptive practice.** Every exercise is newly written for you. Topics rotate, and
  the next exercise targets your weakest point and gets easier or harder based on your results.
- **Clear scoring.** Speaking and writing are scored on the four exam criteria, *inhoud*,
  *woordenschat*, *grammatica* and *samenhang*, from 0 to 3. A 2 on each is roughly a pass.
  Quizzes show your percentage, and about 70% is roughly a pass.
- **Private speech recognition.** For speaking, [Whisper](https://github.com/openai/whisper) runs
  inside your browser via [transformers.js](https://github.com/huggingface/transformers.js). Your
  voice never leaves your device.
- **Pictures.** Picture tasks come with simple drawings for free. With an OpenAI key you can switch
  to photo-like AI images, at about a cent per picture.
- **Listening voices.** Fragments are read by your device's own Dutch voices for free. With an
  OpenAI key, two male and two female AI voices sound more natural, at about 1 to 2 cents per
  fragment.
- **Your progress stays with you.** Results are saved in your browser only. See them under
  *Progress*.

## Getting started

1. Open the [app](https://peterslijkhuis.github.io/OpenLingo/).
2. Choose your level (A2, B1 or B2) and start with any part. That's it: by default everything is
   free and runs in your browser.

### Choose your coach

The coach writes the exercises and gives feedback. Pick one under **Settings**:

| Coach | Cost | Good to know |
| --- | --- | --- |
| **In your browser** (default) | Free, no account | Runs [Gemma 4](https://huggingface.co/onnx-community/gemma-4-E2B-it-ONNX) on your own device. Downloads about 3 GB once and needs a desktop browser with WebGPU (recent Chrome or Edge). Nothing leaves your computer. Feedback is simpler than with the online options. |
| **Google Gemini** | Free key, no credit card | Best free quality. Get a key at [Google AI Studio](https://aistudio.google.com/apikey). Free-tier data may be used by Google, and there is a daily limit. Works on phones. |
| **Hugging Face** | Small free monthly credit | Open models via a [Hugging Face token](https://huggingface.co/settings/tokens). |
| **OpenAI** | A few cents per session | Also unlocks natural AI voices for listening and photo-like pictures. |
| **Other** | Depends | Any OpenAI-compatible server, for example Ollama or LM Studio on your own computer. |

Keys are stored only in your browser. Speech recognition is always free and local: the first
speaking exercise downloads the Whisper model (about 250 MB for the default "small" model).

## Good to know

- All exercises are original practice material, not official exam content. Also practise with
  the official exams: [Staatsexamen NT2](https://oefenexamensnt2.nl) and
  [Inburgering (DUO)](https://www.inburgeren.nl/examen-doen/oefenen.jsp).
- Pronunciation is not scored, because feedback works from the transcript.
- Scores are an indication. The real exams are marked by trained examiners.

## Development

```bash
npm ci --ignore-scripts
npm run dev      # local server at http://localhost:5173
npm test         # unit tests
npm run build    # static site in dist/
```

Built with Vite, React and TypeScript, with no backend. Pushes to `main` are tested and deployed to
GitHub Pages by `.github/workflows/pages.yml`.

## License

MIT
