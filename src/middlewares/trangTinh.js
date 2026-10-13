const AuthService = require('../services/AuthService'); // kiểm tra token và biết trang chủ của từng vai trò

const TEN_COOKIE = 'lm_token'; // cookie giữ phiên cho trang .html (do /api/auth/login đặt)

// Chủ quán có toàn quyền nên luôn được thêm vào danh sách vai trò của mọi trang
const cungChuQuan = (...vaiTro) => [...vaiTro, 'CHU_QUAN'];

// Mỗi trang giao diện chỉ cho đúng vai trò (khớp MENU trong public/js/phien.js).
// Trang .html khác không có trong bảng này thì chỉ cần đã đăng nhập.
const TRANG_THEO_VAI_TRO = Object.freeze({
  '/tables.html': cungChuQuan('PHUC_VU'),
  '/pos.html': cungChuQuan('THU_NGAN'),
  '/kitchen.html': cungChuQuan('BARISTA'),
  '/kho.html': cungChuQuan('BARISTA'),
  '/dashboard.html': cungChuQuan(), // chỉ chủ quán
  '/quan-ly-menu.html': cungChuQuan(),
  '/bao-cao.html': cungChuQuan(),
});

const TRANG_CONG_KHAI = new Set(['/', '/index.html']); // không cần đăng nhập

const VE_TRANG_DANG_NHAP = '/?hetPhien=1'; // trang đăng nhập kèm báo hết phiên

// Đọc giá trị một cookie từ header Cookie ("a=1; b=2"); không có thì trả null
function docCookie(req, ten) {
  const cacCap = (req.headers.cookie || '').split(';'); // tách từng cặp "tên=giá trị"
  for (const cap of cacCap) {
    const [k, ...phanGiaTri] = cap.trim().split('='); // giá trị có thể chứa dấu "=" nên nối lại
    if (k === ten) return decodeURIComponent(phanGiaTri.join('='));
  }
  return null;
}

// Chuẩn hóa đường dẫn để không lách được bằng %2e hay chữ hoa/thường (một số hệ điều hành không phân biệt hoa thường)
// Địa chỉ giải mã lỗi thì trả null
function chuanHoaDuongDan(req) {
  try {
    return decodeURIComponent(req.path).toLowerCase();
  } catch (e) {
    return null;
  }
}

// Lấy người dùng từ cookie; thiếu hoặc sai thì trả null
function nguoiDungTuCookie(req) {
  const token = docCookie(req, TEN_COOKIE);
  if (!token) return null;
  try {
    return AuthService.xacThucToken(token);
  } catch (e) {
    return null;
  }
}

// Chặn truy cập trang .html khi chưa đăng nhập hoặc sai vai trò. Đặt trước express.static.
// Token nằm trong cookie HttpOnly do /api/auth/login đặt, nên trình duyệt tự gửi kèm khi chuyển trang.
function baoVeTrang(req, res, next) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next(); // chỉ chặn việc xem trang

  const duongDan = chuanHoaDuongDan(req);
  if (duongDan === null) return res.redirect(302, VE_TRANG_DANG_NHAP);
  if (!duongDan.endsWith('.html') || TRANG_CONG_KHAI.has(duongDan)) return next(); // không phải trang cần bảo vệ

  const nguoiDung = nguoiDungTuCookie(req);
  if (!nguoiDung) return res.redirect(302, VE_TRANG_DANG_NHAP);

  const duocVao = TRANG_THEO_VAI_TRO[duongDan];
  if (duocVao && !duocVao.includes(nguoiDung.vaiTro)) {
    return res.redirect(302, AuthService.TRANG_CHU[nguoiDung.vaiTro] || '/'); // sai vai trò: về trang chủ của vai trò đó
  }
  return next();
}

module.exports = { baoVeTrang, TEN_COOKIE, docCookie };
