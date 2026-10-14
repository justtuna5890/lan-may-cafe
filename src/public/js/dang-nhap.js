// UC21 Đăng nhập - giao diện
// Cần nạp ui.js, phien.js, api.js trước file này (xem cuối index.html)
(() => {
  // ===== Các phần tử trên trang =====
  const form = document.getElementById('form-dang-nhap');
  const oUser = document.getElementById('username'); // ô tên đăng nhập
  const oPass = document.getElementById('password'); // ô mật khẩu
  const hopLoi = document.getElementById('hop-loi'); // khung lỗi chung phía trên form
  const nutDangNhap = document.getElementById('nut-dang-nhap');
  const thamSo = new URLSearchParams(window.location.search); // phần ?... trên địa chỉ

  // ===== Hiện và xóa lỗi =====

  // Lỗi chung (sai thông tin, tài khoản bị khóa...) hiện ở khung phía trên
  function hienLoiChung(noiDung) {
    hopLoi.textContent = noiDung;
    hopLoi.classList.remove('an');
  }

  // Lỗi của từng ô hiện ngay dưới ô đó; noiDung rỗng nghĩa là xóa lỗi
  function datLoiO(o, noiDung) {
    document.getElementById(`loi-${o.id}`).textContent = noiDung;
    o.setAttribute('aria-invalid', noiDung ? 'true' : 'false'); // để trình đọc màn hình biết ô đang lỗi
  }

  function xoaLoi() {
    hopLoi.classList.add('an');
    [oUser, oPass].forEach((o) => datLoiO(o, ''));
  }

  // Báo lỗi ngay dưới ô bị bỏ trống (TC-21-05); trả về true nếu cả hai ô đều có chữ
  function kiemTraTrong() {
    const thieuTen = !oUser.value.trim(); // chỉ toàn dấu cách cũng tính là trống
    const thieuMk = !oPass.value;
    if (thieuMk) datLoiO(oPass, 'Vui lòng nhập mật khẩu');
    if (thieuTen) datLoiO(oUser, 'Vui lòng nhập tên đăng nhập');
    if (thieuMk) oPass.focus();
    if (thieuTen) oUser.focus(); // ô tên đứng trước nên được focus sau cùng
    return !thieuTen && !thieuMk;
  }

  // ===== Phiên cũ =====

  // Trả về true nếu trang đã chuyển đi chỗ khác (đã đăng nhập từ trước)
  function xuLyPhienCu() {
    // Server đẩy về đây kèm ?hetPhien nghĩa là cookie hết hạn hoặc không hợp lệ.
    // Phải bỏ phiên lưu ở trình duyệt, nếu không sẽ bị chuyển ngược về trang chủ của vai trò và lặp vô hạn
    const hetPhien = thamSo.has('hetPhien');
    if (hetPhien) Phien.xoa();

    const phienCu = Phien.lay();
    if (phienCu) {
      window.location.replace(phienCu.trangChu); // đã đăng nhập thì vào thẳng trang chủ của vai trò
      return true;
    }

    if (hetPhien) hienLoiChung('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
    // Giao diện phát hiện vai trò lưu ở trình duyệt lệch với cookie (xem Phien.yeuCau)
    if (thamSo.has('doiTaiKhoan')) {
      hienLoiChung('Tài khoản đăng nhập đã thay đổi (ví dụ ở tab khác), vui lòng đăng nhập lại.');
    }
    return false;
  }

  // ===== Nút phụ =====

  // Nút "Hiện/Ẩn": đổi ô mật khẩu giữa dấu chấm và chữ thật
  function ganNutHienMatKhau() {
    document.getElementById('nut-hien').addEventListener('click', (e) => {
      const dangAn = oPass.type === 'password';
      oPass.type = dangAn ? 'text' : 'password';
      e.currentTarget.textContent = dangAn ? 'Ẩn' : 'Hiện';
      e.currentTarget.setAttribute('aria-pressed', String(dangAn));
    });
  }

  function ganNutQuenMatKhau() {
    document.getElementById('nut-quen').addEventListener('click', () => {
      UI.alert('Vui lòng liên hệ chủ quán để được cấp lại mật khẩu.', 'Quên mật khẩu');
    });
  }

  // ===== Đăng nhập =====

  // Đổi nút sang trạng thái đang chờ, hoặc trả về như cũ
  function datNutCho(dangCho) {
    nutDangNhap.disabled = dangCho; // khóa nút để không bấm hai lần
    nutDangNhap.textContent = dangCho ? 'Đang đăng nhập…' : 'Đăng nhập';
  }

  // Xử lý lỗi server trả về; mất kết nối hoặc lỗi 5xx thì api.js đã hiện toast hoặc alert rồi
  function xuLyLoiDangNhap(err) {
    if (err.maLoi === 'MAT_KET_NOI' || err.status >= 500) return;
    if (err.maLoi === 'THIEU_THONG_TIN') {
      kiemTraTrong(); // hiện lỗi ngay dưới ô bị thiếu
      return;
    }
    // SAI_THONG_TIN, TAI_KHOAN_BI_KHOA (EF-1), TAI_KHOAN_VO_HIEU (EF-2): hiện đúng câu server trả về
    hienLoiChung(err.message);
    oPass.value = ''; // xóa mật khẩu đã gõ
    oPass.focus();
  }

  async function dangNhap(e) {
    e.preventDefault(); // không cho trình duyệt tự gửi form
    xoaLoi();
    if (!kiemTraTrong()) return;

    datNutCho(true);
    try {
      const data = await Api.post('/auth/login', { username: oUser.value.trim(), password: oPass.value });
      Phien.luu(data, document.getElementById('ghi-nho').checked); // tick "Ghi nhớ" thì lưu lâu dài
      window.location.replace(data.trangChu);
    } catch (err) {
      xuLyLoiDangNhap(err);
    } finally {
      datNutCho(false);
    }
  }

  // ===== Khởi động =====

  if (xuLyPhienCu()) return; // đã chuyển trang thì không cần gắn gì thêm

  // Gõ lại vào ô nào thì xóa lỗi của ô đó
  [oUser, oPass].forEach((o) => o.addEventListener('input', () => datLoiO(o, '')));
  ganNutHienMatKhau();
  ganNutQuenMatKhau();
  form.addEventListener('submit', dangNhap);
})();
