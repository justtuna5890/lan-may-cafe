// =====================================================
// MonAnRepository - Tầng truy xuất dữ liệu (Repository) cho bảng mon_an
// -----------------------------------------------------
// Nhiệm vụ: là nơi DUY NHẤT gửi câu lệnh SQL tới bảng mon_an trong MySQL.
// Tầng trên (Service, Controller) không viết SQL, chỉ gọi các hàm trong file này.
//
// Bảng mon_an có 4 cột (xem docs/db/schema.sql):
//   id          VARCHAR(36)   mã món, không được trùng (khóa chính), ví dụ 'mon-01'
//   ten_mon     VARCHAR(100)  tên món, ví dụ 'Cà phê sữa', 'Bánh Croissant'
//   gia         DECIMAL(12,2) giá bán (VNĐ), phải >= 0
//   trang_thai  ENUM          CON_HANG = đang bán | TAM_HET = tạm hết, không cho gọi
//
// "Món" ở đây là mọi thứ trên thực đơn của quán: đồ uống và bánh.
// =====================================================

// Thư viện có sẵn của Node.js, dùng để tạo mã ngẫu nhiên không trùng (UUID) cho món mới (UC22)
const crypto = require('crypto');
// pool = "hồ" kết nối tới MySQL dùng chung cho cả app (cấu hình trong src/config/db.js)
const { pool } = require('../config/db');

// static: gọi thẳng MonAnRepository.tenHam(...) mà không cần tạo đối tượng bằng new
// async/await: hàm phải CHỜ MySQL trả lời; await = đợi xong rồi mới chạy dòng tiếp theo
// conn = pool: mặc định dùng pool; khi chạy trong transaction thì truyền kết nối riêng vào
class MonAnRepository {
    // Kiểm tra giá món ăn trước khi ghi vào CSDL
    // - Đổi giá sang số vì dữ liệu gửi lên có thể là chuỗi, ví dụ "35000"
    // - Không phải số (NaN, Infinity) hoặc số âm thì báo lỗi, không cho ghi
    static kiemTraGia(gia) {
        const giaSo = Number(gia);

        if (!Number.isFinite(giaSo) || giaSo < 0) {
            throw new Error('Giá món ăn không hợp lệ');
        }
    }

    // Kiểm tra trạng thái món ăn
    // Chỉ chấp nhận đúng 2 giá trị giống ENUM trong CSDL:
    //   CON_HANG = đang bán
    //   TAM_HET  = tạm hết (UC18 hết nguyên liệu tự khóa, hoặc chủ quán tắt bán ở UC22)
    static kiemTraTrangThai(trangThai) {
        if (!['CON_HANG', 'TAM_HET'].includes(trangThai)) {
            throw new Error('Trạng thái món ăn không hợp lệ');
        }
    }

    // Tìm 1 món theo mã (id)
    // - Đầu vào: id, ví dụ 'mon-01'
    // - Trả về: { id, monId, tenMon, gia, trangThai } hoặc null nếu không có món đó
    // - Câu SQL đổi tên cột kiểu ten_mon (CSDL) sang tenMon (JavaScript) bằng AS
    // - Dấu ? được thay bằng giá trị trong mảng [id] -> chống tấn công SQL injection
    static async findById(id, conn = pool) {
        // conn.query trả về [các dòng, thông tin cột]; chỉ lấy phần các dòng (rows)
        const [rows] = await conn.query(
            `
      SELECT
        id,
        id AS monId,
        ten_mon AS tenMon,
        gia,
        trang_thai AS trangThai
      FROM mon_an
      WHERE id = ?
      LIMIT 1
      `,
            [id]
        );

        // Không tìm thấy -> trả null để tầng Service tự báo lỗi "không tìm thấy món"
        if (rows.length === 0) {
            return null;
        }

        const mon = rows[0];

        // Giữ nguyên các cột (...mon), chỉ đổi chắc chắn giá sang kiểu số để tính tiền
        return {
            ...mon,
            gia: Number(mon.gia),
        };
    }

