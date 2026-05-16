const express = require("express");
const router = express.Router();

const {
  createInteraction,
  getInteractions,
} = require("../controllers/interactionController");

router.post("/", createInteraction);
router.get("/",  getInteractions);

module.exports = router;
