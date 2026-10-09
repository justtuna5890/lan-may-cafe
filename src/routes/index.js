const express = require('express');
const OrderController = require('../controllers/OrderController');
const PaymentController = require('../controllers/PaymentController');
const KitchenController = require('../controllers/KitchenController');
const kdsRealtime = require('../realtime/kds');
const AuthController = require('../controllers/AuthController');
const { ok } = require('../utils/response');

const { verifyToken, requireRole } = require('../middlewares/auth');

const router = express.Router();

router.get('/health', (req, res) => ok(res, { status: 'up' }));

// UC21
router.post('/auth/login', AuthController.dangNhap);

// UC21 (khong can token)
router.post('/auth/login', AuthController.dangNhap);

// UC01
router.post('/orders', OrderController.taoOrder);

// UC08, UC10
router.get('/orders/:id/invoice', PaymentController.layHoaDon);
router.post('/payments', PaymentController.thanhToan);

// ==============================================
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

// =====================================================
// UC16 - Cập nhật trạng thái chế biến
// Phần của Xuân An
// =====================================================

router.patch(
    '/kitchen/items/:chiTietId/status',
    verifyToken,
    requireRole('BARISTA'),
    KitchenController.capNhatTrangThaiMon
);

// UC16 - Hoàn tác trạng thái
router.post(
    '/kitchen/items/:chiTietId/undo',
    verifyToken,
    requireRole('BARISTA'),
    KitchenController.hoanTacTrangThaiMon
);

// TODO: UC04 PATCH /orders/:id/items, UC18 (bếp), UC21 /auth/login

module.exports = router;