const KitchenService = require('../services/KitchenService');
const { ok } = require('../utils/response');

class KitchenController {

    // =====================================================
    // UC15 - Lấy danh sách món cho KDS
    // =====================================================
    static async layDanhSachMon(req, res, next) {
        try {
            const data = await KitchenService.getKitchenItems();

            return ok(res, data);
        } catch (err) {
            return next(err);
        }
    }
}

module.exports = KitchenController;