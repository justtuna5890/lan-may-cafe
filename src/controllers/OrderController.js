const OrderService = require('../services/OrderService');
const { ok } = require('../utils/response');

class OrderController {

    // =====================================================
    // UC01 - Tạo Order mới
    // POST /api/orders
    // =====================================================
    static async taoOrder(req, res, next) {
        try {
            const nhanVienId = req.user.sub;

            const data = await OrderService.createOrder(
                req.body,
                nhanVienId
            );

            return ok(
                res,
                data,
                'Tạo order thành công',
                201
            );

        } catch (err) {
            return next(err);
        }
    }


    // =====================================================
    // GET /api/tables
    // Lấy danh sách bàn
    // =====================================================
    static async layDanhSachBan(req, res, next) {
        try {
            const data = await OrderService.getTables();

            return ok(res, data);

        } catch (err) {
            return next(err);
        }
    }


    // =====================================================
    // GET /api/tables/:id/current-order
    // Lấy order hiện tại của bàn
    // =====================================================
    static async layOrderHienTaiCuaBan(req, res, next) {
        try {
            const data = await OrderService.getCurrentOrder(
                req.params.id
            );

            return ok(res, data);

        } catch (err) {
            return next(err);
        }
    }


    // =====================================================
    // GET /api/menu
    // Lấy danh sách món
    // =====================================================
    static async layMenu(req, res, next) {
        try {
            const data = await OrderService.getMenu();

            return ok(res, data);

        } catch (err) {
            return next(err);
        }
    }


    // =====================================================
    // GET /api/orders/:id
    // Lấy chi tiết Order
    // =====================================================
    static async layOrder(req, res, next) {
        try {
            const data = await OrderService.getOrder(
                req.params.id
            );

            return ok(res, data);

        } catch (err) {
            return next(err);
        }
    }


    // =====================================================
    // POST /api/orders/:id/items
    // Thêm món vào Order
    // =====================================================
    static async themMonVaoOrder(req, res, next) {
        try {
            const data = await OrderService.addItems(
                req.params.id,
                req.body,
                req.user.sub
            );

            return ok(
                res,
                data,
                'Thêm món vào order thành công'
            );

        } catch (err) {
            return next(err);
        }
    }


    // =====================================================
    // PATCH /api/orders/:id/items/:chiTietId
    // Cập nhật số lượng món
    // =====================================================
    static async capNhatSoLuongMon(req, res, next) {
        try {
            const data = await OrderService.updateItemQuantity(
                req.params.id,
                req.params.chiTietId,
                req.body
            );

            return ok(
                res,
                data,
                'Cập nhật món thành công'
            );

        } catch (err) {
            return next(err);
        }
    }


    // =====================================================
    // DELETE /api/orders/:id/items/:chiTietId
    // Hủy món trong Order
    // =====================================================
    static async huyMonTrongOrder(req, res, next) {
        try {
            const data = await OrderService.cancelItem(
                req.params.id,
                req.params.chiTietId
            );

            return ok(
                res,
                data,
                'Hủy món thành công'
            );

        } catch (err) {
            return next(err);
        }
    }
}

module.exports = OrderController;