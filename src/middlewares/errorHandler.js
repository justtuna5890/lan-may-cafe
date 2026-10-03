const AppError = require('../utils/AppError');
const { fail } = require('../utils/response');

function notFound(req, res) {
  return fail(res, 'NOT_FOUND', `Khong tim thay ${req.method} ${req.originalUrl}`, 404);
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return fail(res, err.maLoi, err.message, err.status);
  }
  if (err.type === 'entity.parse.failed') {
    return fail(res, 'JSON_KHONG_HOP_LE', 'Du lieu gui len khong phai JSON hop le', 400);
  }
  console.error(err);
  return fail(res, 'LOI_HE_THONG', 'Loi he thong, vui long thu lai', 500);
}

module.exports = { notFound, errorHandler };
