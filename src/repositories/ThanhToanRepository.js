const crypto = require('crypto');
const { pool } = require('../config/db');

class ThanhToanRepository {
    static kiemTraPhuongThuc(phuongThuc) {
        if (!['TIEN_MAT', 'QR'].includes(phuongThuc)) {
            throw new Error('Phương thức thanh toán không hợp lệ');
        }
    }

    static kiemTraTrangThai(trangThai) {
        if (
            !['CHO_XU_LY', 'THANH_CONG', 'THAT_BAI', 'DA_HUY']
                .includes(trangThai)
        ) {
            throw new Error('Trạng thái thanh toán không hợp lệ');
        }
    }

    // Lưu thanh toán.
    // Có thể truyền connection để sử dụng transaction hiện tại.
    static async save(thanhToan, conn = pool) {
        if (!thanhToan || typeof thanhToan !== 'object') {
            throw new Error('Dữ liệu thanh toán không hợp lệ');
        }

        const id = thanhToan.id || crypto.randomUUID();

        const soTien = Number(
            thanhToan.soTienThanhToan ?? thanhToan.soTien
        );

        const tienKhachDua = Number(thanhToan.tienKhachDua ?? 0);
        const tienThoi = Number(thanhToan.tienThoi ?? 0);

        if (!thanhToan.donHangId) {
            throw new Error('Thanh toán thiếu donHangId');
        }

        if (
            typeof thanhToan.maGiaoDich !== 'string'
            || !thanhToan.maGiaoDich.trim()
        ) {
            throw new Error('Thanh toán thiếu maGiaoDich');
        }

        if (!Number.isFinite(soTien) || soTien < 0) {
            throw new Error('Số tiền thanh toán không hợp lệ');
        }

        if (!Number.isFinite(tienKhachDua) || tienKhachDua < 0) {
            throw new Error('Tiền khách đưa không hợp lệ');
        }

        if (!Number.isFinite(tienThoi) || tienThoi < 0) {
            throw new Error('Tiền thối không hợp lệ');
        }

        this.kiemTraPhuongThuc(thanhToan.phuongThuc);

        const trangThai = thanhToan.trangThai ?? 'THANH_CONG';
        this.kiemTraTrangThai(trangThai);

        const [result] = await conn.query(
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
        nhan_vien_id,
        ngay_tao
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
            [
                id,
                thanhToan.donHangId,
                thanhToan.phuongThuc,
                soTien,
                tienKhachDua,
                tienThoi,
                thanhToan.maGiaoDich.trim(),
                trangThai,
                thanhToan.nhanVienId ?? null,
                thanhToan.ngayTao ?? new Date(),
            ]
        );

        return {
            id,
            thanhToanId: id,
            affectedRows: result.affectedRows,
        };
    }

    // Tìm thanh toán theo mã giao dịch
    static async findByMaGiaoDich(maGiaoDich, conn = pool) {
        const [rows] = await conn.query(
            `
      SELECT
        id,
        id AS thanhToanId,
        don_hang_id AS donHangId,
        phuong_thuc AS phuongThuc,
        so_tien AS soTien,
        so_tien AS soTienThanhToan,
        tien_khach_dua AS tienKhachDua,
        tien_thoi AS tienThoi,
        ma_giao_dich AS maGiaoDich,
        trang_thai AS trangThai,
        nhan_vien_id AS nhanVienId,
        ngay_tao AS ngayTao
      FROM thanh_toan
      WHERE ma_giao_dich = ?
      LIMIT 1
      `,
            [maGiaoDich]
        );

        if (rows.length === 0) {
            return null;
        }

        const thanhToan = rows[0];

        return {
            ...thanhToan,
            soTien: Number(thanhToan.soTien),
            soTienThanhToan: Number(thanhToan.soTienThanhToan),
            tienKhachDua: Number(thanhToan.tienKhachDua),
            tienThoi: Number(thanhToan.tienThoi),
        };
    }

    // Tìm thanh toán theo ID
    static async findById(id, conn = pool) {
        const [rows] = await conn.query(
            `
      SELECT
        id,
        id AS thanhToanId,
        don_hang_id AS donHangId,
        phuong_thuc AS phuongThuc,
        so_tien AS soTien,
        so_tien AS soTienThanhToan,
        tien_khach_dua AS tienKhachDua,
        tien_thoi AS tienThoi,
        ma_giao_dich AS maGiaoDich,
        trang_thai AS trangThai,
        nhan_vien_id AS nhanVienId,
        ngay_tao AS ngayTao
      FROM thanh_toan
      WHERE id = ?
      LIMIT 1
      `,
            [id]
        );

        if (rows.length === 0) {
            return null;
        }

        const thanhToan = rows[0];

        return {
            ...thanhToan,
            soTien: Number(thanhToan.soTien),
            soTienThanhToan: Number(thanhToan.soTienThanhToan),
            tienKhachDua: Number(thanhToan.tienKhachDua),
            tienThoi: Number(thanhToan.tienThoi),
        };
    }
}

module.exports = ThanhToanRepository;