# OpenLingo

Practise the speaking part of the Dutch NT2 exams in your browser:

- **A2**: Inburgeringsexamen Spreken
- **B1**: Staatsexamen NT2 Programma I, Spreken
- **B2**: Staatsexamen NT2 Programma II, Spreken

You read a situation, answer out loud within the exam's time limit, and get written coaching.

## How it works

- **Unlimited situations.** Every task is newly generated in the official format (short, medium
  and long answers with the exam's timings). Topics rotate, and the next situation adapts to your
  recent scores: it targets your weakest criterion and gets harder or easier as you improve.
- **Speech recognition in the browser.** Whisper runs locally via
  [transformers.js](https://github.com/huggingface/transformers.js). Your voice never leaves your
  device. The model (base, small or large-v3 turbo) downloads once and is cached.
- **Written coaching.** Each answer is scored on *inhoud*, *woordenschat*, *grammatica* and
  *samenhang* (0 to 3, where 2 is roughly a pass). You get corrections, a model answer and one
  concrete tip for what to practise next.
- **Mock exam.** A full exam in the official order and timing, with feedback at the end.
- **Your own API key.** Situations and coaching come from a language model you choose. Any
  OpenAI-compatible API works. The key is stored only in your browser.

Pronunciation is not scored, because the coach works from the transcript. The coach points out
garbled or unexpected words as possible pronunciation issues.

The tasks are original practice material, not official exam content. Practise with the official
exams too: [Staatsexamen NT2](https://oefenexamensnt2.nl) and
[Inburgering](https://www.inburgeren.nl/examen-doen/oefenen.jsp).

## Development

```bash
npm ci --ignore-scripts
npm run dev      # local server
npm test         # unit tests
npm run build    # static site in dist/
```

## Deployment

`.github/workflows/pages.yml` tests, builds and deploys `main` to GitHub Pages. Enable it once under
**Settings → Pages → Build and deployment → Source: GitHub Actions**.

## License

MIT
