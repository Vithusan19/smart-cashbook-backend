const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect } = require('../middleware/auth');
const { requireCashbookAccess, requireMemberOrOwner, requireOwner } = require('../middleware/roleCheck');
const { getSplits, getSplit, createSplit, updateSplit, deleteSplit, markMemberPaid } = require('../controllers/split.controller');

router.use(protect);

router.get('/:id/splits', requireCashbookAccess, getSplits);
router.get('/:id/splits/:sid', requireCashbookAccess, getSplit);
router.post('/:id/splits', requireMemberOrOwner, createSplit);
router.put('/:id/splits/:sid', requireMemberOrOwner, updateSplit);
router.delete('/:id/splits/:sid', requireMemberOrOwner, deleteSplit);
router.patch('/:id/splits/:sid/members/:memberId/mark-paid', requireOwner, markMemberPaid);

module.exports = router;
