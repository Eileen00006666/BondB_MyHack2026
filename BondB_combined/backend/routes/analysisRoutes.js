const express = require("express");
const router = express.Router();

const { analyzeRelationship } = require("../controllers/analysisController");

router.post("/", analyzeRelationship);

module.exports = router;
