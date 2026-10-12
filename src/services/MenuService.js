// =====================================================
// MenuService - Tầng nghiệp vụ (Service) cho UC22 Quản lý menu
// -----------------------------------------------------
// Chỉ CHỦ QUÁN dùng (phân quyền đặt ở routes/index.js, Bước 4).
// Nhiệm vụ: kiểm tra "luật của quán" trước khi ghi vào CSDL:
//   - Tên món không được trống, tối đa 100 ký tự (giống cột ten_mon VARCHAR(100))
//   - Giá là số nguyên, từ 1 đồng đến 10.000.000 đồng (chặn gõ nhầm thừa số 0)
//   - Không cho thêm món trùng tên với món đã có (không phân biệt hoa thường)
// Không viết SQL ở đây: mọi việc đọc/ghi CSDL nhờ MonAnRepository (Bước 1).
// Có lỗi thì ném AppError(maLoi, message, mãHTTP); errorHandler sẽ đổi thành
// response chuẩn { success: false, data: null, maLoi, message } cho giao diện.
// =====================================================

const AppError = require('../utils/AppError');
const MonAnRepository = require('../repositories/MonAnRepository');

// Giá cao nhất cho 1 món: 10 triệu đồng
const GIA_TOI_DA = 10000000;
// 2 trạng thái hợp lệ, khớp ENUM trang_thai của bảng mon_an
const TRANG_THAI = ['CON_HANG', 'TAM_HET'];

class MenuService {
    // Lấy toàn bộ thực đơn (sắp theo tên A -> Z) cho trang Quản lý menu
    static async layDanhSach() {
        return MonAnRepository.findAll();
    }

    // Chuẩn hóa tên món: bỏ dấu cách thừa ở đầu/cuối và giữa các chữ
    // Ví dụ: "  Cà   phê muối " -> "Cà phê muối". Không phải chữ thì coi như rỗng
    static chuanHoaTen(tenMon) {
        return typeof tenMon === 'string' ? tenMon.trim().replace(/\s+/g, ' ') : '';
    }

    // Luật 1: tên món không trống, tối đa 100 ký tự
    static kiemTraTen(tenMon) {
        if (!tenMon) {
            throw new AppError('TEN_MON_TRONG', 'Vui lòng nhập tên món', 400);
        }
        if (tenMon.length > 100) {
            throw new AppError('TEN_MON_QUA_DAI', 'Tên món tối đa 100 ký tự', 400);
        }
    }

    // Luật 2: giá là số nguyên từ 1 đến 10.000.000 đồng
    // Number.isInteger: chặn chữ, số thập phân, giá trống
    static kiemTraGia(gia) {
        if (!Number.isInteger(gia) || gia <= 0 || gia > GIA_TOI_DA) {
            throw new AppError('GIA_KHONG_HOP_LE', 'Giá phải là số nguyên từ 1 đến 10.000.000 đồng', 400);
        }
    }

    // Luật 3: không trùng tên món đã có (so sánh không phân biệt hoa thường)
    // Mã lỗi HTTP 409 = "xung đột với dữ liệu đang có"
    static async kiemTraTrungTen(tenMon) {
        const dsMon = await MonAnRepository.findAll();
        const trung = dsMon.find((m) => m.tenMon.toLowerCase() === tenMon.toLowerCase());
        if (trung) {
            throw new AppError('TEN_MON_DA_TON_TAI', `Món "${trung.tenMon}" đã có trong thực đơn`, 409);
        }
    }

    // UC22 - Thêm món mới
    // - Đầu vào: dto = { tenMon, gia } do giao diện gửi lên, ví dụ { tenMon: 'Cà phê muối', gia: 35000 }
    // - Thứ tự: chuẩn hóa tên -> kiểm tra tên -> kiểm tra giá -> kiểm tra trùng -> ghi CSDL
    // - Trả về: món vừa thêm (có id mới), trạng thái mặc định CON_HANG
    static async themMon(dto) {
        const tenMon = MenuService.chuanHoaTen(dto && dto.tenMon);
        const gia = dto && dto.gia;

        MenuService.kiemTraTen(tenMon);
        MenuService.kiemTraGia(gia);
        await MenuService.kiemTraTrungTen(tenMon);

        return MonAnRepository.taoMoi({ tenMon, gia });
    }

    // UC22 - Sửa giá và/hoặc bật/tắt bán 1 món
    // - Đầu vào: monId (mã món) + dto = { gia?, trangThai? } (gửi 1 hoặc cả 2)
    //   ví dụ { gia: 30000 } hoặc { trangThai: 'TAM_HET' }
    // - Trả về: món sau khi sửa, đọc lại từ CSDL
    static async capNhatMon(monId, dto) {
        // Món phải tồn tại, không có thì báo 404
        const mon = await MonAnRepository.findById(monId);
        if (!mon) {
            throw new AppError('MON_KHONG_TON_TAI', 'Không tìm thấy món', 404);
        }

        const coGia = Boolean(dto) && dto.gia !== undefined;
        const coTrangThai = Boolean(dto) && dto.trangThai !== undefined;

        // Không gửi gì để sửa -> báo lỗi
        if (!coGia && !coTrangThai) {
            throw new AppError('DU_LIEU_KHONG_HOP_LE', 'Không có thông tin cần sửa', 400);
        }

        // Kiểm tra HẾT trước rồi mới ghi, để không bị "sửa được nửa chừng"
        if (coGia) {
            MenuService.kiemTraGia(dto.gia);
        }
        if (coTrangThai && !TRANG_THAI.includes(dto.trangThai)) {
            throw new AppError('TRANG_THAI_KHONG_HOP_LE', 'Trạng thái chỉ được là CON_HANG hoặc TAM_HET', 400);
        }

        if (coGia) {
            await MonAnRepository.capNhatGia(mon.monId, dto.gia);
        }
        if (coTrangThai) {
            await MonAnRepository.capNhatTrangThai(mon.monId, dto.trangThai);
        }

        return MonAnRepository.findById(mon.monId);
    }
}

// Xuất ra để MenuController (Bước 3) dùng
module.exports = MenuService;