const express = require('express');
const OrderController = require('../controllers/OrderController');
const PaymentController = require('../controllers/PaymentController');
const KitchenController = require('../controllers/KitchenController');
const kdsRealtime = require('../realtime/kds');
const { ok } = require('../utils/response');

const router = express.Router();

router.get('/health', (req, res) =>
    ok(res, { status: 'up' })
);

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
    kdsRealtime.subscribeKDS
);

// =====================================================
// UC15 - Lấy danh sách món cho KDS
// =====================================================

router.get(
    '/kitchen/items',
    KitchenController.layDanhSachMon
);
// TODO: UC04 PATCH /orders/:id/items, UC18 (bếp), UC21 /auth/login

module.exports = router;