const crypto = require('crypto');
const { pool, withTransaction } = require('../config/db');

const TRANG_THAI_DON_HANG = [
    'DANG_PHUC_VU',
    'HOAN_THANH',
    'DA_THANH_TOAN',
];

const TRANG_THAI_CHE_BIEN = [
    'CHO_PHA_CHE',
    'DANG_LAM',
    'DA_XONG',
    'DA_HUY',
];

class DonHangRepository {
    // =====================================================
    // VALIDATION
    // =====================================================

    static kiemTraTongTien(tongTien) {
        if (
            typeof tongTien !== 'number'
            || !Number.isFinite(tongTien)
            || tongTien < 0
        ) {
            throw new Error('Tong tien khong hop le');
        }
    }

    static kiemTraTienGiamGia(tienGiamGia) {
        if (
            typeof tienGiamGia !== 'number'
            || !Number.isFinite(tienGiamGia)
            || tienGiamGia < 0
        ) {
            throw new Error('Tien giam gia khong hop le');
        }
    }

    static kiemTraTrangThai(trangThai) {
        if (!TRANG_THAI_DON_HANG.includes(trangThai)) {
            throw new Error('Trang thai don hang khong hop le');
        }
    }

    static kiemTraTrangThaiCheBien(trangThai) {
        if (!TRANG_THAI_CHE_BIEN.includes(trangThai)) {
            throw new Error('Trang thai che bien khong hop le');
        }
    }

    static chuyenSo(value) {
        return value == null ? 0 : Number(value);
    }

    // =====================================================
    // UC01, UC04, UC08, UC10
    // Tim don hang theo ID
    // =====================================================

    static async findById(id, conn = pool) {
        const [rows] = await conn.query(
            `
      SELECT
        id,
        id AS donHangId,
        ban_id AS banId,
        nhan_vien_id AS nhanVienId,
        khach_hang_id AS khachHangId,
        tong_tien AS tongTien,
        tien_giam_gia AS tienGiamGia,
        trang_thai AS trangThai,
        is_synced AS isSynced,
        ngay_tao AS ngayTao
      FROM don_hang
      WHERE id = ?
      LIMIT 1
      `,
            [id]
        );

        if (rows.length === 0) {
            return null;
        }

        const don = rows[0];

        return {
            ...don,
            tongTien: DonHangRepository.chuyenSo(don.tongTien),
            tienGiamGia: DonHangRepository.chuyenSo(don.tienGiamGia),
            isSynced: Boolean(don.isSynced),
        };
    }

    // =====================================================
    // Tim don chua thanh toan cua mot ban (DANG_PHUC_VU hoac HOAN_THANH)
    // =====================================================

    static async findDangPhucVuByBan(banId, conn = pool) {
        const [rows] = await conn.query(
            `
      SELECT
        id,
        id AS donHangId,
        ban_id AS banId,
        nhan_vien_id AS nhanVienId,
        khach_hang_id AS khachHangId,
        tong_tien AS tongTien,
        tien_giam_gia AS tienGiamGia,
        trang_thai AS trangThai,
        is_synced AS isSynced,
        ngay_tao AS ngayTao
      FROM don_hang
      WHERE ban_id = ?
        AND trang_thai IN ('DANG_PHUC_VU', 'HOAN_THANH')
      ORDER BY ngay_tao DESC, id DESC
      LIMIT 1
      `,
            [banId]
        );

        if (rows.length === 0) {
            return null;
        }

        const don = rows[0];

        return {
            ...don,
            tongTien: DonHangRepository.chuyenSo(don.tongTien),
            tienGiamGia: DonHangRepository.chuyenSo(don.tienGiamGia),
            isSynced: Boolean(don.isSynced),
        };
    }

    // =====================================================
    // UC04, UC08
    // Lay danh sach chi tiet cua don hang
    // =====================================================

