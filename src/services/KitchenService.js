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


    // =========================================================
    // UC16 - Cập nhật trạng thái món
    // =========================================================
    static async updateItemStatus(chiTietId, trangThaiMoi) {

        const result = await withTransaction(async (connection) => {

            // -------------------------------------------------
            // 1. Lấy chi tiết món và khóa dòng
            // -------------------------------------------------
            const [itemRows] = await connection.query(`
                SELECT
                    ct.id,
                    ct.don_hang_id,
                    ct.trang_thai_che_bien,
                    d.trang_thai AS trang_thai_don
                FROM chi_tiet_don ct
                INNER JOIN don_hang d
                    ON d.id = ct.don_hang_id
                WHERE ct.id = ?
                FOR UPDATE
            `, [chiTietId]);

            if (itemRows.length === 0) {
                throw new AppError(
                    'MON_TRONG_DON_KHONG_TON_TAI',
                    'Món trong đơn không tồn tại',
                    404
                );
            }

            const item = itemRows[0];

            // -------------------------------------------------
            // 2. Không cho thao tác món đã hủy
            // -------------------------------------------------
            if (item.trang_thai_che_bien === 'DA_HUY') {
                throw new AppError(
                    'MON_DA_HUY',
                    'Món đã bị hủy',
                    409
                );
            }

            // -------------------------------------------------
            // 3. Kiểm tra chuyển trạng thái hợp lệ
            // -------------------------------------------------
            const transitionHopLe =
                (item.trang_thai_che_bien === 'CHO_PHA_CHE'
                    && trangThaiMoi === 'DANG_LAM')
                ||
                (item.trang_thai_che_bien === 'DANG_LAM'
                    && trangThaiMoi === 'DA_XONG');

            if (!transitionHopLe) {
                throw new AppError(
                    'CHUYEN_TRANG_THAI_KHONG_HOP_LE',
                    'Chuyển trạng thái món không hợp lệ',
                    409
                );
            }

            // -------------------------------------------------
            // 4. Cập nhật trạng thái món
            // -------------------------------------------------
            await connection.query(`
                UPDATE chi_tiet_don
                SET trang_thai_che_bien = ?
                WHERE id = ?
            `, [
                trangThaiMoi,
                chiTietId
            ]);

            // -------------------------------------------------
            // 5. Kiểm tra toàn bộ món trong đơn
            // -------------------------------------------------
            let trangThaiDonMoi = item.trang_thai_don;

            const [itemsInOrder] = await connection.query(`
                SELECT trang_thai_che_bien
                FROM chi_tiet_don
                WHERE don_hang_id = ?
            `, [item.don_hang_id]);

            const activeItems = itemsInOrder.filter(
                x => x.trang_thai_che_bien !== 'DA_HUY'
            );

            const tatCaDaXong =
                activeItems.length > 0 &&
                activeItems.every(
                    x => x.trang_thai_che_bien === 'DA_XONG'
                );

            if (tatCaDaXong) {
                await connection.query(`
                    UPDATE don_hang
                    SET trang_thai = 'HOAN_THANH',
                        ngay_cap_nhat = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, [item.don_hang_id]);

                trangThaiDonMoi = 'HOAN_THANH';
            }

            return {
                chiTietId,
                donHangId: item.don_hang_id,
                trangThaiCheBien: trangThaiMoi,
                trangThaiDon: trangThaiDonMoi
            };
        });

        // -----------------------------------------------------
        // 6. Broadcast SAU KHI transaction commit
        // -----------------------------------------------------
        broadcastOrderUpdated(result);

        return result;
    }


    // =========================================================
    // UC16 - Undo trạng thái món
    // =========================================================
    static async undoItemStatus(chiTietId) {

        const result = await withTransaction(async (connection) => {

            // -------------------------------------------------
            // 1. Lấy món và khóa dòng
            // -------------------------------------------------
            const [itemRows] = await connection.query(`
                SELECT
                    ct.id,
                    ct.don_hang_id,
                    ct.trang_thai_che_bien,
                    d.trang_thai AS trang_thai_don
                FROM chi_tiet_don ct
                INNER JOIN don_hang d
                    ON d.id = ct.don_hang_id
                WHERE ct.id = ?
                FOR UPDATE
            `, [chiTietId]);

            if (itemRows.length === 0) {
                throw new AppError(
                    'MON_TRONG_DON_KHONG_TON_TAI',
                    'Món trong đơn không tồn tại',
                    404
                );
            }

            const item = itemRows[0];

            // -------------------------------------------------
            // 2. Không undo món đã hủy
            // -------------------------------------------------
            if (item.trang_thai_che_bien === 'DA_HUY') {
                throw new AppError(
                    'MON_DA_HUY',
                    'Món đã bị hủy',
                    409
                );
            }

            // -------------------------------------------------
            // 3. Xác định trạng thái quay lại
            // -------------------------------------------------
            let trangThaiMoi;

            if (item.trang_thai_che_bien === 'DA_XONG') {
                trangThaiMoi = 'DANG_LAM';
            }
            else if (item.trang_thai_che_bien === 'DANG_LAM') {
                trangThaiMoi = 'CHO_PHA_CHE';
            }
            else {
                throw new AppError(
                    'KHONG_THE_HOAN_TAC',
                    'Không thể hoàn tác trạng thái hiện tại',
                    409
                );
            }

            // -------------------------------------------------
            // 4. Update trạng thái
            // -------------------------------------------------
            await connection.query(`
                UPDATE chi_tiet_don
                SET trang_thai_che_bien = ?
                WHERE id = ?
            `, [
                trangThaiMoi,
                chiTietId
            ]);

            // -------------------------------------------------
            // 5. Nếu order đã HOAN_THANH nhưng undo món
            //    thì đưa order về DANG_PHUC_VU
            // -------------------------------------------------
            let trangThaiDonMoi = item.trang_thai_don;

            if (item.trang_thai_don === 'HOAN_THANH') {
                await connection.query(`
                    UPDATE don_hang
                    SET trang_thai = 'DANG_PHUC_VU',
                        ngay_cap_nhat = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, [item.don_hang_id]);

                trangThaiDonMoi = 'DANG_PHUC_VU';
            }

            return {
                chiTietId,
                donHangId: item.don_hang_id,
                trangThaiCheBien: trangThaiMoi,
                trangThaiDon: trangThaiDonMoi
            };
        });

        // -----------------------------------------------------
        // 6. Broadcast SAU transaction
        // -----------------------------------------------------
        broadcastOrderUpdated(result);

        return result;
    }
}

module.exports = KitchenService;
