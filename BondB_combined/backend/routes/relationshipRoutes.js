const express = require("express");
const router = express.Router();

const {
  createRelationship,
  getRelationships,
  updateRelationship,
  deleteRelationship,
} = require("../controllers/relationshipController");

router.get("/",       getRelationships);
router.post("/",      createRelationship);
router.put("/:id",    updateRelationship);
router.delete("/:id", deleteRelationship);

module.exports = router;
