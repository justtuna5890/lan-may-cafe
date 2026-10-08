const express = require('express');
const OrderController = require('../controllers/OrderController');
const PaymentController = require('../controllers/PaymentController');
const KitchenController = require('../controllers/KitchenController');
const kdsRealtime = require('../realtime/kds');
const { ok } = require('../utils/response');

const { verifyToken, requireRole } = require('../middlewares/auth');

const router = express.Router();

router.get('/health', (req, res) => ok(res, { status: 'up' }));

// UC01
router.post('/orders', OrderController.taoOrder);

// UC08, UC10
router.get('/orders/:id/invoice', PaymentController.layHoaDon);
router.post('/payments', PaymentController.thanhToan);

// =====================================================
// KDS - Realtime
// Phần của Xuân An
// =====================================================

router.get(
    '/kds/stream',
    verifyToken,
    requireRole('BARISTA', 'CHU_QUAN'),
    kdsRealtime.subscribeKDS
);

// =====================================================
// UC15 - Lấy danh sách món cho KDS
// Phần của Xuân An
// =====================================================

router.get(
    '/kitchen/items',
    verifyToken,
    requireRole('BARISTA'),
    KitchenController.layDanhSachMon
);

// TODO: UC04 PATCH /orders/:id/items, UC16/18 (bep), UC21 /auth/login

module.exports = router;