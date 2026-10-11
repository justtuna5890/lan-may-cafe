const AuthService = require('../services/AuthService');
const { ok } = require('../utils/response');

// Tang controller: nhan request, goi service, tra response chuan. Khong chua nghiep vu.
class AuthController {
  // UC21 - POST /api/auth/login
  static async dangNhap(req, res, next) {
    try {
      const { username, password } = req.body || {};
      const data = await AuthService.dangNhap(username, password);
      return ok(res, data, 'Đăng nhập thành công');
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = AuthController;
