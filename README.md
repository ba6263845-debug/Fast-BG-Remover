# CutOut Pro - AI Background Remover

CutOut Pro is a high-performance, studio-grade AI background remover web application built with React, TypeScript, Tailwind CSS, Express, and modern vision matting pipelines.

## Features

- **Automated AI Matting**: Fast segmentation with alpha matting preservation for hair, fur, transparent glass, and intricate borders.
- **Interactive Studio Workspace**:
  - Drag-and-drop, file browsing, and clipboard paste (Ctrl+V)
  - Before / After split curtain comparison slider
  - Precision Erase & Restore manual refine brushes with adjustable diameter and edge falloff
  - Background replacement: Transparent checkerboard, Solid color palette & custom HEX, Studio gradients, and Custom background image upload
  - Natural drop shadow generator (blur, opacity, X/Y offset, tint)
  - Auto-crop to subject bounding box with custom margin padding
  - One-click marketplace presets: Amazon / Shopify (1000x1000 square on white), Etsy & eBay (2000x2000), Instagram (1080x1080), Passport / ID Photo (35x45mm)
  - Smooth canvas Zoom (20% to 400%) & Pan
  - Undo / Redo / Reset history stack
- **Batch Processing Studio**:
  - Queue up to 20 images simultaneously
  - Live progress tracking per item
  - One-click bulk export as structured ZIP archive
- **Developer REST API**:
  - `/api/remove-bg`: High-speed JSON/base64 background removal endpoint
  - `/api/v1/remove-bg`: Authenticated public API with `X-API-Key` support and rate limiting
  - Live API key generator & multi-language code snippets (cURL, Python, Node.js)
- **Bilingual Internationalization (i18n)**:
  - Full interface support for English and Bengali (বাংলা)
- **Design & Dual Themes**:
  - Light mode & Dark mode with smooth transitions
  - Strict compliance with anti-slop guidelines and WCAG AA contrast standards
  - Zero-storage privacy guarantee with automatic client-side EXIF sanitization

---

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Local Development

1. Clone or open the project folder:
```bash
git clone https://github.com/your-username/cutout-pro.git
cd cutout-pro
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```
*(Optional: set `GEMINI_API_KEY` to enable Gemini AI multimodal matting alongside the built-in algorithmic engine).*

4. Start development server:
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## Docker Setup

### Using Docker Compose

```bash
docker-compose up --build
```
Access the application at `http://localhost:3000`.

---

## Deployment

### Full-Stack (Render / Railway / VPS)

1. Build the frontend:
```bash
npm run build
```

2. Start the Express server:
```bash
npm start
```

### Frontend-Only (Vercel / Netlify / Cloudflare Pages)

Run `npm run build` to generate the static single-page app in `dist/`. The client-side canvas matting engine runs directly in the browser with zero external server dependencies!

---

## API Reference

### Background Removal

```http
POST /api/remove-bg
Content-Type: application/json

{
  "image": "data:image/png;base64,...",
  "model": "BiRefNet-General",
  "feather": 2,
  "tolerance": 20
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "resultImage": "data:image/png;base64,...",
  "mimeType": "image/png",
  "modelUsed": "BiRefNet-General",
  "processingTimeMs": 140
}
```

---

## Privacy & Security

- **Zero-Persistence Guarantee**: Images are processed transiently in memory. No customer images are stored permanently or used for model training.
- **EXIF Sanitization**: Camera serials, GPS coordinates, and camera timestamps are stripped before processing.
