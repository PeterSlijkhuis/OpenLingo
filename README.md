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
- **Pictures, free or realistic.** Picture tasks come with simple drawings for free. In Settings you
  can switch to AI images made with your own key, at about a cent per picture.
- **Natural listening voices.** Fragments are read by two male and two female AI voices on your
  key, about 1 to 2 cents per fragment, so each speaker sounds different. You can switch to your
  device's own voices for free in Settings.
- **Your progress stays with you.** Results are saved in your browser only. See them under
  *Progress*.

## Getting started

1. Open the [app](https://peterslijkhuis.github.io/OpenLingo/).
2. Go to **Settings** and paste an API key from [OpenAI](https://platform.openai.com/api-keys), or
   from any OpenAI-compatible service. The key is stored only in your browser and is used to
   create exercises and give feedback. A practice session usually costs a few cents.
3. Choose your level (A2, B1 or B2) and start with any part.

The first speaking exercise downloads the speech model, which is about 250 MB for the default
"small" model. After that it is cached.

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
