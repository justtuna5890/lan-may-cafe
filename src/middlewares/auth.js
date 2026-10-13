const AppError = require('../utils/AppError');
const AuthService = require('../services/AuthService');

// UC21: doc header "Authorization: Bearer <token>", gan req.user = { nhanVienId, hoTen, vaiTro }
// Dung: router.get('/kitchen/items', verifyToken, requireRole('BARISTA'), ...)
function verifyToken(req, res, next) {
  const header = req.headers.authorization || '';
  const [kieu, token] = header.split(' ');
  if (kieu !== 'Bearer' || !token) {
    return next(new AppError('CHUA_DANG_NHAP', 'Vui lòng đăng nhập', 401));
  }
  try {
    req.user = AuthService.xacThucToken(token);
    return next();
  } catch (err) {
    return next(err);
  }
}

// Phan quyen theo vai_tro. Dat sau verifyToken.
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new AppError('CHUA_DANG_NHAP', 'Vui lòng đăng nhập', 401));
    if (roles.length && !roles.includes(req.user.vaiTro)) {
      return next(new AppError('KHONG_CO_QUYEN', 'Bạn không có quyền thực hiện thao tác này', 403));
    }
    return next();
  };
}

// EventSource (SSE) cua trinh duyet khong gui duoc header Authorization, nen rieng /kds/stream
// cho phep ?token=<jwt>. Dat truoc verifyToken. Header Authorization neu co van duoc uu tien.
function tokenTuQuery(req, res, next) {
  if (!req.headers.authorization && typeof req.query.token === 'string' && req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  return next();
}

module.exports = { verifyToken, requireRole, tokenTuQuery };
