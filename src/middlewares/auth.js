const AppError = require('../utils/AppError'); // lỗi nghiệp vụ: AppError(maLoi, message, mãHTTP)
const AuthService = require('../services/AuthService'); // kiểm tra chữ ký và hạn của token

// Hai lỗi dùng nhiều lần, gom lại một chỗ để câu thông báo luôn thống nhất
const loiChuaDangNhap = () => new AppError('CHUA_DANG_NHAP', 'Vui lòng đăng nhập', 401);
const loiKhongCoQuyen = () => new AppError('KHONG_CO_QUYEN', 'Bạn không có quyền thực hiện thao tác này', 403);

// Lấy token từ header "Authorization: Bearer <token>"; sai dạng hoặc thiếu thì trả null
function layTokenTuHeader(req) {
  const [kieu, token] = (req.headers.authorization || '').split(' '); // tách "Bearer" và phần token
  return kieu === 'Bearer' && token ? token : null; // phải đúng kiểu Bearer và có token
}

// UC21: đọc header Authorization, gắn req.user = { nhanVienId, hoTen, vaiTro }
// Dùng: router.get('/kitchen/items', verifyToken, requireRole('BARISTA'), ...)
function verifyToken(req, res, next) {
  const token = layTokenTuHeader(req);
  if (!token) return next(loiChuaDangNhap()); // không gửi token

  try {
    req.user = AuthService.xacThucToken(token); // token đúng thì biết ai đang gọi
    return next();
  } catch (err) {
    return next(err); // token sai hoặc hết hạn: AuthService đã tạo sẵn lỗi 401
  }
}

// Phân quyền theo vai_tro. Đặt sau verifyToken.
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(loiChuaDangNhap()); // quên đặt verifyToken phía trước
    const duocPhep = roles.length === 0 || roles.includes(req.user.vaiTro); // không liệt kê vai trò nào nghĩa là ai đăng nhập cũng được
    return duocPhep ? next() : next(loiKhongCoQuyen());
  };
}

// EventSource (SSE) của trình duyệt không gửi được header Authorization, nên riêng /kds/stream
// cho phép ?token=<jwt>. Đặt trước verifyToken. Header Authorization nếu có vẫn được ưu tiên.
function tokenTuQuery(req, res, next) {
  const coHeader = Boolean(req.headers.authorization);
  const token = req.query.token;
  if (!coHeader && typeof token === 'string' && token) {
    req.headers.authorization = `Bearer ${token}`; // đổi sang dạng header để verifyToken đọc như bình thường
  }
  return next();
}

module.exports = { verifyToken, requireRole, tokenTuQuery };
