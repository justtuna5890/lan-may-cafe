const AuthService = require('../services/AuthService');
const jwt = require('jsonwebtoken');
const { ok } = require('../utils/response');
const config = require('../config');
const { TEN_COOKIE } = require('../middlewares/trangTinh');

const tuyChonCookie = () => ({
  httpOnly: true, // JavaScript trong trang khong doc duoc -> XSS khong lay duoc cookie nay
  sameSite: 'strict',
  secure: config.env === 'production',
  path: '/',
});

// Tang controller: nhan request, goi service, tra response chuan. Khong chua nghiep vu.
class AuthController {
  // UC21 - POST /api/auth/login
  static async dangNhap(req, res, next) {
    try {
      const { username, password } = req.body || {};
      const data = await AuthService.dangNhap(username, password);
      // Cookie song cung thoi gian voi token; chi dung de server chan trang .html (API van dung header Bearer)
      const { exp } = jwt.decode(data.token);
      res.cookie(TEN_COOKIE, data.token, { ...tuyChonCookie(), maxAge: exp * 1000 - Date.now() });
      return ok(res, data, 'Đăng nhập thành công');
    } catch (err) {
      return next(err);
    }
  }

  // POST /api/auth/logout - xoa cookie giu trang (token JWT khong luu o server)
  static dangXuat(req, res) {
    res.clearCookie(TEN_COOKIE, tuyChonCookie());
    return ok(res, null, 'Đã đăng xuất');
  }
}

module.exports = AuthController;
