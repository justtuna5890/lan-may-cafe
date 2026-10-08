const { pool, withTransaction } = require('../config/db');
const AppError = require('../utils/AppError');
const {
    broadcastOrderUpdated
} = require('../realtime/kds');
const ChiTietDonRepository = require('../repositories/ChiTietDonRepository');
const DonHangRepository = require('../repositories/DonHangRepository');

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

    // =========================================================
    // UC16 - Cập nhật trạng thái món
    // =========================================================
    static async updateItemStatus(chiTietId, trangThaiMoi) {

        const result = await withTransaction(async (connection) => {

            // -------------------------------------------------
            // 1. Lấy món và khóa dòng
            // -------------------------------------------------
            const item =
                await ChiTietDonRepository.findByIdForUpdate(
                    connection,
                    chiTietId
                );

            if (!item) {
                throw new AppError(
                    'MON_TRONG_DON_KHONG_TON_TAI',
                    'Món trong đơn không tồn tại',
                    404
                );
            }

            // -------------------------------------------------
            // 2. Không cho thao tác món đã hủy
            // -------------------------------------------------
            if (item.trangThaiCheBien === 'DA_HUY') {
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
                (
                    item.trangThaiCheBien === 'CHO_PHA_CHE' &&
                    trangThaiMoi === 'DANG_LAM'
                )
                ||
                (
                    item.trangThaiCheBien === 'DANG_LAM' &&
                    trangThaiMoi === 'DA_XONG'
                );

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
            await ChiTietDonRepository.capNhatTrangThaiWithConnection(
                connection,
                chiTietId,
                trangThaiMoi
            );

            // -------------------------------------------------
            // 5. Kiểm tra toàn bộ món trong đơn
            // -------------------------------------------------
            const itemsInOrder =
                await ChiTietDonRepository.findTrangThaiByDonHangId(
                    connection,
                    item.donHangId
                );

            const activeItems = itemsInOrder.filter(
                x => x.trangThaiCheBien !== 'DA_HUY'
            );

            const tatCaDaXong =
                activeItems.length > 0 &&
                activeItems.every(
                    x => x.trangThaiCheBien === 'DA_XONG'
                );

            let trangThaiDonMoi = item.trangThaiDon;

            if (tatCaDaXong) {

                await DonHangRepository.capNhatTrangThaiWithConnection(
                    connection,
                    item.donHangId,
                    'HOAN_THANH'
                );

                trangThaiDonMoi = 'HOAN_THANH';
            }

            return {
                chiTietId,
                donHangId: item.donHangId,
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
            const item =
                await ChiTietDonRepository.findByIdForUpdate(
                    connection,
                    chiTietId
                );

            if (!item) {
                throw new AppError(
                    'MON_TRONG_DON_KHONG_TON_TAI',
                    'Món trong đơn không tồn tại',
                    404
                );
            }

            // -------------------------------------------------
            // 2. Không undo món đã hủy
            // -------------------------------------------------
            if (item.trangThaiCheBien === 'DA_HUY') {
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

            if (item.trangThaiCheBien === 'DA_XONG') {
                trangThaiMoi = 'DANG_LAM';
            }
            else if (item.trangThaiCheBien === 'DANG_LAM') {
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
            // 4. Cập nhật trạng thái món
            // -------------------------------------------------
            await ChiTietDonRepository.capNhatTrangThaiWithConnection(
                connection,
                chiTietId,
                trangThaiMoi
            );

            // -------------------------------------------------
            // 5. Nếu order đã HOAN_THANH nhưng undo món
            //    thì đưa order về DANG_PHUC_VU
            // -------------------------------------------------
            let trangThaiDonMoi = item.trangThaiDon;

            if (item.trangThaiDon === 'HOAN_THANH') {

                await DonHangRepository.capNhatTrangThaiWithConnection(
                    connection,
                    item.donHangId,
                    'DANG_PHUC_VU'
                );

                trangThaiDonMoi = 'DANG_PHUC_VU';
            }

            return {
                chiTietId,
                donHangId: item.donHangId,
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
