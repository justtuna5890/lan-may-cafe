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
    BARISTA: [['/kitchen.html', 'Màn bếp']],
    THU_NGAN: [['/pos.html', 'Thu ngân']],
    CHU_QUAN: [['/dashboard.html', 'Tổng quan'], ['/tables.html', 'Sơ đồ bàn'], ['/kitchen.html', 'Màn bếp'], ['/pos.html', 'Thu ngân']],
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
  function dangXuat() {
    xoa();
    window.location.replace('/');
  }

  // Goi o dau moi trang: chua dang nhap -> ve trang dang nhap; sai vai tro -> ve trang chu cua minh
  function yeuCau(...vaiTroDuocVao) {
    const p = lay();
    if (!p) {
      window.location.replace('/');
      return null;
    }
    if (vaiTroDuocVao.length && !vaiTroDuocVao.includes(p.vaiTro)) {
      window.location.replace(p.trangChu || '/');
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
    top.querySelector('#nut-dang-xuat').addEventListener('click', dangXuat);
  }

  return { luu, lay, xoa, token, dangXuat, yeuCau, TEN_VAI_TRO };
})();
