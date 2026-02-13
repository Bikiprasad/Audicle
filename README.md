# Audicle
> **Turn the Web into Your Personal Podcast with Audicle.**
> *Local-First Neural Text-to-Speech for Articles & Tweets.*

![Audicle Banner](/assets/20260127_081245.jpg)

[![Plasmo](https://img.shields.io/badge/Built%20With-Plasmo-blue?style=for-the-badge)](https://www.plasmo.com/)
[![React](https://img.shields.io/badge/React-18-blue?logo=react&style=for-the-badge)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript&style=for-the-badge)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0-blue?logo=tailwindcss&style=for-the-badge)](https://tailwindcss.com/)
[![Kokoro TTS](https://img.shields.io/badge/Neural%20TTS-Kokoro%2082M-orange?style=for-the-badge)](https://huggingface.co/hexgrad/Kokoro-82M)

## Overview
**Audicle** is a powerful Chrome Extension that transforms written content into high-fidelity audio. Unlike traditional screen readers, Audicle focuses on **listening experience** and **speed reading**.

It bridges the gap between web content and neural audio by integrating:
1.  **Local Inference**: Use [Kokoro-82M](https://github.com/remsky/Kokoro-FastAPI) for free, private, offline synthesis.
2.  **Premium Voice Quality**: Optional integration with **ElevenLabs** for premium voices.
3.  **RSVP Speed Reading**: Consume text at 3x speed with visual guides.

## Key Features
- **Local-First Architecture**: Your library lives on your device. Zero tracking, zero cloud dependency (unless you choose it).
- **Neural Voice Engine**: Support for `Kokoro-82M` (via Localhost API) for near-human quality with <200ms latency.
- **RSVP Speed Reader**: "Rapid Serial Visual Presentation" mode synchronizes audio with single-word visual updates to reduce eye strain.
- **Twitter/X Integration**: Automatically scrapes metadata (Author, Avatar, Timestamp) when saving tweets.
- **Analytics Dashboard**: Track your listening habits, daily usage, and total words consumed.[under development]
- **Beautiful UI**: Crafted with Tailwind CSS, framer-motion animations, and a responsive glassmorphic design.

## Getting Started

### Prerequisites
- **Node.js** (v18+)
- **pnpm** or **npm**
- **Docker** (Optional, for running Kokoro server)

### Installation
1.  **Clone the Repository**
    ```bash
    git clone https://github.com/yourusername/audicle.git
    cd audicle
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Start Development Server**
    ```bash
    npm run dev
    ```
    This will load the extension into Chrome. Open `chrome://extensions`, enable **Developer Mode**, and click **Load Unpacked** pointing to the `build/chrome-mv3-dev` folder.

## Setup: Voice Engines

### Option A: Local Inference (Recommended)
Get free, unlimited, high-quality TTS by running the model locally.

1.  **Clone Kokoro-FastAPI**
    ```bash
    git clone https://github.com/remsky/Kokoro-FastAPI.git
    cd Kokoro-FastAPI
    ```
2.  **Run with Docker** (Easiest)
    ```bash
    docker-compose up --build
    ```
    *Or run manually with Python/uvicorn.*
3.  **Connect Audicle**
    - Go to **Settings** in the Dashboard.
    - Enable **Kokoro TTS**.
    - Endpoint is usually `http://localhost:8880`.

### Option B: ElevenLabs Cloud
1.  Get an API Key from [ElevenLabs.io](https://elevenlabs.io).
2.  Go to **Settings** -> **ElevenLabs**.
3.  Paste your API Key.

## Architecture

```mermaid
graph TD
    subgraph Browser Extension
        Popup[Popup UI]
        SidePanel[SidePanel Player]
        Bg[Background Service Worker]
        Content[Content Script]
        Storage[(Chrome Storage)]
    end

    subgraph Local Machine
        Kokoro[Kokoro-FastAPI Server]
        Model[Kokoro-82M ONNX]
    end

    subgraph Cloud
        EL[ElevenLabs API]
        Bulbul V3 for Indian Languages[Sarvam AI API]
    end

    Content -->|Scrapes Text| Bg
    Bg -->|Saves| Storage
    Bg -->|Fetches Audio| Kokoro
    Bg -->|Fetches Audio| EL
    Kokoro -->|Runs| Model
```

## Development
This project uses **Plasmo**, a framework for browser extensions.

- `popup.tsx`: The extension popup (Quick Player).
- `options.tsx`: The full Dashboard (Home, Library, Analytics).
- `background.ts`: Service worker handling audio streaming and downloads.
- `contents/`: Scripts for parsing article text.

**Open Source software.**

## Credits
- **Model**: [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M)
- **Kokoro FastAPI**: https://github.com/remsky/Kokoro-FastAPI
- **Framework**: [Plasmo](https://docs.plasmo.com)
