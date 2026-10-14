// Bọc mọi lời gọi backend (H1). Cần nạp ui.js và phien.js trước file này.
// Xử lý lỗi theo 3 nhánh như SD_ThanhToan:
//  1. Lỗi nghiệp vụ (4xx, có maLoi): ném ApiError để màn hình tự hiện ngay dưới ô / trên form
//  2. NetworkError (không gọi được server): toast "Mất kết nối"
//  3. ServerError (5xx): hộp alert "Hệ thống đang gặp sự cố"
const Api = (() => {
  class ApiError extends Error {
    constructor(maLoi, message, status) {
      super(message);
      this.maLoi = maLoi; // mã lỗi để màn hình tự xử lý (ví dụ TEN_MON_TRONG)
      this.status = status; // mã HTTP, bằng 0 khi mất kết nối
    }
  }

  // Header mặc định; có token thì gắn thêm để server biết ai đang gọi
  function taoHeader() {
    const header = { 'Content-Type': 'application/json' };
    const token = Phien.token();
    if (token) header.Authorization = `Bearer ${token}`;
    return header;
  }

  // Gọi mạng. Không kết nối được thì báo toast rồi ném ApiError mã MAT_KET_NOI
  async function guiYeuCau(method, duongDan, body) {
    try {
      return await fetch(`/api${duongDan}`, {
        method,
        headers: taoHeader(),
        body: body === undefined ? undefined : JSON.stringify(body), // GET và DELETE không có body
      });
    } catch (e) {
      UI.toast('Mất kết nối. Kiểm tra mạng rồi thử lại.', 'loi', 5000);
      throw new ApiError('MAT_KET_NOI', 'Mất kết nối tới máy chủ', 0);
    }
  }

  // Đọc nội dung JSON; server trả thứ không phải JSON thì coi như lỗi hệ thống
  async function docPhanHoi(res) {
    try {
      return await res.json();
    } catch (e) {
      return { success: false, maLoi: 'LOI_HE_THONG', message: 'Phản hồi không hợp lệ' };
    }
  }

  // Phản hồi báo lỗi: luôn ném ApiError; 5xx thì hiện thêm hộp alert; hết phiên thì về trang đăng nhập
  function xuLyLoi(res, ketQua, duongDan) {
    if (res.status >= 500) {
      UI.alert('Hệ thống đang gặp sự cố, vui lòng thử lại sau.');
      throw new ApiError(ketQua.maLoi || 'LOI_HE_THONG', ketQua.message, res.status);
    }

    // Token hết hạn hoặc chưa đăng nhập: xóa phiên, về trang đăng nhập (trừ chính API đăng nhập)
    if (ketQua.maLoi === 'CHUA_DANG_NHAP' && duongDan !== '/auth/login') {
      Phien.xoa();
      window.location.replace('/?hetPhien=1');
    }
    throw new ApiError(ketQua.maLoi, ketQua.message, res.status);
  }

  // Hàm chung cho GET, POST, PATCH, DELETE
  // tuyChon.im = true: không hiện thanh loading (dùng khi tự làm mới theo chu kỳ)
  async function goi(method, duongDan, body, tuyChon = {}) {
    const hienLoading = !tuyChon.im;
    if (hienLoading) UI.batLoading();

    let res;
    let ketQua;
    try {
      res = await guiYeuCau(method, duongDan, body);
      ketQua = await docPhanHoi(res);
    } finally {
      if (hienLoading) UI.tatLoading(); // dù thành công hay lỗi vẫn phải tắt loading
    }

    if (res.ok && ketQua.success) return ketQua.data; // thành công: chỉ trả phần data
    return xuLyLoi(res, ketQua, duongDan); // còn lại luôn ném lỗi
  }

  return {
    ApiError,
    get: (duongDan, tuyChon) => goi('GET', duongDan, undefined, tuyChon),
    post: (duongDan, body, tuyChon) => goi('POST', duongDan, body, tuyChon),
    patch: (duongDan, body, tuyChon) => goi('PATCH', duongDan, body, tuyChon),
    del: (duongDan, tuyChon) => goi('DELETE', duongDan, undefined, tuyChon),
  };
})();
