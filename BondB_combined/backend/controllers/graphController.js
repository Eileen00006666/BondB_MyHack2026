const db = require("../firebase/firebaseConfig");

const getGraph = async (req, res) => {
  try {
    const snapshot = await db.collection("relationships").get();

    const nodesMap = new Map();
    const edges = [];

    snapshot.forEach((doc) => {
      const data = doc.data();

      if (data.sourceUserId) {
        nodesMap.set(data.sourceUserId, {
          id: data.sourceUserId,
          name: data.fromName || data.sourceUserId,
          type: data.type?.split("↔")[0] || "Unknown",
        });
      }

      if (data.targetUserId) {
        nodesMap.set(data.targetUserId, {
          id: data.targetUserId,
          name: data.toName || data.targetUserId,
          type: data.type?.split("↔")[1] || "Unknown",
        });
      }

      edges.push({
        id: doc.id,
        source: data.sourceUserId,
        target: data.targetUserId,
        type: data.type,
        fitScore: data.fitScore || 0,
        trustScore: data.trustScore || 0,
        status: data.status || "Active",
        health: data.health || "Moderate",
      });
    });

    res.json({
      nodes: Array.from(nodesMap.values()),
      edges,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getGraph };
