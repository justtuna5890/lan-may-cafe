
const { withTransaction } = require('../config/db');
const KhoHangRepository = require('../repositories/KhoHangRepository');
const AppError = require('../utils/AppError');

class KhoHangService {
    // Lấy danh sách nguyên liệu
    static async layDanhSachNguyenLieu() {
        return await KhoHangRepository.findAll();
    }

    // Lấy nguyên liệu theo ID
    static async layNguyenLieuTheoId(id) {
        if (!id) {
            throw new AppError(
                'KHO_THIEU_ID',
                'Thiếu mã nguyên liệu',
                400
            );
        }

        const nguyenLieu = await KhoHangRepository.findById(id);

        if (!nguyenLieu) {
            throw new AppError(
                'KHO_KHONG_TIM_THAY',
                'Không tìm thấy nguyên liệu',
                404
            );
        }

        return nguyenLieu;
    }

    // Đánh dấu nguyên liệu hết hàng
    static async danhDauHetHang(id) {
        if (!id) {
            throw new AppError(
                'KHO_THIEU_ID',
                'Thiếu mã nguyên liệu',
                400
            );
        }

        return await withTransaction(async (conn) => {
            const nguyenLieu = await KhoHangRepository.findById(id, conn);

            if (!nguyenLieu) {
                throw new AppError(
                    'KHO_KHONG_TIM_THAY',
                    'Không tìm thấy nguyên liệu',
                    404
                );
            }

            await KhoHangRepository.danhDauHetHang(id, conn);

            await KhoHangRepository.dongBoTrangThaiMonAn(id, conn);

            return {
                id: nguyenLieu.id,
                tenNguyenLieu: nguyenLieu.tenNguyenLieu,
                tonKho: 0
            };
        });
    }

    // Nhập thêm nguyên liệu
    static async nhapKho(id, soLuong) {
        if (!id) {
            throw new AppError(
                'KHO_THIEU_ID',
                'Thiếu mã nguyên liệu',
                400
            );
        }

        if (
            soLuong === undefined ||
            soLuong === null ||
            soLuong === ''
        ) {
            throw new AppError(
                'KHO_SO_LUONG_KHONG_HOP_LE',
                'Vui lòng nhập số lượng nhập',
                400
            );
        }

        const soLuongNhap = Number(soLuong);

        if (!Number.isFinite(soLuongNhap) || soLuongNhap <= 0) {
            throw new AppError(
                'KHO_SO_LUONG_KHONG_HOP_LE',
                'Số lượng nhập phải lớn hơn 0',
                400
            );
        }

        return await withTransaction(async (conn) => {
            const nguyenLieu = await KhoHangRepository.findById(id, conn);

            if (!nguyenLieu) {
                throw new AppError(
                    'KHO_KHONG_TIM_THAY',
                    'Không tìm thấy nguyên liệu',
                    404
                );
            }

            const daNhap = await KhoHangRepository.nhapKho(
                id,
                soLuongNhap,
                conn
            );

            if (!daNhap) {
                throw new AppError(
                    'KHO_NHAP_THAT_BAI',
                    'Không thể nhập kho nguyên liệu',
                    400
                );
            }

            await KhoHangRepository.dongBoTrangThaiMonAn(id, conn);

            return await KhoHangRepository.findById(id, conn);
        });
    }

    // Xuất nguyên liệu
    static async xuatKho(id, soLuong) {
        if (!id) {
            throw new AppError(
                'KHO_THIEU_ID',
                'Thiếu mã nguyên liệu',
                400
            );
        }

        const soLuongXuat = Number(soLuong);

        if (
            soLuong === undefined ||
            soLuong === null ||
            soLuong === '' ||
            !Number.isFinite(soLuongXuat) ||
            soLuongXuat <= 0
        ) {
            throw new AppError(
                'KHO_SO_LUONG_KHONG_HOP_LE',
                'Số lượng xuất phải lớn hơn 0',
                400
            );
        }

        return await withTransaction(async (conn) => {
            const nguyenLieu = await KhoHangRepository.findById(id, conn);

            if (!nguyenLieu) {
                throw new AppError(
                    'KHO_KHONG_TIM_THAY',
                    'Không tìm thấy nguyên liệu',
                    404
                );
            }

            const daXuat = await KhoHangRepository.xuatKho(
                id,
                soLuongXuat,
                conn
            );

            if (!daXuat) {
                throw new AppError(
                    'KHO_XUAT_THAT_BAI',
                    'Không đủ tồn kho hoặc không thể xuất nguyên liệu',
                    400
                );
            }

            await KhoHangRepository.dongBoTrangThaiMonAn(id, conn);

            return await KhoHangRepository.findById(id, conn);
        });
    }
}

module.exports = KhoHangService;
