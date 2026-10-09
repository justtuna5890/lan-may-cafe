
const KhoHangService = require('../services/KhoHangService');

class KhoHangController {
    // GET /api/inventory
    static async layDanhSachNguyenLieu(req, res, next) {
        try {
            const data = await KhoHangService.layDanhSachNguyenLieu();

            return res.status(200).json({
                success: true,
                data,
                maLoi: null,
                message: 'Lấy danh sách nguyên liệu thành công'
            });
        } catch (error) {
            next(error);
        }
    }

    // GET /api/inventory/:id
    static async layNguyenLieuTheoId(req, res, next) {
        try {
            const data = await KhoHangService.layNguyenLieuTheoId(
                req.params.id
            );

            return res.status(200).json({
                success: true,
                data,
                maLoi: null,
                message: 'Lấy nguyên liệu thành công'
            });
        } catch (error) {
            next(error);
        }
    }

    // PATCH /api/inventory/:id/out-of-stock
    static async danhDauHetHang(req, res, next) {
        try {
            const data = await KhoHangService.danhDauHetHang(
                req.params.id
            );

            return res.status(200).json({
                success: true,
                data,
                maLoi: null,
                message: 'Đánh dấu nguyên liệu hết hàng thành công'
            });
        } catch (error) {
            next(error);
        }
    }

    // POST /api/inventory/:id/restock
    static async nhapKho(req, res, next) {
        try {
            const data = await KhoHangService.nhapKho(
                req.params.id,
                req.body.soLuong
            );

            return res.status(200).json({
                success: true,
                data,
                maLoi: null,
                message: 'Nhập kho thành công'
            });
        } catch (error) {
            next(error);
        }
    }

    // POST /api/inventory/:id/issue
    static async xuatKho(req, res, next) {
        try {
            const data = await KhoHangService.xuatKho(
                req.params.id,
                req.body.soLuong
            );

            return res.status(200).json({
                success: true,
                data,
                maLoi: null,
                message: 'Xuất kho thành công'
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = KhoHangController;
