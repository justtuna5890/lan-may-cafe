const AppError = require('../utils/AppError');

// Khung phan quyen theo vai_tro (UC21 - Hau hoan thien phan dang nhap/token).
// Dung: router.post('/', requireRole('PHUC_VU'), ...)
function requireRole(...roles) {
  return (req, res, next) => {
    // TODO(UC21): gan req.user tu session/token sau khi dang nhap
    if (!req.user) return next(new AppError('CHUA_DANG_NHAP', 'Vui long dang nhap', 401));
    if (roles.length && !roles.includes(req.user.vaiTro)) {
      return next(new AppError('KHONG_CO_QUYEN', 'Ban khong co quyen thuc hien thao tac nay', 403));
    }
    return next();
  };
}

module.exports = { requireRole };
