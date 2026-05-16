const express = require("express");
const cors = require("cors");

const relationshipRoutes = require("./routes/relationshipRoutes");
const interactionRoutes  = require("./routes/interactionRoutes");
const analysisRoutes     = require("./routes/analysisRoutes");
const graphRoutes        = require("./routes/graphRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// Middleware to check Firebase initialization
app.use((req, res, next) => {
  const db = require("./firebase/firebaseConfig");
  const doesNotNeedFirebase =
    req.path === "/" || req.path.startsWith("/analyzeRelationship");

  if (!db && !doesNotNeedFirebase) {
    return res.status(503).json({
      error: "Firebase not initialized",
      message:
        "Add serviceAccountKey.json to backend/firebase/ and restart the server",
    });
  }
  next();
});

app.use("/relationships",        relationshipRoutes);
app.use("/interactions",         interactionRoutes);
app.use("/analyzeRelationship",  analysisRoutes);
app.use("/graph",                graphRoutes);

app.get("/", (req, res) => {
  res.send("BondB backend running successfully");
});

app.listen(5000, () => {
  console.log("BondB backend running on port 5000");
});
