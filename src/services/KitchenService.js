const { pool, withTransaction } = require('../config/db');
const AppError = require('../utils/AppError');
const {
    broadcastOrderUpdated
} = require('../realtime/kds');
const ChiTietDonRepository = require('../repositories/ChiTietDonRepository');

class KitchenService {

    // =========================================================
    // UC15 - Lấy danh sách món cho KDS
    // =========================================================
    static async getKitchenItems() {
        const rows = await ChiTietDonRepository.getKitchenItems();

        return rows.map(row => ({
            chiTietId: row.chiTietId,
            donHangId: row.donHangId,
            banId: row.banId,
            soBan: row.soBan,
            monId: row.monId,
            tenMon: row.tenMon,
            soLuong: Number(row.soLuong),
            donGia: Number(row.donGia),
            ghiChu: row.ghiChu,
            trangThaiCheBien: row.trangThaiCheBien,
            ngayTao: row.ngayTao
        }));
    }
}

module.exports = KitchenService;