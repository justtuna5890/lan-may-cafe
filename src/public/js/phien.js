// Phien dang nhap (UC21) phia giao dien: luu token, chan trang theo vai tro, thanh menu, dang xuat
const Phien = (() => {
  const KHOA = 'lanmay.phien';

  const TEN_VAI_TRO = {
    PHUC_VU: 'Phục vụ',
    BARISTA: 'Barista',
    THU_NGAN: 'Thu ngân',
    CHU_QUAN: 'Chủ quán',
  };

  // Menu theo vai tro: moi vai tro chi thay chuc nang cua minh
  const MENU = {
    PHUC_VU: [['/tables.html', 'Sơ đồ bàn']],
    BARISTA: [['/kitchen.html', 'Màn bếp'], ['/kho.html', 'Quản lý kho']],
    THU_NGAN: [['/pos.html', 'Thu ngân']],
    // API chi cho dung vai tro (api-contract, tests/phanquyen.test.js): chu quan khong vao man cua vai tro khac
    CHU_QUAN: [['/dashboard.html', 'Tổng quan'], ['/tables.html', 'Sơ đồ bàn'], ['/pos.html', 'Thu ngân'], ['/kitchen.html', 'Màn bếp'], ['/kho.html', 'Kho'], ['/quan-ly-menu.html', 'Quản lý menu'], ['/bao-cao.html', 'Báo cáo doanh thu']], // Chủ quán có toàn quyền
  };

  // ghiNho = true: luu localStorage (giu sau khi tat trinh duyet), false: sessionStorage
  function luu(duLieu, ghiNho) {
    xoa();
    (ghiNho ? localStorage : sessionStorage).setItem(KHOA, JSON.stringify(duLieu));
  }

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

  // NhanVien.dangXuat(): token JWT khong luu o server, nen chi can xoa phia giao dien
  // Cookie giu trang la HttpOnly nen phai nho server xoa; loi mang thi van dang xuat o phia giao dien
  // diaChi: trang se ve sau khi xoa phien (mac dinh la trang dang nhap)
  async function dangXuat(diaChi = '/') {
    xoa();
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) { /* bo qua */ }
    window.location.replace(diaChi);
  }

  // Goi o dau moi trang: chua dang nhap -> ve trang dang nhap; sai vai tro -> ve trang chu cua minh
  function yeuCau(...vaiTroDuocVao) {
    const p = lay();
    if (!p) {
      window.location.replace('/');
      return null;
    }
    if (vaiTroDuocVao.length && !vaiTroDuocVao.includes(p.vaiTro)) {
      // Server (theo cookie) da cho vao trang nay ma vai tro luu o trinh duyet lai khong duoc vao
      // = hai noi lech nhau (vd: dang nhap tai khoan khac o tab khac). Ve "trang chu cua minh" se bi
      // server day nguoc lai -> lap vo han, nen xoa ca phien lan cookie roi bat dang nhap lai
      dangXuat('/?doiTaiKhoan=1');
      return null;
    }
    veThanhMenu(p);
    return p;
  }

  function veThanhMenu(p) {
    const top = document.querySelector('header.top');
    if (!top) return;
    top.innerHTML = `
      <img class="logo" src="/assets/logo.svg" alt="">
      <p class="ten-app">Làn Mây POS</p>
      <nav aria-label="Chức năng"></nav>
      <div class="nguoi-dung">
        <span><strong class="ho-ten"></strong> <span class="vai-tro"></span></span>
        <button type="button" class="btn btn-nho" id="nut-dang-xuat">Đăng xuất</button>
      </div>`;
    const nav = top.querySelector('nav');
    (MENU[p.vaiTro] || []).forEach(([duongDan, ten]) => {
      const a = document.createElement('a');
      a.href = duongDan;
      a.textContent = ten;
      if (window.location.pathname === duongDan) a.setAttribute('aria-current', 'page');
      nav.appendChild(a);
    });
    top.querySelector('.ho-ten').textContent = p.hoTen;
    top.querySelector('.vai-tro').textContent = TEN_VAI_TRO[p.vaiTro] || p.vaiTro;
    top.querySelector('#nut-dang-xuat').addEventListener('click', () => dangXuat()); // boc lai de khong truyen su kien click vao tham so diaChi
  }

  return { luu, lay, xoa, token, dangXuat, yeuCau, TEN_VAI_TRO };
})();
