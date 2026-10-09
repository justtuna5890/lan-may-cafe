const { pool } = require('../config/db');

class ChiTietDonRepository {
    // =====================================================
    // KIỂM TRA DỮ LIỆU
    // =====================================================

    static kiemTraTrangThaiCheBien(trangThaiCheBien) {
        if (
            ![
                'CHO_PHA_CHE',
                'DANG_LAM',
                'DA_XONG',
                'DA_HUY'
            ].includes(trangThaiCheBien)
        ) {
            throw new Error('Trạng thái chế biến không hợp lệ');
        }
    }

    // =====================================================
    // UC04, UC16
    // Tìm chi tiết đơn hàng theo ID
    // =====================================================

    static async findById(id, conn = pool) {
        const [rows] = await conn.query(
            `
            SELECT
                ctd.id,
                ctd.id AS chiTietId,
                ctd.don_hang_id AS donHangId,
                ctd.mon_an_id AS monId,
                ctd.mon_an_id AS monAnId,
                ctd.so_luong AS soLuong,
                ctd.don_gia AS donGia,
                ctd.ghi_chu AS ghiChu,
                ctd.trang_thai_che_bien AS trangThaiCheBien,
                dh.trang_thai AS trangThaiDon
            FROM chi_tiet_don ctd
            INNER JOIN don_hang dh
                ON dh.id = ctd.don_hang_id
            WHERE ctd.id = ?
            LIMIT 1
            `,
            [id]
        );

        if (rows.length === 0) {
            return null;
        }

        const item = rows[0];

        return {
            ...item,
            soLuong: Number(item.soLuong),
            donGia: Number(item.donGia)
        };
    }

    // =====================================================
    // UC16
    // Tìm chi tiết đơn và khóa dòng trong transaction
    //
    // KitchenService gọi:
    // findByIdForUpdate(connection, chiTietId)
    // =====================================================

    static async findByIdForUpdate(connection, chiTietId) {
        if (!connection) {
            throw new Error('Thiếu connection transaction');
        }

        const [rows] = await connection.query(
            `
            SELECT
                ctd.id,
                ctd.id AS chiTietId,
                ctd.don_hang_id AS donHangId,
                ctd.mon_an_id AS monId,
                ctd.mon_an_id AS monAnId,
                ctd.so_luong AS soLuong,
                ctd.don_gia AS donGia,
                ctd.ghi_chu AS ghiChu,
                ctd.trang_thai_che_bien AS trangThaiCheBien,
                dh.trang_thai AS trangThaiDon
            FROM chi_tiet_don ctd
            INNER JOIN don_hang dh
                ON dh.id = ctd.don_hang_id
            WHERE ctd.id = ?
            LIMIT 1
            FOR UPDATE
            `,
            [chiTietId]
        );

        if (rows.length === 0) {
            return null;
        }

        const item = rows[0];

        return {
            ...item,
            soLuong: Number(item.soLuong),
            donGia: Number(item.donGia)
        };
    }

    // =====================================================
    // UC04, UC16
    // Lấy tất cả chi tiết của một đơn hàng
    // =====================================================

    static async findByDonHangId(donHangId, conn = pool) {
        const [rows] = await conn.query(
            `
            SELECT
                id,
                id AS chiTietId,
                don_hang_id AS donHangId,
                mon_an_id AS monId,
                mon_an_id AS monAnId,
                so_luong AS soLuong,
                don_gia AS donGia,
                ghi_chu AS ghiChu,
                trang_thai_che_bien AS trangThaiCheBien
            FROM chi_tiet_don
            WHERE don_hang_id = ?
            ORDER BY ngay_tao ASC, id ASC
            `,
            [donHangId]
        );

        return rows.map((item) => ({
            ...item,
            soLuong: Number(item.soLuong),
            donGia: Number(item.donGia)
        }));
    }

