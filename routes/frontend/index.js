const express = require('express');
const authRoutes = require('./authRoutes');
const lifebookDashboardRoutes = require('./lifebookDashboardRoutes');
const knowledgePillarRoutes = require('./knowledgePillarRoutes');
const decisionPillarRoutes = require('./decisionPillarRoutes');
const awarenessPillarRoutes = require('./awarenessPillarRoutes');
const journalRoutes = require('./journalRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/lifebook', lifebookDashboardRoutes);
router.use('/knowledge', knowledgePillarRoutes);
router.use('/decision', decisionPillarRoutes);
router.use('/awareness', awarenessPillarRoutes);
router.use('/journal', journalRoutes);

module.exports = router;
