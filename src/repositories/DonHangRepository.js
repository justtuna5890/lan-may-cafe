const { pool } = require('../config/db');

class DonHangRepository {

    // Tìm đơn hàng theo ID
    static async findById(id) {
        const [rows] = await pool.query(
            `
            SELECT
                id,
                ban_id AS banId,
                nhan_vien_id AS nhanVienId,
                khach_hang_id AS khachHangId,
                tong_tien AS tongTien,
                tien_giam_gia AS tienGiamGia,
                trang_thai AS trangThai,
                ngay_tao AS ngayTao
            FROM don_hang
            WHERE id = ?
            LIMIT 1
            `,
            [id]
        );

        return rows.length > 0 ? rows[0] : null;
    }

    // Cập nhật trạng thái đơn hàng
    static async capNhatTrangThai(id, trangThai) {
        const [result] = await pool.query(
            `
            UPDATE don_hang
            SET trang_thai = ?
            WHERE id = ?
            `,
            [trangThai, id]
        );

        return result.affectedRows > 0;
    }

    // Lưu đơn hàng mới
    static async luuOrder(order) {
        const [result] = await pool.query(
            `
            INSERT INTO don_hang (
                id,
                ban_id,
                nhan_vien_id,
                khach_hang_id,
                tong_tien,
                tien_giam_gia,
                trang_thai,
                ngay_tao
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                order.id,
                order.banId,
                order.nhanVienId,
                order.khachHangId,
                order.tongTien,
                order.tienGiamGia,
                order.trangThai,
                order.ngayTao
            ]
        );

        return {
            id: order.id,
            affectedRows: result.affectedRows
        };
    }
    // UC16 - Cập nhật trạng thái đơn trong transaction
    static async capNhatTrangThaiWithConnection(
        connection,
        id,
        trangThai
    ) {
        const [result] = await connection.query(
            `
        UPDATE don_hang
        SET
            trang_thai = ?,
            ngay_cap_nhat = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
            [
                trangThai,
                id
            ]
        );

        return result.affectedRows > 0;
    }
}

module.exports = DonHangRepository;
