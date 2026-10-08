const KitchenService = require('../services/KitchenService');
const { ok } = require('../utils/response');

class KitchenController {

    // UC15
    static async layDanhSachMon(req, res, next) {
        try {
            const data = await KitchenService.getKitchenItems();

            return ok(res, data);
        } catch (err) {
            return next(err);
        }
    }


    // UC16
    static async capNhatTrangThaiMon(req, res, next) {
        try {
            const data = await KitchenService.updateItemStatus(
                req.params.chiTietId,
                req.body.trangThai
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


    // Undo
    static async hoanTacTrangThaiMon(req, res, next) {
        try {
            const data = await KitchenService.undoItemStatus(
                req.params.chiTietId
            );

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
