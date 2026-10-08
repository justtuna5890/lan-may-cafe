const { pool, withTransaction } = require('../config/db');
const AppError = require('../utils/AppError');
const {
    broadcastOrderUpdated
} = require('../realtime/kds');

class KitchenService {

    // =========================================================
    // UC15 - Lấy danh sách món cho KDS
    // =========================================================
    static async getKitchenItems() {
        const [rows] = await pool.query(`
            SELECT
                ct.id AS chiTietId,
                ct.don_hang_id AS donHangId,
                d.ban_id AS banId,
                b.so_ban AS soBan,
                ct.mon_an_id AS monId,
                m.ten_mon AS tenMon,
                ct.so_luong AS soLuong,
                ct.don_gia AS donGia,
                ct.ghi_chu AS ghiChu,
                ct.trang_thai_che_bien AS trangThaiCheBien,
                d.ngay_tao AS ngayTao
            FROM chi_tiet_don ct
            INNER JOIN don_hang d
                ON d.id = ct.don_hang_id
            INNER JOIN mon_an m
                ON m.id = ct.mon_an_id
            LEFT JOIN ban b
                ON b.id = d.ban_id
            WHERE ct.trang_thai_che_bien NOT IN ('DA_XONG', 'DA_HUY')
            ORDER BY d.ngay_tao ASC, ct.id ASC
        `);

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