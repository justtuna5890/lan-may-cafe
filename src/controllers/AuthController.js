const AuthService = require('../services/AuthService'); // nghiệp vụ đăng nhập
const jwt = require('jsonwebtoken'); // chỉ dùng để đọc hạn của token vừa tạo
const { ok } = require('../utils/response'); // hàm dùng chung trả response thành công
const config = require('../config');
const { TEN_COOKIE } = require('../middlewares/trangTinh'); // tên cookie giữ trang

// Cài đặt cookie dùng chung cho lúc đặt và lúc xóa (xóa cookie phải khớp đúng các cài đặt này)
const tuyChonCookie = () => ({
  httpOnly: true, // JavaScript trong trang không đọc được -> XSS không lấy được cookie này
  sameSite: 'strict', // không gửi cookie khi bấm link từ trang web khác
  secure: config.env === 'production', // bản chạy thật chỉ gửi qua https
  path: '/',
});

// Đặt cookie sống cùng thời gian với token; chỉ dùng để server chặn trang .html (API vẫn dùng header Bearer)
function datCookieDangNhap(res, token) {
  const { exp } = jwt.decode(token); // exp: giây tính từ 1970, lúc token hết hạn
  const conSong = exp * 1000 - Date.now(); // đổi sang mili giây còn lại
  res.cookie(TEN_COOKIE, token, { ...tuyChonCookie(), maxAge: conSong });
}

// Tầng controller: nhận request, gọi service, trả response chuẩn. Không chứa nghiệp vụ.
class AuthController {
  // UC21 - POST /api/auth/login
  static async dangNhap(req, res, next) {
    try {
      const { username, password } = req.body || {}; // body rỗng thì coi như thiếu thông tin
      const data = await AuthService.dangNhap(username, password);
      datCookieDangNhap(res, data.token);
      return ok(res, data, 'Đăng nhập thành công');
    } catch (err) {
      return next(err);
    }
  }

  // POST /api/auth/logout - xóa cookie giữ trang (token JWT không lưu ở server)
  static dangXuat(req, res) {
    res.clearCookie(TEN_COOKIE, tuyChonCookie());
    return ok(res, null, 'Đã đăng xuất');
  }
}

module.exports = AuthController;
