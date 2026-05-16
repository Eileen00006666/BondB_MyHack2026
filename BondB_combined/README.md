# BondB — Combined (Jaymon Frontend + BondB_v4 Vertex AI Backend)

## What's combined here

| Layer | Source |
|---|---|
| Frontend UI (`src/App.jsx`) | **jaymon** — richer pages: ProgrammeDetailPage, ActorPage with edit, enhanced RelationshipDrawer, all extra features |
| Frontend `api.js` | **BondB_v4** — `analyzeRelationship` accepts full object payload (fromActor, toActor, relType, programme) |
| Backend `analysisController.js` | **BondB_v4** — Vertex AI via `@google/genai` with `GoogleGenAI({ vertexai: true, ... })` |
| Backend `firebaseConfig.js` | **BondB_v4** — tries service account key first, falls back to ADC |
| New tab: **Vertex Demo** | **BondB_v4** — live demo page that calls the backend Vertex AI endpoint |

---

## Setup

### Backend

```bash
cd backend
npm install
```

Edit `.env`:
```
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GOOGLE_CLOUD_LOCATION=global
GOOGLE_GENAI_USE_VERTEXAI=True
GOOGLE_GENAI_MODEL=gemini-3-flash-preview
PORT=5000
```

For Firebase (optional, needed for `/relationships`, `/interactions`, `/graph`):
- Download `serviceAccountKey.json` from Firebase Console
- Place it in `backend/firebase/serviceAccountKey.json`
- Or run `gcloud auth application-default login` for ADC

Start the backend:
```bash
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Vertex AI flow

1. Frontend **Vertex Demo** page → `analyzeRelationship({ fromActor, toActor, relType, programme, message })`
2. → `POST /analyzeRelationship` on Express backend
3. → `analysisController.js` checks `GOOGLE_GENAI_USE_VERTEXAI=true`
4. → calls `GoogleGenAI({ vertexai: true, project, location }).models.generateContent(...)`
5. → returns JSON assessment with `trustScore`, `fitScore`, `insight`, `reasons`, `risks`, `recommendedAction`

The backend also falls back to keyword-based scoring if `GOOGLE_GENAI_USE_VERTEXAI` is not set.
