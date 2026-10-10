
const express = require('express');
const OrderController = require('../controllers/OrderController');
const PaymentController = require('../controllers/PaymentController');
const KitchenController = require('../controllers/KitchenController');
const KhoHangController = require('../controllers/KhoHangController');
const kdsRealtime = require('../realtime/kds');
const AuthController = require('../controllers/AuthController');
const { ok } = require('../utils/response');
const { verifyToken, requireRole } = require('../middlewares/auth');

const router = express.Router();

// =====================================================
// HEALTH CHECK
// =====================================================
router.get('/health', (req, res) =>
    ok(res, { status: 'up' })
);

// UC21 (khong can token)
router.post('/auth/login', AuthController.dangNhap);

// Phan quyen theo api-contract: verifyToken (401) -> requireRole (403)
const phucVu = [verifyToken, requireRole('PHUC_VU')];
const thuNgan = [verifyToken, requireRole('THU_NGAN')];
const phucVuHoacThuNgan = [verifyToken, requireRole('PHUC_VU', 'THU_NGAN')];

// Ho tro giao dien
router.get('/tables', ...phucVuHoacThuNgan, OrderController.layDanhSachBan);
router.get('/menu', ...phucVu, OrderController.layThucDon);
router.get('/orders/:id', ...phucVuHoacThuNgan, OrderController.layDon);

// UC01
router.post('/orders', ...phucVu, OrderController.taoOrder);

// UC04
router.post('/orders/:id/items', ...phucVu, OrderController.themMon);
router.patch('/orders/:id/items/:chiTietId', ...phucVu, OrderController.suaMon);
router.delete('/orders/:id/items/:chiTietId', ...phucVu, OrderController.huyMon);

// UC08, UC10
router.get('/tables/:id/current-order', ...phucVuHoacThuNgan, PaymentController.layDonHienTai);
router.get('/orders/:id/invoice', ...thuNgan, PaymentController.layHoaDon);
router.post('/payments', ...thuNgan, PaymentController.thanhToan);

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
