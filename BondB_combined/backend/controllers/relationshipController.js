const db = require("../firebase/firebaseConfig");

const createRelationship = async (req, res) => {
  try {
    const relationshipData = req.body;
    const docRef = await db.collection("relationships").add({
      ...relationshipData,
      createdAt: new Date(),
    });
    res.status(201).json({
      message: "Relationship created successfully",
      id: docRef.id,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getRelationships = async (req, res) => {
  try {
    const snapshot = await db.collection("relationships").get();
    const relationships = [];
    snapshot.forEach((doc) => {
      relationships.push({ id: doc.id, ...doc.data() });
    });
    res.json(relationships);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateRelationship = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    await db.collection("relationships").doc(id).update({
      ...updateData,
      updatedAt: new Date(),
    });
    res.json({ message: "Relationship updated successfully", id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteRelationship = async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection("relationships").doc(id).delete();
    res.json({ message: "Relationship deleted successfully", id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createRelationship,
  getRelationships,
  updateRelationship,
  deleteRelationship,
};
