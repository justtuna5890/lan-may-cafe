const { pool } = require('../config/db');

class ChiTietDonRepository {

    // Tìm chi tiết đơn hàng theo ID
    static async findById(id) {
        const [rows] = await pool.query(
            `
            SELECT
                id,
                don_hang_id AS donHangId,
                mon_an_id AS monAnId,
                so_luong AS soLuong,
                don_gia AS donGia,
                ghi_chu AS ghiChu,
                trang_thai_che_bien AS trangThaiCheBien
            FROM chi_tiet_don
            WHERE id = ?
            LIMIT 1
            `,
            [id]
        );

        return rows.length > 0 ? rows[0] : null;
    }

    // Lấy toàn bộ chi tiết của một đơn hàng
    static async findByDonHangId(donHangId) {
        const [rows] = await pool.query(
            `
            SELECT
                id,
                don_hang_id AS donHangId,
                mon_an_id AS monAnId,
                so_luong AS soLuong,
                don_gia AS donGia,
                ghi_chu AS ghiChu,
                trang_thai_che_bien AS trangThaiCheBien
            FROM chi_tiet_don
            WHERE don_hang_id = ?
            ORDER BY id
            `,
            [donHangId]
        );

        return rows;
    }

    // Lưu chi tiết đơn hàng
    static async save(chiTietDon) {
        const [result] = await pool.query(
            `
            INSERT INTO chi_tiet_don (
                id,
                don_hang_id,
                mon_an_id,
                so_luong,
                don_gia,
                ghi_chu,
                trang_thai_che_bien
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [
                chiTietDon.id,
                chiTietDon.donHangId,
                chiTietDon.monAnId,
                chiTietDon.soLuong,
                chiTietDon.donGia,
                chiTietDon.ghiChu,
                chiTietDon.trangThaiCheBien
            ]
        );

        return {
            id: chiTietDon.id,
            affectedRows: result.affectedRows
        };
    }

    // Cập nhật trạng thái chế biến
    static async capNhatTrangThai(id, trangThaiCheBien) {
        const [result] = await pool.query(
            `
            UPDATE chi_tiet_don
            SET trang_thai_che_bien = ?
            WHERE id = ?
            `,
            [trangThaiCheBien, id]
        );

        return result.affectedRows > 0;
    }
    // =========================================================
    // UC15 - Lấy danh sách món cho KDS
    // =========================================================
    static async getKitchenItems() {
        const [rows] = await pool.query(
            `
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
            `
        );

        return rows;
    }
}

module.exports = ChiTietDonRepository;