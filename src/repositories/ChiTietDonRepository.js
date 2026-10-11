const { pool } = require('../config/db');

class ChiTietDonRepository {
    static kiemTraTrangThaiCheBien(trangThaiCheBien) {
        if (!['CHO_PHA_CHE', 'DANG_LAM', 'DA_XONG', 'DA_HUY'].includes(trangThaiCheBien)) {
            throw new Error('Trạng thái chế biến không hợp lệ');
        }
    }

    // Tìm chi tiết đơn hàng theo ID
    static async findById(id, conn = pool) {
        const [rows] = await conn.query(
            `
            SELECT
                ctd.id,
                ctd.don_hang_id AS donHangId,
                ctd.mon_an_id AS monAnId,
                ctd.so_luong AS soLuong,
                ctd.don_gia AS donGia,
                ctd.ghi_chu AS ghiChu,
                ctd.trang_thai_che_bien AS trangThaiCheBien,
                dh.trang_thai AS trangThaiDon
            FROM chi_tiet_don ctd
            INNER JOIN don_hang dh ON dh.id = ctd.don_hang_id
            WHERE ctd.id = ?
            LIMIT 1
            `,
            [id]
        );

        return rows.length > 0 ? rows[0] : null;
    }

    // Lấy chi tiết đơn và khóa dòng trong transaction
    // Cách gọi của KitchenService: (connection, chiTietId)
    static async findByIdForUpdate(connection, chiTietId) {
        if (!connection) {
            throw new Error('Thiếu connection transaction');
        }

        const [rows] = await connection.query(
            `
            SELECT
                ctd.id,
                ctd.don_hang_id AS donHangId,
                ctd.mon_an_id AS monAnId,
                ctd.so_luong AS soLuong,
                ctd.don_gia AS donGia,
                ctd.ghi_chu AS ghiChu,
                ctd.trang_thai_che_bien AS trangThaiCheBien,
                dh.trang_thai AS trangThaiDon
            FROM chi_tiet_don ctd
            INNER JOIN don_hang dh ON dh.id = ctd.don_hang_id
            WHERE ctd.id = ?
            LIMIT 1
            FOR UPDATE
            `,
            [chiTietId]
        );

        return rows.length > 0 ? rows[0] : null;
    }

    // Lấy toàn bộ chi tiết của một đơn hàng
    static async findByDonHangId(donHangId, conn = pool) {
        const [rows] = await conn.query(
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

    // Lấy trạng thái các món trong đơn
    // Cách gọi của KitchenService: (connection, donHangId)
    static async findTrangThaiByDonHangId(connection, donHangId) {
        if (!connection) {
            throw new Error('Thiếu connection transaction');
        }

        const [rows] = await connection.query(
            `
            SELECT
                id,
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
    static async save(chiTietDon, conn = pool) {
        const [result] = await conn.query(
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
                chiTietDon.ghiChu ?? null,
                chiTietDon.trangThaiCheBien ?? 'CHO_PHA_CHE'
            ]
        );

        return {
            id: chiTietDon.id,
            affectedRows: result.affectedRows
        };
    }

    // Cập nhật trạng thái pha chế
    static async capNhatTrangThai(
        id,
        trangThaiCheBien,
        conn = pool
    ) {
        this.kiemTraTrangThaiCheBien(trangThaiCheBien);

        const [result] = await conn.query(
            `
            UPDATE chi_tiet_don
            SET trang_thai_che_bien = ?
            WHERE id = ?
            `,
            [trangThaiCheBien, id]
        );

        return result.affectedRows > 0;
    }

    // Cách gọi của KitchenService:
    // (connection, chiTietId, trangThaiMoi)
    static async capNhatTrangThaiWithConnection(
        connection,
        chiTietId,
        trangThaiMoi
    ) {
        if (!connection) {
            throw new Error('Thiếu connection transaction');
        }

        return this.capNhatTrangThai(
            chiTietId,
            trangThaiMoi,
            connection
        );
    }

    // Danh sách món hiển thị trên KDS - UC15
    static async getKitchenItems(conn = pool) {
        const [rows] = await conn.query(
            `
            SELECT
                ctd.id AS chiTietId,
                ctd.don_hang_id AS donHangId,
                dh.ban_id AS banId,
                b.so_ban AS soBan,
                ctd.mon_an_id AS monId,
                ma.ten_mon AS tenMon,
                ctd.so_luong AS soLuong,
                ctd.don_gia AS donGia,
                ctd.ghi_chu AS ghiChu,
                ctd.trang_thai_che_bien AS trangThaiCheBien,
                ctd.ngay_tao AS ngayTao
            FROM chi_tiet_don ctd
            INNER JOIN don_hang dh ON dh.id = ctd.don_hang_id
            INNER JOIN mon_an ma ON ma.id = ctd.mon_an_id
            LEFT JOIN ban b ON b.id = dh.ban_id
            WHERE ctd.trang_thai_che_bien
                NOT IN ('DA_XONG', 'DA_HUY')
              AND dh.trang_thai = 'DANG_PHUC_VU'
            ORDER BY ctd.ngay_tao ASC, ctd.id ASC
            `
        );

        return rows;
    }
}

module.exports = ChiTietDonRepository;
