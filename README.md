# Comment Helper

A web app that helps teachers write thoughtful, personalized student comments with AI assistance. Teachers fill in short notes about each student via guided prompts, click "Generate Comment" to get an AI-drafted ~200-word comment, edit it, and finalize.

## Features

- **Google Sign-In** with domain restriction (@nobles.edu)
- **School year / semester / section / student** hierarchy
- **Guided note-taking** with customizable prompts per section and quarter
- **AI comment generation** via Claude API (proxied through Firebase Cloud Function)
- **Auto-save** with debounced writes to Firestore
- **Status tracking** with progress indicators (empty / in-progress / finalized)
- **Past comments viewer** to see a student's comments from earlier quarters
- **Export** finalized comments as Markdown, Word (.docx), or PDF
- **History browser** for reviewing past comments across years and sections
- **Customizable AI system prompt** at teacher and section level

## Tech Stack

- **Frontend:** React + Vite + Tailwind CSS + React Router
- **Auth:** Firebase Authentication (Google Sign-In)
- **Database:** Cloud Firestore with offline persistence
- **API Proxy:** Firebase Cloud Functions (TypeScript)
- **Hosting:** Firebase Hosting
- **CI/CD:** GitHub Actions auto-deploy on push to master

## Local Development

```bash
# Install dependencies
npm install

# Create .env.local with Firebase config (see .env.example)
cp .env.example .env.local

# Start dev server
npm run dev
```

## Deployment

Pushes to `master` automatically build and deploy via GitHub Actions.

To deploy manually:
```bash
npm run build
firebase deploy --only hosting
```

To deploy Cloud Functions:
```bash
cd functions && npm install
firebase deploy --only functions
```

## Project Structure

```
src/
  components/
    auth/        Login page
    dashboard/   Section cards, overview
    setup/       School year, section, student management
    writer/      Comment writing interface
    prompts/     Prompt customization per section/quarter
    history/     Past comment browser
    settings/    Teacher defaults, model selection
    layout/      App shell, top nav
    ui/          Shared components (Modal, AutoTextarea, etc.)
  hooks/         Firestore real-time data hooks
  contexts/      Auth context
  lib/           Constants, utilities, default prompts, export
  config/        Firebase initialization
functions/
  src/index.ts   Cloud Function for Claude API proxy
```
