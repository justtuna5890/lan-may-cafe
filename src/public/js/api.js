// Boc moi loi goi backend (H1). Can nap ui.js va phien.js truoc file nay.
// Xu ly loi theo 3 nhanh nhu SD_ThanhToan:
//  1. Loi nghiep vu (4xx, co maLoi): nem ApiError de man hinh tu hien ngay duoi o / tren form
//  2. NetworkError (khong goi duoc server): toast "Mat ket noi"
//  3. ServerError (5xx): hop alert "He thong dang gap su co"
const Api = (() => {
  class ApiError extends Error {
    constructor(maLoi, message, status) {
      super(message);
      this.maLoi = maLoi;
      this.status = status;
    }
  }

  // tuyChon.im = true: khong hien thanh loading (dung khi tu lam moi theo chu ky)
  async function goi(method, duongDan, body, tuyChon = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const token = Phien.token();
    if (token) headers.Authorization = `Bearer ${token}`;

    if (!tuyChon.im) UI.batLoading();
    let res;
    let ketQua;
    try {
      try {
        res = await fetch(`/api${duongDan}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
      } catch (e) {
        UI.toast('Mất kết nối. Kiểm tra mạng rồi thử lại.', 'loi', 5000);
        throw new ApiError('MAT_KET_NOI', 'Mất kết nối tới máy chủ', 0);
      }
      try {
        ketQua = await res.json();
      } catch (e) {
        ketQua = { success: false, maLoi: 'LOI_HE_THONG', message: 'Phản hồi không hợp lệ' };
      }
    } finally {
      if (!tuyChon.im) UI.tatLoading();
    }

    if (res.ok && ketQua.success) return ketQua.data;

    if (res.status >= 500) {
      UI.alert('Hệ thống đang gặp sự cố, vui lòng thử lại sau.');
      throw new ApiError(ketQua.maLoi || 'LOI_HE_THONG', ketQua.message, res.status);
    }

    // Token het han / chua dang nhap: ve trang dang nhap (tru chinh API dang nhap)
    if (ketQua.maLoi === 'CHUA_DANG_NHAP' && duongDan !== '/auth/login') {
      Phien.xoa();
      window.location.replace('/?hetPhien=1');
    }
    throw new ApiError(ketQua.maLoi, ketQua.message, res.status);
  }

  return {
    ApiError,
    get: (duongDan, tuyChon) => goi('GET', duongDan, undefined, tuyChon),
    post: (duongDan, body, tuyChon) => goi('POST', duongDan, body, tuyChon),
    patch: (duongDan, body, tuyChon) => goi('PATCH', duongDan, body, tuyChon),
    del: (duongDan, tuyChon) => goi('DELETE', duongDan, undefined, tuyChon),
  };
})();
