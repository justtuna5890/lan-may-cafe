// Phiên đăng nhập (UC21) phía giao diện: lưu token, chặn trang theo vai trò, thanh menu, đăng xuất
const Phien = (() => {
  const KHOA = 'lanmay.phien'; // tên mục lưu phiên trong sessionStorage / localStorage

  const TEN_VAI_TRO = {
    PHUC_VU: 'Phục vụ',
    BARISTA: 'Barista',
    THU_NGAN: 'Thu ngân',
    CHU_QUAN: 'Chủ quán',
  };

  // Menu theo vai trò: mỗi vai trò chỉ thấy chức năng của mình. Mỗi mục là [đường dẫn, chữ hiện]
  const MUC = {
    soDoBan: ['/tables.html', 'Sơ đồ bàn'],
    thuNgan: ['/pos.html', 'Thu ngân'],
    manBep: ['/kitchen.html', 'Màn bếp'],
    quanLyKho: ['/kho.html', 'Quản lý kho'],
    kho: ['/kho.html', 'Kho'],
    tongQuan: ['/dashboard.html', 'Tổng quan'],
    quanLyMenu: ['/quan-ly-menu.html', 'Quản lý menu'],
    baoCao: ['/bao-cao.html', 'Báo cáo doanh thu'],
  };

  // API chỉ cho đúng vai trò (api-contract, tests/phanquyen.test.js); chủ quán có toàn quyền nên thấy đủ 7 mục
  const MENU = {
    PHUC_VU: [MUC.soDoBan],
    BARISTA: [MUC.manBep, MUC.quanLyKho],
    THU_NGAN: [MUC.thuNgan],
    CHU_QUAN: [MUC.tongQuan, MUC.soDoBan, MUC.thuNgan, MUC.manBep, MUC.kho, MUC.quanLyMenu, MUC.baoCao],
  };

  // ===== Lưu phiên =====

  // ghiNho = true: lưu localStorage (giữ sau khi tắt trình duyệt), false: sessionStorage (mất khi đóng tab)
  function luu(duLieu, ghiNho) {
    xoa(); // chỉ giữ một bản, tránh sessionStorage và localStorage lệch nhau
    const noiLuu = ghiNho ? localStorage : sessionStorage;
    noiLuu.setItem(KHOA, JSON.stringify(duLieu));
  }

  // Đọc phiên; sessionStorage được ưu tiên. Dữ liệu hỏng hoặc trình duyệt chặn lưu trữ thì coi như chưa đăng nhập
  function lay() {
    try {
      const chuoi = sessionStorage.getItem(KHOA) || localStorage.getItem(KHOA);
      return chuoi ? JSON.parse(chuoi) : null;
    } catch (e) {
      return null;
    }
  }

  function xoa() {
    sessionStorage.removeItem(KHOA);
    localStorage.removeItem(KHOA);
  }

  function token() {
    const p = lay();
    return p ? p.token : null;
  }

  // ===== Đăng xuất và chặn trang =====

  // NhanVien.dangXuat(): token JWT không lưu ở server, nên chỉ cần xóa phía giao diện
  // Cookie giữ trang là HttpOnly nên phải nhờ server xóa; lỗi mạng thì vẫn đăng xuất ở phía giao diện
  // diaChi: trang sẽ về sau khi xóa phiên (mặc định là trang đăng nhập)
  async function dangXuat(diaChi = '/') {
    xoa();
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) { /* bỏ qua */ }
    window.location.replace(diaChi);
  }

  // Gọi ở đầu mỗi trang: chưa đăng nhập -> về trang đăng nhập; sai vai trò -> xóa phiên và đăng nhập lại
  function yeuCau(...vaiTroDuocVao) {
    const p = lay();
    if (!p) {
      window.location.replace('/');
      return null;
    }
    const saiVaiTro = vaiTroDuocVao.length > 0 && !vaiTroDuocVao.includes(p.vaiTro);
    if (saiVaiTro) {
      // Server (theo cookie) đã cho vào trang này mà vai trò lưu ở trình duyệt lại không được vào
      // = hai nơi lệch nhau (vd: đăng nhập tài khoản khác ở tab khác). Về "trang chủ của mình" sẽ bị
      // server đẩy ngược lại -> lặp vô hạn, nên xóa cả phiên lẫn cookie rồi bắt đăng nhập lại
      dangXuat('/?doiTaiKhoan=1');
      return null;
    }
    veThanhMenu(p);
    return p;
  }

  // ===== Thanh menu =====

  // Khung thanh menu; phần chữ (tên, vai trò, liên kết) được điền sau bằng textContent để không chèn HTML từ dữ liệu
  const KHUNG_MENU = `
      <img class="logo" src="/assets/logo.svg" alt="">
      <p class="ten-app">Làn Mây POS</p>
      <nav aria-label="Chức năng"></nav>
      <div class="nguoi-dung">
        <span><strong class="ho-ten"></strong> <span class="vai-tro"></span></span>
        <button type="button" class="btn btn-nho" id="nut-dang-xuat">Đăng xuất</button>
      </div>`;

  // Điền các liên kết theo vai trò; trang đang mở được đánh dấu aria-current="page"
  function veLienKet(nav, vaiTro) {
    for (const [duongDan, ten] of MENU[vaiTro] || []) {
      const a = document.createElement('a');
      a.href = duongDan;
      a.textContent = ten;
      if (window.location.pathname === duongDan) a.setAttribute('aria-current', 'page');
      nav.appendChild(a);
    }
  }

  function veThanhMenu(p) {
    const top = document.querySelector('header.top');
    if (!top) return; // trang không có thanh menu (ví dụ trang đăng nhập)
    top.innerHTML = KHUNG_MENU;
    veLienKet(top.querySelector('nav'), p.vaiTro);
    top.querySelector('.ho-ten').textContent = p.hoTen;
    top.querySelector('.vai-tro').textContent = TEN_VAI_TRO[p.vaiTro] || p.vaiTro;
    top.querySelector('#nut-dang-xuat').addEventListener('click', () => dangXuat()); // bọc lại để không truyền sự kiện click vào tham số diaChi
  }

  return { luu, lay, xoa, token, dangXuat, yeuCau, TEN_VAI_TRO };
})();
