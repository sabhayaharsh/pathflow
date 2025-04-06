const express = require('express');
const authRoutes = require('./authRoutes');
const adminRoutes = require('./adminRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const frontUsersRoutes = require('./frontUsersRoutes');
const knowledgePillarRoutes = require('./KnowledgePillarRoutes');
const decisionPillarRoutes = require('./decisionPillarRoutes');
const awarenessPillarRoutes = require('./awarenessPillaroutes');

const router = express.Router();

router.use('/admin', authRoutes);
router.use('/administrator', adminRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/front-users', frontUsersRoutes);
router.use('/experience', knowledgePillarRoutes);
router.use('/opportunity', decisionPillarRoutes);
router.use('/observation', awarenessPillarRoutes);

module.exports = router;
