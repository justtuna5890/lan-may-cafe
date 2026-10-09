const { pool } = require('../config/db');

class ThanhToanRepository {

    // Lưu thanh toán
    static async save(thanhToan) {
        const [result] = await pool.query(
            `
            INSERT INTO thanh_toan (
                id,
                don_hang_id,
                phuong_thuc,
                so_tien,
                tien_khach_dua,
                tien_thoi,
                ma_giao_dich,
                trang_thai,
                ngay_tao
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                thanhToan.id,
                thanhToan.donHangId,
                thanhToan.phuongThuc,
                thanhToan.soTien,
                thanhToan.tienKhachDua,
                thanhToan.tienThoi,
                thanhToan.maGiaoDich,
                thanhToan.trangThai,
                thanhToan.ngayTao
            ]
        );

        return {
            id: thanhToan.id,
            affectedRows: result.affectedRows
        };
    }

    // Tìm thanh toán theo mã giao dịch
    static async findByMaGiaoDich(maGiaoDich) {
        const [rows] = await pool.query(
            `
            SELECT
                id,
                don_hang_id AS donHangId,
                phuong_thuc AS phuongThuc,
                so_tien AS soTien,
                tien_khach_dua AS tienKhachDua,
                tien_thoi AS tienThoi,
                ma_giao_dich AS maGiaoDich,
                trang_thai AS trangThai,
                ngay_tao AS ngayTao
            FROM thanh_toan
            WHERE ma_giao_dich = ?
            LIMIT 1
            `,
            [maGiaoDich]
        );

        return rows.length > 0 ? rows[0] : null;
    }
}

module.exports = ThanhToanRepository;