    static async findChiTietByDon(donHangId, conn = pool) {
        const [rows] = await conn.query(
            `
      SELECT
        ctd.id AS chiTietId,
        ctd.don_hang_id AS donHangId,
        ctd.mon_an_id AS monId,
        ctd.mon_an_id AS monAnId,
        ma.ten_mon AS tenMon,
        ma.gia AS gia,
        ctd.so_luong AS soLuong,
        ctd.don_gia AS donGia,
        ctd.ghi_chu AS ghiChu,
        ctd.trang_thai_che_bien AS trangThaiCheBien,
        ctd.ngay_tao AS ngayTao
      FROM chi_tiet_don ctd
      INNER JOIN mon_an ma
        ON ma.id = ctd.mon_an_id
      WHERE ctd.don_hang_id = ?
      ORDER BY ctd.ngay_tao ASC, ctd.id ASC
      `,
            [donHangId]
        );

        return rows.map((item) => ({
            ...item,
            soLuong: Number(item.soLuong),
            donGia: DonHangRepository.chuyenSo(item.donGia),
            gia: DonHangRepository.chuyenSo(item.gia),
        }));
    }

    // =====================================================
    // UC01
    // Luu don hang va cac mon trong don
    //
    // Khong truyen conn: tu tao transaction.
    // Co truyen conn: su dung transaction cua ben goi.
    // =====================================================

    static async luuOrder(order, conn = null) {
        if (!order || typeof order !== 'object') {
            throw new Error('Du lieu don hang khong hop le');
        }

        if (!order.banId) {
            throw new Error('Thieu banId');
        }

        const tongTien = Number(order.tongTien ?? 0);
        const tienGiamGia = Number(order.tienGiamGia ?? 0);
        const trangThai = order.trangThai ?? 'DANG_PHUC_VU';
        const isSynced = order.isSynced ?? true;

        DonHangRepository.kiemTraTongTien(tongTien);
        DonHangRepository.kiemTraTienGiamGia(tienGiamGia);
        DonHangRepository.kiemTraTrangThai(trangThai);

        if (typeof isSynced !== 'boolean') {
            throw new Error('isSynced phai la boolean');
        }

        const id = order.donHangId || order.id || crypto.randomUUID();

        const thucHienLuu = async (connection) => {
            await connection.query(
                `
        INSERT INTO don_hang (
          id,
          ban_id,
          khach_hang_id,
          nhan_vien_id,
          tong_tien,
          tien_giam_gia,
          trang_thai,
          is_synced,
          ngay_tao
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `,
                [
                    id,
                    order.banId,
                    order.khachHangId ?? null,
                    order.nhanVienId ?? null,
                    tongTien,
                    tienGiamGia,
                    trangThai,
                    isSynced ? 1 : 0,
                ]
            );

            let dsChiTiet = [];

            if (order.dsMon !== undefined) {
                if (!Array.isArray(order.dsMon)) {
                    throw new Error('dsMon phai la mang');
                }

                if (order.dsMon.length > 0) {
                    dsChiTiet = await DonHangRepository.themChiTiet(
                        id,
                        order.dsMon,
                        connection
                    );
                }
            }

            return {
                id,
                donHangId: id,
                affectedRows: 1,
                dsChiTiet,
            };
        };

        if (conn) {
            return thucHienLuu(conn);
        }

        return withTransaction(thucHienLuu);
    }

    // =====================================================
    // UC04
    // Them cac mon vao don hang da ton tai
    // =====================================================

    static async themChiTiet(donHangId, dsMonMoi, conn = pool) {
        if (!donHangId) {
            throw new Error('Thieu donHangId');
        }

        if (!Array.isArray(dsMonMoi)) {
            throw new Error('dsMonMoi phai la mang');
        }

        const ketQua = [];

        for (const mon of dsMonMoi) {
            const monId = mon.monId || mon.monAnId;
            const soLuong = Number(mon.soLuong);
            const donGia = Number(mon.donGia ?? mon.gia);
            const trangThaiCheBien =
                mon.trangThaiCheBien || 'CHO_PHA_CHE';

            if (!monId) {
                throw new Error('Thieu monId');
            }

            if (!Number.isInteger(soLuong) || soLuong <= 0) {
                throw new Error('So luong phai lon hon 0');
            }

            if (!Number.isFinite(donGia) || donGia < 0) {
                throw new Error('Don gia khong hop le');
            }

            DonHangRepository.kiemTraTrangThaiCheBien(trangThaiCheBien);

            const id = mon.chiTietId || mon.id || crypto.randomUUID();

            await conn.query(
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
                    donHangId,
                    monId,
                    soLuong,
                    donGia,
                    mon.ghiChu ?? null,
                    trangThaiCheBien,
                ]
            );

            ketQua.push({
                id,
                chiTietId: id,
                donHangId,
                monId,
                monAnId: monId,
                tenMon: mon.tenMon ?? null,
                soLuong,
                donGia,
                ghiChu: mon.ghiChu ?? null,
                trangThaiCheBien,
            });
        }

