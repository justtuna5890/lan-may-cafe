// =====================================================
// BaoCaoRepository - Tầng truy xuất dữ liệu cho UC24 Báo cáo doanh thu
// CHỈ ĐỌC dữ liệu (không thêm/sửa/xóa) -> không ảnh hưởng luồng gọi món, thanh toán
// Mọi hàm nhận khoảng [tuLuc, denTruoc): ví dụ '2026-10-13 00:00:00' đến TRƯỚC '2026-10-14 00:00:00' = trọn ngày 13/10
// =====================================================

const { pool } = require('../config/db'); // hồ kết nối MySQL dùng chung cho cả app

class BaoCaoRepository {
    static async tongQuan(tuLuc, denTruoc, conn = pool) { // tổng số đơn đã thanh toán + tổng doanh thu trong khoảng thời gian
        const [rows] = await conn.query( // SQL: đếm số dòng và cộng so_tien của bảng thanh_toan, chỉ lấy giao dịch THANH_CONG trong khoảng; COALESCE đổi NULL thành 0 khi không có giao dịch nào
            `
      SELECT
        COUNT(*) AS soDon,
        COALESCE(SUM(so_tien), 0) AS doanhThu
      FROM thanh_toan
      WHERE trang_thai = 'THANH_CONG'
        AND ngay_tao >= ?
        AND ngay_tao < ?
      `,
            [tuLuc, denTruoc] // 2 dấu ? trong SQL lần lượt nhận 2 giá trị này (chống SQL injection)
        );

        return { // kết quả chỉ có 1 dòng (rows[0])
            soDon: Number(rows[0].soDon), // đổi chắc chắn sang kiểu số
            doanhThu: Number(rows[0].doanhThu), // tổng tiền (VNĐ)
        };
    }

    static async theoPhuongThuc(tuLuc, denTruoc, conn = pool) { // chia doanh thu theo TIEN_MAT và QR
        const [rows] = await conn.query( // SQL: như trên nhưng GROUP BY phuong_thuc -> mỗi phương thức 1 dòng
            `
      SELECT
        phuong_thuc AS phuongThuc,
        COUNT(*) AS soDon,
        SUM(so_tien) AS doanhThu
      FROM thanh_toan
      WHERE trang_thai = 'THANH_CONG'
        AND ngay_tao >= ?
        AND ngay_tao < ?
      GROUP BY phuong_thuc
      `,
            [tuLuc, denTruoc] // thay vào 2 dấu ?
        );

        return rows.map((r) => ({ // đi qua từng dòng (từng phương thức)
            phuongThuc: r.phuongThuc, // 'TIEN_MAT' hoặc 'QR'
            soDon: Number(r.soDon), // số đơn trả bằng phương thức này
            doanhThu: Number(r.doanhThu), // tiền thu bằng phương thức này
        }));
    }

    static async theoNgay(tuLuc, denTruoc, conn = pool) { // doanh thu từng ngày, sắp theo ngày tăng dần
        const [rows] = await conn.query( // SQL: GROUP BY theo ngày; DATE_FORMAT trả chuỗi 'YYYY-MM-DD' để không bị lệch múi giờ khi gửi cho trình duyệt
            `
      SELECT
        DATE_FORMAT(ngay_tao, '%Y-%m-%d') AS ngay,
        COUNT(*) AS soDon,
        SUM(so_tien) AS doanhThu
      FROM thanh_toan
      WHERE trang_thai = 'THANH_CONG'
        AND ngay_tao >= ?
        AND ngay_tao < ?
      GROUP BY DATE_FORMAT(ngay_tao, '%Y-%m-%d')
      ORDER BY ngay ASC
      `,
            [tuLuc, denTruoc] // thay vào 2 dấu ?
        );

        return rows.map((r) => ({ // đi qua từng dòng (từng ngày)
            ngay: r.ngay, // ví dụ '2026-10-10'
            soDon: Number(r.soDon), // số đơn trong ngày
            doanhThu: Number(r.doanhThu), // doanh thu trong ngày
        }));
    }

    static async topMon(tuLuc, denTruoc, soMon = 5, conn = pool) { // top món bán chạy; soMon = lấy bao nhiêu món đứng đầu (mặc định 5)
        const [rows] = await conn.query( // SQL: nối thanh_toan -> chi_tiet_don (món trong đơn) -> mon_an (tên món); bỏ món DA_HUY (khách không trả tiền); cộng số lượng từng món; xếp nhiều nhất lên đầu; LIMIT lấy N món
            `
      SELECT
        ma.id AS monId,
        ma.ten_mon AS tenMon,
        SUM(ctd.so_luong) AS soLuong,
        SUM(ctd.so_luong * ctd.don_gia) AS doanhThu
      FROM thanh_toan tt
      INNER JOIN chi_tiet_don ctd ON ctd.don_hang_id = tt.don_hang_id
      INNER JOIN mon_an ma ON ma.id = ctd.mon_an_id
      WHERE tt.trang_thai = 'THANH_CONG'
        AND ctd.trang_thai_che_bien <> 'DA_HUY'
        AND tt.ngay_tao >= ?
        AND tt.ngay_tao < ?
      GROUP BY ma.id, ma.ten_mon
      ORDER BY soLuong DESC, doanhThu DESC
      LIMIT ?
      `,
            [tuLuc, denTruoc, soMon] // 3 dấu ? lần lượt nhận: từ lúc, tới trước lúc, số món
        );

        return rows.map((r) => ({ // đi qua từng món
            monId: r.monId, // mã món
            tenMon: r.tenMon, // tên món, ví dụ 'Cà phê sữa'
            soLuong: Number(r.soLuong), // tổng số ly/cái đã bán
            doanhThu: Number(r.doanhThu), // tiền thu từ món này
        }));
    }
}

module.exports = BaoCaoRepository; // xuất ra cho BaoCaoService (Bước 2) dùng