const express = require('express');
const router = express.Router();

const AuthController = require('../controllers/AuthController');
const OrderController = require('../controllers/OrderController');
const PaymentController = require('../controllers/PaymentController');
const KitchenController = require('../controllers/KitchenController');
const kdsRealtime = require('../realtime/kds');

const { verifyToken, requireRole } = require('../middlewares/auth');

// 1. Health check
router.get('/health', (req, res) => {
    res.json({ success: true, data: { status: 'up' }, maLoi: null, message: 'OK' });
});

// 2. UC21 - Đăng nhập
router.post('/auth/login', AuthController.login);

// 3. UC01 - Tạo và gửi order
router.post('/orders', verifyToken, requireRole('PHUC_VU', 'CHU_QUAN'), OrderController.taoOrder);

// 4. UC08 - Lập / xem trước hóa đơn
router.get('/orders/:id/invoice', verifyToken, requireRole('THU_NGAN', 'CHU_QUAN'), PaymentController.layHoaDon);

// 5. UC10 - Thanh toán hóa đơn (Chống trùng lặp)
router.post('/payments', verifyToken, requireRole('THU_NGAN', 'CHU_QUAN'), PaymentController.thanhToan);

// 6. Realtime KDS Stream (SSE)
router.get('/kds/stream', verifyToken, requireRole('BARISTA', 'CHU_QUAN'), kdsRealtime.subscribeKDS);

// =====================================================
// KDS / KITCHEN
// =====================================================

// UC15 - Lấy danh sách món cho KDS
router.get(
    '/kitchen/items',
    verifyToken,
    requireRole('BARISTA'),
    KitchenController.layDanhSachMon
);
module.exports = router;