        return ketQua;
    }

    // =====================================================
    // UC04
    // Cap nhat mot chi tiet don hang
    //
    // Chi cho phep cap nhat cac cot duoc liet ke ben duoi.
    // =====================================================

    static async capNhatChiTiet(chiTietId, chiTiet, conn = pool) {
        if (!chiTietId) {
            throw new Error('Thieu chiTietId');
        }

        if (!chiTiet || typeof chiTiet !== 'object') {
            throw new Error('Du lieu chi tiet khong hop le');
        }

        const cotDuocPhep = {
            soLuong: 'so_luong',
            donGia: 'don_gia',
            ghiChu: 'ghi_chu',
            trangThaiCheBien: 'trang_thai_che_bien',
        };

        const assignments = [];
        const values = [];

        for (const [key, column] of Object.entries(cotDuocPhep)) {
            if (!Object.prototype.hasOwnProperty.call(chiTiet, key)) {
                continue;
            }

            let value = chiTiet[key];

            if (key === 'soLuong') {
                value = Number(value);

                if (!Number.isInteger(value) || value <= 0) {
                    throw new Error('So luong phai lon hon 0');
                }
            }

            if (key === 'donGia') {
                value = Number(value);

                if (!Number.isFinite(value) || value < 0) {
                    throw new Error('Don gia khong hop le');
                }
            }

            if (key === 'trangThaiCheBien') {
                DonHangRepository.kiemTraTrangThaiCheBien(value);
            }

            assignments.push(`${column} = ?`);
            values.push(value);
        }

        if (assignments.length === 0) {
            throw new Error('Khong co truong nao de cap nhat');
        }

        values.push(chiTietId);

        const [result] = await conn.query(
            `
      UPDATE chi_tiet_don
      SET ${assignments.join(', ')}
      WHERE id = ?
      `,
            values
        );

        return result.affectedRows > 0;
    }

    // =====================================================
    // UC04
    // Cap nhat tong tien don hang
    // =====================================================

    static async capNhatTongTien(donHangId, tongTien, conn = pool) {
        if (!donHangId) {
            throw new Error('Thieu donHangId');
        }

        tongTien = Number(tongTien);
        DonHangRepository.kiemTraTongTien(tongTien);

        const [result] = await conn.query(
            `
      UPDATE don_hang
      SET tong_tien = ?
      WHERE id = ?
      `,
            [tongTien, donHangId]
        );

        return result.affectedRows > 0;
    }

    // =====================================================
    // UC04
    // Cap nhat trang thai dong bo KDS
    // =====================================================

    static async capNhatDongBo(donHangId, isSynced, conn = pool) {
        if (!donHangId) {
            throw new Error('Thieu donHangId');
        }

        if (typeof isSynced !== 'boolean') {
            throw new Error('isSynced phai la boolean');
        }

        const [result] = await conn.query(
            `
      UPDATE don_hang
      SET is_synced = ?
      WHERE id = ?
      `,
            [isSynced ? 1 : 0, donHangId]
        );

        return result.affectedRows > 0;
    }

    // =====================================================
    // UC10, UC16
    // Cap nhat trang thai don hang
    // =====================================================

    static async capNhatTrangThai(id, trangThai, conn = pool) {
        if (!id) {
            throw new Error('Thieu donHangId');
        }

        DonHangRepository.kiemTraTrangThai(trangThai);

        const [result] = await conn.query(
            `
      UPDATE don_hang
      SET trang_thai = ?
      WHERE id = ?
      `,
            [trangThai, id]
        );

        return result.affectedRows > 0;
    }

    // Tuong thich voi cac service dang dung ten ham nay.
    // Thu tu tham so: (id, trangThai, conn).
    static async capNhatTrangThaiWithConnection(id, trangThai, conn) {
        if (!conn) {
            throw new Error('Thieu connection cho transaction');
        }

        return DonHangRepository.capNhatTrangThai(
            id,
            trangThai,
            conn
        );
    }
}

module.exports = DonHangRepository;
