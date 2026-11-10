# LifeAI — Your Intelligent Life Assistant

LifeAI is a mobile-first Progressive Web App (PWA) designed for Android and the web. This first release is a usable foundation with local-first everyday tools and a separate, secure server gateway for online AI features.

## Included in release 1.0.0

### Working on the device (offline after the first successful load)
- Responsive dashboard and bottom navigation
- Persian, English, and Arabic interface with RTL/LTR switching
- Tasks with completion and filters
- Notes with local create/delete
- Income and expense tracking with multiple currencies
- Daily habit tracker
- Calculator, unit converter, and percentage calculator
- Document image capture/upload, local IndexedDB storage, and browser Print → Save as PDF
- Dark/light theme
- JSON export and restore for tasks, notes, finance, habits, preferences, and activity
- PWA manifest, app icons, and service worker app-shell caching

### Online AI foundation
- AI assistant modes for general help, translation, writing, learning, and planning
- A Node.js API service that calls the OpenAI Responses API on the server
- The browser stores only the backend URL. The OpenAI API key remains in the server environment.

## What is not enabled yet

- AI requires deployment of `backend/` and a valid server-side `OPENAI_API_KEY`.
- The scanner currently captures and stores document images; OCR text extraction and automatic perspective correction are not implemented in this first release.
- Calendar, email, messaging, cloud sync, user accounts, payments, and automatic reminders are not connected yet.
- Offline data is stored separately in each browser/device. It is not synchronized. The JSON backup currently covers the app's localStorage records; saved document images in IndexedDB are not included.
- Android installation is provided as an installable PWA through Chrome. A signed standalone APK and Play Store release are later packaging/release steps.

## Publish the web app with GitHub Pages

1. Create a **new public repository** named `LifeAI` under your GitHub account.
2. Upload the contents of this folder to the repository root. Do not upload the enclosing `lifeai-release` folder as a nested directory.
3. Commit to the `main` branch.
4. Open **Settings → Pages**.
5. Under **Build and deployment**, select **Deploy from a branch**.
6. Select `main` and `/(root)`, then Save.
7. After the Pages deployment finishes, the site will be available at:
   `https://YOUR_GITHUB_USERNAME.github.io/LifeAI/`

The `index.html`, `styles.css`, `app.js`, `manifest.webmanifest`, and `sw.js` files must remain at the repository root. GitHub Pages serves the frontend over HTTPS, which is required for service workers and PWA installation.

## Install on Android

1. Open the published HTTPS address in Chrome on Android.
2. Open Chrome's menu and choose **Install app** or **Add to Home screen**.
3. Confirm the installation. LifeAI will appear in the app launcher and open in standalone mode.

On iPhone, open the address in Safari, tap Share, and choose Add to Home Screen.

## Deploy the AI backend

The frontend and backend are intentionally separate. GitHub Pages hosts the static PWA; it does not run Node.js API routes.

1. Deploy the `backend` directory to a Node.js host that supports Node 20 or newer.
2. Set these environment variables in the host dashboard:
   - `OPENAI_API_KEY`: your private OpenAI API key
   - `OPENAI_MODEL`: a model available to your API project
   - `APP_ORIGIN`: your exact frontend origin, for example `https://YOUR_GITHUB_USERNAME.github.io`
   - `PORT`: usually supplied by the hosting provider
3. The start command is `npm start`.
4. Check `https://YOUR_BACKEND_HOST/health`. It should return `{ "ok": true, ... }`.
5. In LifeAI open **Settings → AI server connection** and enter the backend origin only, for example `https://your-lifeai-api.example.com` (do not append `/api/ai`). Save.
6. Open the AI Assistant and test a short request.

Do not put the API key in `app.js`, HTML, a GitHub Pages secret used by the browser, or any public repository file. The key belongs only in the server's environment variables.

### Run the backend locally

```bash
cd backend
npm install
cp .env.example .env
# Edit .env and add your server-side OPENAI_API_KEY and APP_ORIGIN
npm start
```

For local frontend testing, serve the project root over HTTP (not by opening `index.html` as a `file://` URL). For example:

```bash
npx serve .
```

Then set `APP_ORIGIN` to the exact local frontend origin shown by the server and enter `http://localhost:8787` as the AI endpoint in LifeAI Settings.

## Privacy and security notes

- LifeAI's first-release tasks, notes, finance, habits, and preferences are saved in the current browser's local storage.
- Saved document images are stored locally in IndexedDB.
- Do not store passwords, payment card details, or highly sensitive identity/medical documents in this prototype.
- Keep `.env` out of Git. `.gitignore` already excludes it.
- The API gateway applies basic request rate limiting and an origin allowlist. Production deployments should add user authentication, per-user quotas, monitoring, and stronger abuse controls before a public launch.

## Roadmap

1. OCR and automatic document cropping
2. Secure user accounts and encrypted cloud sync
3. Calendar, email, and reminder integrations with explicit permissions
4. Native Android packaging and accessibility improvements
5. Subscription and billing infrastructure after product validation

## Project structure

```text
LifeAI/
├── assets/
│   ├── icon-192.png
│   └── icon-512.png
├── backend/
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── .gitignore
├── .nojekyll
├── app.js
├── index.html
├── manifest.webmanifest
├── README.md
├── styles.css
└── sw.js
```
