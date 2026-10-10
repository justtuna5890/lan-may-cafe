
const { pool } = require('../config/db');

class KhoHangRepository {
    // Lấy nguyên liệu theo ID
    static async findById(id, conn = pool) {
        const [rows] = await conn.query(
            `
            SELECT
                id,
                ten_nguyen_lieu AS tenNguyenLieu,
                don_vi_tinh AS donViTinh,
                ton_kho AS tonKho
            FROM kho_hang
            WHERE id = ?
            LIMIT 1
            `,
            [id]
        );

        return rows.length > 0 ? rows[0] : null;
    }

    // Lấy danh sách nguyên liệu
    static async findAll(conn = pool) {
        const [rows] = await conn.query(
            `
            SELECT
                id,
                ten_nguyen_lieu AS tenNguyenLieu,
                don_vi_tinh AS donViTinh,
                ton_kho AS tonKho
            FROM kho_hang
            ORDER BY ten_nguyen_lieu
            `
        );

        return rows;
    }

    // Đánh dấu hết hàng bằng cách đưa tồn kho về 0
    static async danhDauHetHang(id, conn = pool) {
        const [result] = await conn.query(
            `
            UPDATE kho_hang
            SET ton_kho = 0
            WHERE id = ?
            `,
            [id]
        );

        return result.affectedRows > 0;
    }

    // Nhập thêm nguyên liệu
    static async nhapKho(id, soLuong, conn = pool) {
        const [result] = await conn.query(
            `
            UPDATE kho_hang
            SET ton_kho = ton_kho + ?
            WHERE id = ? AND ? > 0
            `,
            [soLuong, id, soLuong]
        );

        return result.affectedRows > 0;
    }

    // Xuất nguyên liệu, không cho tồn kho âm
    static async xuatKho(id, soLuong, conn = pool) {
        const [result] = await conn.query(
            `
            UPDATE kho_hang
            SET ton_kho = ton_kho - ?
            WHERE id = ?
              AND ton_kho >= ?
              AND ? > 0
            `,
            [soLuong, id, soLuong, soLuong]
        );

        return result.affectedRows > 0;
    }

    // Kiểm tra tồn kho
    static async kiemTraTonKho(id, soLuong, conn = pool) {
        const [rows] = await conn.query(
            `
            SELECT ton_kho AS tonKho
            FROM kho_hang
            WHERE id = ?
            LIMIT 1
            `,
            [id]
        );

        if (rows.length === 0) {
            return false;
        }

        return Number(rows[0].tonKho) >= Number(soLuong);
    }

    // Đồng bộ trạng thái món ăn dựa trên toàn bộ nguyên liệu trong công thức.
    // Có ít nhất một nguyên liệu hết hàng => TAM_HET.
    // Tất cả nguyên liệu còn hàng => CON_HANG.
    static async dongBoTrangThaiMonAn(khoHangId, conn = pool) {
        const [result] = await conn.query(
            `
            UPDATE mon_an AS m
            SET m.trang_thai = CASE
                WHEN EXISTS (
                    SELECT 1
                    FROM cong_thuc_mon AS ct2
                    INNER JOIN kho_hang AS kh2
                        ON kh2.id = ct2.kho_hang_id
                    WHERE ct2.mon_an_id = m.id
                      AND kh2.ton_kho <= 0
                )
                THEN 'TAM_HET'
                ELSE 'CON_HANG'
            END
            WHERE EXISTS (
                SELECT 1
                FROM cong_thuc_mon AS ct
                WHERE ct.mon_an_id = m.id
                  AND ct.kho_hang_id = ?
            )
            `,
            [khoHangId]
        );

        return result.affectedRows;
    }
}

module.exports = KhoHangRepository;
