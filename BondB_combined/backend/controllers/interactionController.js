const db = require("../firebase/firebaseConfig");

const createInteraction = async (req, res) => {
  try {
    const interactionData = req.body;
    const docRef = await db.collection("interactions").add({
      ...interactionData,
      createdAt: new Date(),
    });
    res.status(201).json({
      message: "Interaction logged successfully",
      id: docRef.id,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getInteractions = async (req, res) => {
  try {
    const snapshot = await db.collection("interactions").get();
    const interactions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(interactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createInteraction,
  getInteractions,
};
