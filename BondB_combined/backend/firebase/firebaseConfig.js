const admin = require("firebase-admin");
require("dotenv").config();

let db = null;

try {
  let credential;

  try {
    const serviceAccount = require("./serviceAccountKey.json");
    credential = admin.credential.cert(serviceAccount);
    console.log("Firebase initialized with service account key");
  } catch {
    credential = admin.credential.applicationDefault();
    console.log("Firebase initialized with application default credentials");
  }

  admin.initializeApp({ credential });
  db = admin.firestore();
} catch (error) {
  console.warn("Firebase credentials not available. To use Firebase:");
  console.warn(
    "1. Download serviceAccountKey.json from Firebase Console, or run gcloud auth application-default login"
  );
  console.warn("2. Place it in backend/firebase/serviceAccountKey.json");
  console.warn("3. Restart the server");
  console.warn("Server will run without Firebase for now.");
}

module.exports = db;