    // Lấy toàn bộ thực đơn, sắp theo tên A -> Z
    // Dùng cho màn Gọi món (GET /api/menu) và trang Quản lý menu của chủ quán (UC22)
    static async findAll(conn = pool) {
        const [rows] = await conn.query(
            `
      SELECT
        id,
        id AS monId,
        ten_mon AS tenMon,
        gia,
        trang_thai AS trangThai
      FROM mon_an
      ORDER BY ten_mon ASC
      `
        );

        // map: đi qua từng món, đổi giá sang số giống findById
        return rows.map((mon) => ({
            ...mon,
            gia: Number(mon.gia),
        }));
    }

    // UC22 - Chủ quán thêm món mới vào thực đơn
    // - Đầu vào: mon = { tenMon, gia, trangThai? }, ví dụ { tenMon: 'Cà phê muối', gia: 35000 }
    // - Trả về: món vừa thêm, đọc lại từ CSDL (có id mới)
    // - Kiểm tra trùng tên món nằm ở tầng Service (MenuService), không nằm ở đây
    static async taoMoi(mon, conn = pool) {
        // Không có tên, tên không phải chữ, hoặc tên toàn dấu cách -> báo lỗi
        if (!mon || typeof mon.tenMon !== 'string' || !mon.tenMon.trim()) {
            throw new Error('Thiếu tên món ăn');
        }

        // Dùng lại hàm kiểm tra giá ở trên: giá phải là số >= 0
        this.kiemTraGia(mon.gia);

        // Cấp mã mới không trùng cho món, ví dụ '3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90'
        const id = crypto.randomUUID();
        // Không truyền trạng thái thì món mới mặc định là đang bán
        const trangThai = mon.trangThai || 'CON_HANG';
        this.kiemTraTrangThai(trangThai);

        // Thêm 1 dòng vào bảng mon_an; 4 dấu ? lần lượt nhận 4 giá trị trong mảng
        // trim() bỏ dấu cách thừa ở đầu và cuối tên món
        await conn.query(
            `
      INSERT INTO mon_an (id, ten_mon, gia, trang_thai)
      VALUES (?, ?, ?, ?)
      `,
            [id, mon.tenMon.trim(), Number(mon.gia), trangThai]
        );

        // Đọc lại món vừa thêm để trả về đúng định dạng giống findById
        return this.findById(id, conn);
    }

    // Cập nhật giá 1 món (UC22: chủ quán sửa giá)
    // - Trả về true nếu sửa được, false nếu không có món mang mã đó
    // - affectedRows = số dòng bị thay đổi trong CSDL
    static async capNhatGia(id, gia, conn = pool) {
        if (!id) {
            throw new Error('Thiếu mã món ăn');
        }

        this.kiemTraGia(gia);

        const [result] = await conn.query(
            `
      UPDATE mon_an
      SET gia = ?
      WHERE id = ?
      `,
            [Number(gia), id]
        );

        return result.affectedRows > 0;
    }

    // Cập nhật trạng thái 1 món: CON_HANG <-> TAM_HET
    // Dùng ở UC18 (hết nguyên liệu tự khóa món) và UC22 (chủ quán bật/tắt bán)
    // - Trả về true nếu sửa được, false nếu không có món mang mã đó
    static async capNhatTrangThai(id, trangThai, conn = pool) {
        if (!id) {
            throw new Error('Thiếu mã món ăn');
        }

        this.kiemTraTrangThai(trangThai);

        const [result] = await conn.query(
            `
      UPDATE mon_an
      SET trang_thai = ?
      WHERE id = ?
      `,
            [trangThai, id]
        );

        return result.affectedRows > 0;
    }
}

// Xuất class ra ngoài để file khác dùng được bằng require('../repositories/MonAnRepository')
module.exports = MonAnRepository;