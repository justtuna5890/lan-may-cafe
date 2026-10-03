// Format chung cho moi API: { success, data, maLoi, message } (khop DTO KetQuaThanhToan)
function ok(res, data = null, message = 'OK', status = 200) {
  return res.status(status).json({ success: true, data, maLoi: null, message });
}

function fail(res, maLoi, message, status = 400, data = null) {
  return res.status(status).json({ success: false, data, maLoi, message });
}

module.exports = { ok, fail };
