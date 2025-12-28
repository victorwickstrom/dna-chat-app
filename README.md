# DNA Chat Assistant

A privacy-first genetic data exploration tool that lets you ask questions about your DNA without uploading your genetic data to any server.

## Overview

DNA Chat Assistant is a browser-based application that:

- **Keeps your DNA data local** - Your raw genetic file is processed entirely in your browser using IndexedDB
- **Interprets genetic signals** - Uses AI to answer questions about your genetics based on specific SNPs
- **Emphasizes uncertainty** - Highlights evidence levels and avoids diagnostic or prescriptive language
- **Supports multiple vendors** - Works with 23andMe, AncestryDNA, and MyHeritage file formats

## Privacy Architecture

- Raw DNA files never leave your device
- Only minimal genotype summaries (specific rsIDs and their values) are sent to the AI for interpretation
- All preferences and conversation history are stored locally in IndexedDB
- You can export, import, or delete your data at any time

## Prerequisites

- Node.js 18 or higher
- npm 9 or higher

## Installation

```bash
git clone <repository-url>
cd dna-chat-app
npm ci
```

## Development

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

## Building for Production

```bash
npm run build
```

Serve the production build:

```bash
npm run preview
```

## Testing

Run the test suite:

```bash
npm test
```

Tests are automatically run on every push and pull request via GitHub Actions CI.

## Environment Variables

The app requires endpoints for the Planner and Interpreter AI services. Configure these in your environment:

- `VITE_PLANNER_ENDPOINT` - URL for the query planning service
- `VITE_INTERPRETER_ENDPOINT` - URL for the genetic interpretation service

## Features

- **Multi-language support** - Available in Swedish and English
- **Customizable preferences** - Adjust explanation level, tone, and uncertainty display
- **Memory system** - Tracks topic interests and builds a knowledge graph over time
- **Safety classifier** - Blocks diagnostic, prescriptive, and PII-containing questions
- **Export/Import** - Backup and restore your local memory data

## Documentation

- [User Manual](docs/manual.md) - Detailed usage instructions
- [Privacy Policy](src/components/Privacy.tsx) - Data handling information

## Tech Stack

- React 19 + TypeScript
- Vite for bundling
- TailwindCSS for styling
- IndexedDB (via idb) for local storage
- i18next for internationalization
- Jest + React Testing Library for tests