    // =====================================================
    // UC16
    // Lấy trạng thái tất cả món trong đơn hàng
    //
    // KitchenService gọi:
    // findTrangThaiByDonHangId(connection, donHangId)
    // =====================================================

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
            ORDER BY id ASC
            `,
            [donHangId]
        );

        return rows;
    }

    // =====================================================
    // UC01, UC04
    // Lưu chi tiết đơn hàng
    // =====================================================

    static async save(chiTietDon, conn = pool) {
        if (!chiTietDon) {
            throw new Error('Thiếu dữ liệu chi tiết đơn hàng');
        }

        const id = chiTietDon.id || chiTietDon.chiTietId;

        if (!id) {
            throw new Error('Thiếu ID chi tiết đơn hàng');
        }

        if (!chiTietDon.donHangId) {
            throw new Error('Thiếu donHangId');
        }

        const monId = chiTietDon.monId || chiTietDon.monAnId;

        if (!monId) {
            throw new Error('Thiếu monId');
        }

        const soLuong = Number(chiTietDon.soLuong);
        const donGia = Number(chiTietDon.donGia);

        if (!Number.isInteger(soLuong) || soLuong <= 0) {
            throw new Error('Số lượng phải lớn hơn 0');
        }

        if (!Number.isFinite(donGia) || donGia < 0) {
            throw new Error('Đơn giá không hợp lệ');
        }

        const trangThaiCheBien =
            chiTietDon.trangThaiCheBien || 'CHO_PHA_CHE';

        this.kiemTraTrangThaiCheBien(trangThaiCheBien);

        const [result] = await conn.query(
            `
            INSERT INTO chi_tiet_don (
                id,
                don_hang_id,
                mon_an_id,
                so_luong,
                don_gia,
                ghi_chu,
                trang_thai_che_bien,
                ngay_tao
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            `,
            [
                id,
                chiTietDon.donHangId,
                monId,
                soLuong,
                donGia,
                chiTietDon.ghiChu ?? null,
                trangThaiCheBien
            ]
        );

        return {
            id,
            chiTietId: id,
            affectedRows: result.affectedRows
        };
    }

    // =====================================================
    // UC16
    // Cập nhật trạng thái pha chế
    // =====================================================

    static async capNhatTrangThai(
        id,
        trangThaiCheBien,
        conn = pool
    ) {
        if (!id) {
            throw new Error('Thiếu ID chi tiết đơn hàng');
        }

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

    // =====================================================
    // UC16
    // Cập nhật trạng thái bằng connection của transaction
    //
    // KitchenService gọi:
    // capNhatTrangThaiWithConnection(
    //     connection, chiTietId, trangThaiMoi
    // )
    // =====================================================

    static async capNhatTrangThaiWithConnection(
        connection,
        chiTietId,
        trangThaiMoi
    ) {
        if (!connection) {
            throw new Error('Thiếu connection transaction');
        }

        return ChiTietDonRepository.capNhatTrangThai(
            chiTietId,
            trangThaiMoi,
            connection
        );
    }

    // =====================================================
    // UC15
    // Lấy danh sách món đang chờ hoặc đang pha chế trên KDS
    //
    // FIFO: thời điểm tạo chi tiết đơn hàng tăng dần,
    // sau đó sắp xếp theo ID để có thứ tự ổn định.
    // =====================================================

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
            INNER JOIN don_hang dh
                ON dh.id = ctd.don_hang_id
            INNER JOIN mon_an ma
                ON ma.id = ctd.mon_an_id
            LEFT JOIN ban b
                ON b.id = dh.ban_id
            WHERE ctd.trang_thai_che_bien
                NOT IN ('DA_XONG', 'DA_HUY')
              AND dh.trang_thai = 'DANG_PHUC_VU'
            ORDER BY ctd.ngay_tao ASC, ctd.id ASC
            `
        );

        return rows.map((item) => ({
            ...item,
            soLuong: Number(item.soLuong),
            donGia: Number(item.donGia)
        }));
    }
}

module.exports = ChiTietDonRepository;