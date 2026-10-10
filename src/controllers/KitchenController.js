const KitchenService = require('../services/KitchenService');
const { ok } = require('../utils/response');

class KitchenController {
    // UC15 - Lấy danh sách món cho KDS
    static async layDanhSachMon(req, res, next) {
        try {
            const data = await KitchenService.getKitchenItems();
            return ok(res, data);
        } catch (err) {
            return next(err);
        }
    }

    // UC16 - Cập nhật trạng thái món
    static async capNhatTrangThaiMon(req, res, next) {
        try {
            const { chiTietId } = req.params;
            const { trangThai } = req.body;

            const data = await KitchenService.updateItemStatus(
                chiTietId,
                trangThai
            );

            return ok(
                res,
                data,
                'Cập nhật trạng thái món thành công'
            );
        } catch (err) {
            return next(err);
        }
    }

    // UC16 - Hoàn tác trạng thái món
    static async hoanTacTrangThaiMon(req, res, next) {
        try {
            const { chiTietId } = req.params;

            const data = await KitchenService.undoItemStatus(chiTietId);

            return ok(
                res,
                data,
                'Hoàn tác trạng thái món thành công'
            );
        } catch (err) {
            return next(err);
        }
    }
}

module.exports = KitchenController;