// UC21 Dang nhap - giao dien
(() => {
  const form = document.getElementById('form-dang-nhap');
  const oUser = document.getElementById('username');
  const oPass = document.getElementById('password');
  const hopLoi = document.getElementById('hop-loi');
  const nutDangNhap = document.getElementById('nut-dang-nhap');

  // Da dang nhap roi thi vao thang trang chu cua vai tro
  const phienCu = Phien.lay();
  if (phienCu) {
    window.location.replace(phienCu.trangChu);
    return;
  }

  if (new URLSearchParams(window.location.search).has('hetPhien')) {
    hienLoiChung('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
  }

  function hienLoiChung(noiDung) {
    hopLoi.textContent = noiDung;
    hopLoi.classList.remove('an');
  }

  function datLoiO(o, noiDung) {
    document.getElementById(`loi-${o.id}`).textContent = noiDung;
    o.setAttribute('aria-invalid', noiDung ? 'true' : 'false');
  }

  function xoaLoi() {
    hopLoi.classList.add('an');
    datLoiO(oUser, '');
    datLoiO(oPass, '');
  }

  // Bao loi ngay duoi o bi bo trong (TC-21-05)
  function kiemTraTrong() {
    let hopLe = true;
    if (!oPass.value) { datLoiO(oPass, 'Vui lòng nhập mật khẩu'); oPass.focus(); hopLe = false; }
    if (!oUser.value.trim()) { datLoiO(oUser, 'Vui lòng nhập tên đăng nhập'); oUser.focus(); hopLe = false; }
    return hopLe;
  }

  oUser.addEventListener('input', () => datLoiO(oUser, ''));
  oPass.addEventListener('input', () => datLoiO(oPass, ''));

  document.getElementById('nut-hien').addEventListener('click', (e) => {
    const dangAn = oPass.type === 'password';
    oPass.type = dangAn ? 'text' : 'password';
    e.currentTarget.textContent = dangAn ? 'Ẩn' : 'Hiện';
    e.currentTarget.setAttribute('aria-pressed', String(dangAn));
  });

  document.getElementById('nut-quen').addEventListener('click', () => {
    UI.alert('Vui lòng liên hệ chủ quán để được cấp lại mật khẩu.', 'Quên mật khẩu');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    xoaLoi();
    if (!kiemTraTrong()) return;

    nutDangNhap.disabled = true;
    nutDangNhap.textContent = 'Đang đăng nhập…';
    try {
      const data = await Api.post('/auth/login', { username: oUser.value.trim(), password: oPass.value });
      Phien.luu(data, document.getElementById('ghi-nho').checked);
      window.location.replace(data.trangChu);
    } catch (err) {
      // Mat ket noi / loi he thong: api.js da hien toast / alert
      if (err.maLoi === 'MAT_KET_NOI' || err.status >= 500) return;
      if (err.maLoi === 'THIEU_THONG_TIN') {
        kiemTraTrong();
        return;
      }
      // SAI_THONG_TIN, TAI_KHOAN_BI_KHOA (EF-1), TAI_KHOAN_VO_HIEU (EF-2): hien message cua server
      hienLoiChung(err.message);
      oPass.value = '';
      oPass.focus();
    } finally {
      nutDangNhap.disabled = false;
      nutDangNhap.textContent = 'Đăng nhập';
    }
  });
})();
