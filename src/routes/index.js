
const express = require('express');
const OrderController = require('../controllers/OrderController');
const PaymentController = require('../controllers/PaymentController');
const KitchenController = require('../controllers/KitchenController');
const KhoHangController = require('../controllers/KhoHangController');
const kdsRealtime = require('../realtime/kds');
const AuthController = require('../controllers/AuthController');
const { ok } = require('../utils/response');

const router = express.Router();

// =====================================================
// HEALTH CHECK
// =====================================================
router.get('/health', (req, res) =>
    ok(res, { status: 'up' })
);

// UC21 (khong can token)
router.post('/auth/login', AuthController.dangNhap);

// Ho tro giao dien
router.get('/tables', OrderController.layDanhSachBan);
router.get('/menu', OrderController.layThucDon);
router.get('/orders/:id', OrderController.layDon);

// UC01
router.post('/orders', OrderController.taoOrder);

// UC04
router.post('/orders/:id/items', OrderController.themMon);
router.patch('/orders/:id/items/:chiTietId', OrderController.suaMon);
router.delete('/orders/:id/items/:chiTietId', OrderController.huyMon);

// UC08, UC10
router.get('/tables/:id/current-order', PaymentController.layDonHienTai);
router.get('/orders/:id/invoice', PaymentController.layHoaDon);
router.post('/payments', PaymentController.thanhToan);

// =====================================================
// KDS - REALTIME
// =====================================================
router.get('/kds/stream', kdsRealtime.subscribeKDS);

// =====================================================
// UC15 - LẤY DANH SÁCH MÓN CHO KDS
// =====================================================
router.get('/kitchen/items', KitchenController.layDanhSachMon);

// =====================================================
// UC16 - CẬP NHẬT TRẠNG THÁI CHẾ BIẾN
// =====================================================
router.patch(
    '/kitchen/items/:chiTietId/status',
    KitchenController.capNhatTrangThaiMon
);

router.post(
    '/kitchen/items/:chiTietId/undo',
    KitchenController.hoanTacTrangThaiMon
);

// =====================================================
// UC18 - QUẢN LÝ KHO HÀNG
// =====================================================

// Lấy danh sách nguyên liệu
router.get(
    '/inventory',
    KhoHangController.layDanhSachNguyenLieu
);

// Lấy chi tiết nguyên liệu
router.get(
    '/inventory/:id',
    KhoHangController.layNguyenLieuTheoId
);

// Đánh dấu nguyên liệu hết hàng
router.patch(
    '/inventory/:id/out-of-stock',
    KhoHangController.danhDauHetHang
);

// Nhập thêm nguyên liệu
router.post(
    '/inventory/:id/restock',
    KhoHangController.nhapKho
);

// Xuất nguyên liệu
router.post(
    '/inventory/:id/issue',
    KhoHangController.xuatKho
);

// =====================================================
// TODO: UC04 PATCH /orders/:id/items, UC21 /auth/login
// =====================================================

module.exports = router;
