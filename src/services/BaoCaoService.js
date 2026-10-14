// =====================================================
// BaoCaoService - Tầng nghiệp vụ cho UC24 Báo cáo doanh thu (chỉ CHỦ QUÁN)
// Kiểm tra khoảng ngày -> đổi sang 2 mốc giờ -> gọi 4 truy vấn -> gộp kết quả cho giao diện
// =====================================================

const AppError = require('../utils/AppError'); // lỗi nghiệp vụ: AppError(maLoi, message, mãHTTP)
const BaoCaoRepository = require('../repositories/BaoCaoRepository'); // 4 câu SQL đọc doanh thu (Bước 1)

const SO_NGAY_TOI_DA = 366; // xem tối đa 1 năm mỗi lần, tránh truy vấn quá nặng
const PHUONG_THUC = ['TIEN_MAT', 'QR']; // luôn trả đủ 2 phương thức, kể cả khi bằng 0

class BaoCaoService {
    static homNay() { // ngày hôm nay theo giờ máy chủ, dạng 'YYYY-MM-DD'
        const d = new Date(); // thời điểm hiện tại
        const p = (n) => String(n).padStart(2, '0'); // thêm số 0 phía trước: 5 -> '05'
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; // getMonth() đếm từ 0 nên +1
    }

    static docNgay(chuoi) { // 'YYYY-MM-DD' -> số ngày (để so sánh, cộng ngày); sai thì trả null
        if (typeof chuoi !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(chuoi)) return null; // sai dạng, ví dụ '10/10/2026'
        const [y, m, d] = chuoi.split('-').map(Number); // tách năm, tháng, ngày thành số
        const ms = Date.UTC(y, m - 1, d); // đổi sang mili giây (giờ UTC để không lệch múi giờ)
        const kiemTra = new Date(ms); // dựng lại ngày từ mili giây
        if (kiemTra.getUTCFullYear() !== y || kiemTra.getUTCMonth() !== m - 1 || kiemTra.getUTCDate() !== d) return null; // ngày không có thật, ví dụ 30/02 bị tự đổi thành 02/03
        return ms / 86400000; // 86.400.000 mili giây = 1 ngày -> ra số thứ tự ngày
    }

    static vietNgay(soNgay) { // số thứ tự ngày -> 'YYYY-MM-DD'
        return new Date(soNgay * 86400000).toISOString().slice(0, 10); // lấy 10 ký tự đầu 'YYYY-MM-DD'
    }

    static async layBaoCao(query = {}) { // UC24: query = { tuNgay, denNgay } lấy từ đường dẫn ?tuNgay=...&denNgay=...
        const tuNgay = query.tuNgay || query.denNgay || BaoCaoService.homNay(); // không gửi gì -> hôm nay
        const denNgay = query.denNgay || tuNgay; // chỉ gửi 1 ngày -> xem đúng ngày đó

        const tu = BaoCaoService.docNgay(tuNgay); // số thứ tự của "từ ngày"
        const den = BaoCaoService.docNgay(denNgay); // số thứ tự của "đến ngày"
        if (tu === null || den === null) { // 1 trong 2 ngày sai dạng hoặc không có thật
            throw new AppError('NGAY_KHONG_HOP_LE', 'Ngày phải có dạng YYYY-MM-DD và là ngày có thật', 400);
        }
        if (tu > den) { // chọn ngược: từ 13/10 đến 01/10
            throw new AppError('KHOANG_NGAY_KHONG_HOP_LE', '"Từ ngày" không được sau "Đến ngày"', 400);
        }
        if (den - tu + 1 > SO_NGAY_TOI_DA) { // khoảng quá dài (tính cả 2 đầu nên +1)
            throw new AppError('KHOANG_NGAY_KHONG_HOP_LE', 'Chỉ xem tối đa 366 ngày mỗi lần', 400);
        }

        const tuLuc = `${tuNgay} 00:00:00`; // tính TỪ 0 giờ của "từ ngày"
        const denTruoc = `${BaoCaoService.vietNgay(den + 1)} 00:00:00`; // tính TỚI TRƯỚC 0 giờ của ngày SAU "đến ngày" -> trọn ngày cuối

        const [tong, phuongThuc, theoNgay, topMon] = await Promise.all([ // 4 truy vấn độc lập -> chạy cùng lúc cho nhanh
            BaoCaoRepository.tongQuan(tuLuc, denTruoc), // tổng doanh thu + số đơn
            BaoCaoRepository.theoPhuongThuc(tuLuc, denTruoc), // tiền mặt / QR
            BaoCaoRepository.theoNgay(tuLuc, denTruoc), // từng ngày
            BaoCaoRepository.topMon(tuLuc, denTruoc, 5), // 5 món bán chạy nhất
        ]);

        return { // gộp thành 1 kết quả gửi cho giao diện
            tuNgay, // ngày bắt đầu đã dùng
            denNgay, // ngày kết thúc đã dùng
            soDon: tong.soDon, // số đơn đã thanh toán
            doanhThu: tong.doanhThu, // tổng tiền thu được
            trungBinhDon: tong.soDon ? Math.round(tong.doanhThu / tong.soDon) : 0, // trung bình mỗi đơn; không có đơn thì 0 (tránh chia cho 0)
            theoPhuongThuc: PHUONG_THUC.map((pt) => phuongThuc.find((x) => x.phuongThuc === pt) // lấy số liệu của từng phương thức
                || { phuongThuc: pt, soDon: 0, doanhThu: 0 }), // phương thức chưa có giao dịch -> điền 0
            theoNgay, // mảng doanh thu từng ngày
            topMon, // mảng 5 món bán chạy
        };
    }
}

module.exports = BaoCaoService; // xuất ra cho BaoCaoController (Bước 3) dùng