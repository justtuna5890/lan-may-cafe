const { pool } = require('../config/db'); // kết nối MySQL dùng chung
const NhanVien = require('../models/NhanVien'); // lớp nhân viên, dùng để đổi dòng bảng thành đối tượng

const BANG = 'nhan_vien'; // tên bảng, đặt một chỗ để khỏi gõ lặp trong từng câu SQL

// Tầng dữ liệu cho bảng nhan_vien (ERD). Chỉ đọc/ghi, không chứa nghiệp vụ.
class NhanVienRepository {
  // Sửa một số cột của một nhân viên theo id. cacCot ví dụ: { so_lan_sai: 3, trang_thai: 'HOAT_DONG' }
  // Chỉ tên cột (do code này quyết định) được ghép vào câu SQL, giá trị luôn đi qua dấu ? nên không bị SQL injection
  static async capNhatCot(id, cacCot) {
    const tenCot = Object.keys(cacCot); // danh sách tên cột cần sửa
    const veSet = tenCot.map((cot) => `${cot} = ?`).join(', '); // "so_lan_sai = ?, trang_thai = ?"
    await pool.query(`UPDATE ${BANG} SET ${veSet} WHERE id = ?`, [...Object.values(cacCot), id]); // giá trị theo đúng thứ tự cột, id đứng cuối
  }

  // Trả về NhanVien hoặc null
  static async findByUsername(username) {
    const [rows] = await pool.query(`SELECT * FROM ${BANG} WHERE username = ? LIMIT 1`, [username]); // lấy tối đa 1 dòng
    return NhanVien.tuBanGhi(rows[0]); // không có dòng nào thì tuBanGhi trả null
  }

  // UC21 EF-1: lưu số lần sai liên tiếp, đặt trang_thai = BI_KHOA khi đủ 5 lần
  static async capNhatDangNhapSai(id, soLanSai, trangThai) {
    await NhanVienRepository.capNhatCot(id, { so_lan_sai: soLanSai, trang_thai: trangThai });
  }

  // Đăng nhập đúng thì đếm lại từ 0
  static async datLaiSoLanSai(id) {
    await NhanVienRepository.capNhatCot(id, { so_lan_sai: 0 });
  }
}

module.exports = NhanVienRepository;
