const AuthService = require('../services/AuthService');

const TEN_COOKIE = 'lm_token';

// Moi trang giao dien chi cho dung vai tro (khop MENU trong public/js/phien.js).
// Trang .html khac khong co trong bang nay thi chi can da dang nhap.
const TRANG_THEO_VAI_TRO = Object.freeze({
  '/tables.html': ['PHUC_VU'],
  '/pos.html': ['THU_NGAN'],
  '/kitchen.html': ['BARISTA'],
  '/kho.html': ['BARISTA'],
  '/dashboard.html': ['CHU_QUAN'],
  '/quan-ly-menu.html': ['CHU_QUAN'],
});

const TRANG_CONG_KHAI = new Set(['/', '/index.html']);

function docCookie(req, ten) {
  const chuoi = req.headers.cookie || '';
  for (const phan of chuoi.split(';')) {
    const [k, ...v] = phan.trim().split('=');
    if (k === ten) return decodeURIComponent(v.join('='));
  }
  return null;
}

// Chan truy cap trang .html khi chua dang nhap hoac sai vai tro. Dat truoc express.static.
// Token nam trong cookie HttpOnly do /api/auth/login dat, nen trinh duyet tu gui kem khi chuyen trang.
function baoVeTrang(req, res, next) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();

  let duongDan;
  try {
    // Chuan hoa de khong lach bang %2e, chu hoa/thuong (o he dieu hanh khong phan biet hoa thuong)
    duongDan = decodeURIComponent(req.path).toLowerCase();
  } catch (e) {
    return res.redirect(302, '/?hetPhien=1');
  }
  if (!duongDan.endsWith('.html') || TRANG_CONG_KHAI.has(duongDan)) return next();

  const token = docCookie(req, TEN_COOKIE);
  let nguoiDung;
  try {
    if (!token) throw new Error('khong co token');
    nguoiDung = AuthService.xacThucToken(token);
  } catch (e) {
    return res.redirect(302, '/?hetPhien=1');
  }

  const duocVao = TRANG_THEO_VAI_TRO[duongDan];
  if (duocVao && !duocVao.includes(nguoiDung.vaiTro)) {
    return res.redirect(302, AuthService.TRANG_CHU[nguoiDung.vaiTro] || '/');
  }
  return next();
}

module.exports = { baoVeTrang, TEN_COOKIE, docCookie };
