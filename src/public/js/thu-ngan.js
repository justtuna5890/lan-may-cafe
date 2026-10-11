// Man Thu ngan POS (H4): lap hoa don (UC08), thanh toan (UC10) theo SD_ThanhToan
// Can nap ui.js, phien.js, api.js truoc file nay.
(() => {
  const phien = Phien.yeuCau('THU_NGAN');
  if (!phien) return;

  // Server tra message khong dau: giao dien hien cau co dau theo maLoi (api-contract muc UC08, UC10)
  const THONG_BAO = {
    BAN_KHONG_CO_DON: 'Bàn này chưa có đơn cần thanh toán.',
    BAN_KHONG_TON_TAI: 'Không tìm thấy bàn.',
    DON_KHONG_TON_TAI: 'Không tìm thấy đơn hàng.',
    DON_CHUA_GUI_BEP: 'Đơn còn món chưa gửi bếp, chưa thể thanh toán. Báo phục vụ kiểm tra lại.',
    DON_DA_THANH_TOAN: 'Đơn này đã được thanh toán.',
    TIEN_KHONG_DU: 'Số tiền khách đưa chưa đủ',
    PHUONG_THUC_KHONG_HOP_LE: 'Phương thức thanh toán không hợp lệ.',
    DU_LIEU_KHONG_HOP_LE: 'Thiếu thông tin thanh toán.',
    KHONG_CO_QUYEN: 'Tài khoản không có quyền dùng chức năng này.',
  };
  const thongBaoLoi = (err) => THONG_BAO[err.maLoi] || err.message || 'Có lỗi xảy ra.';

  // Mat ket noi / loi 5xx: api.js da hien toast / alert
  const daBaoLoi = (err) => err.maLoi === 'MAT_KET_NOI' || err.status >= 500;
  const enc = encodeURIComponent;

  const $ = (id) => document.getElementById(id);
  const dsBanEl = $('ds-ban');
  const khuHoaDon = $('khu-hoa-don');
  const popup = $('popup-tt');
  const form = $('form-tt');
  const oTien = $('tien-khach-dua');
  const ttLoi = $('tt-loi');
  const nutXacNhan = $('tt-nut-xac-nhan');
  const nutHuy = $('tt-nut-huy');

  const trangThai = {
    dsBan: [], // chi ban DANG_PHUC_VU
    ban: null, // ban dang xem hoa don
    hoaDon: null, // HoaDonDTO
    maGiaoDich: null, // tao 1 lan cho moi luot thanh toan
    dangXuLy: false,
  };

  // ================= Danh sach ban dang phuc vu =================

  function veDsBan() {
    if (!trangThai.dsBan.length) {
      UI.trangThaiRong(dsBanEl, 'Chưa có bàn nào cần thanh toán.');
      return;
    }
    const ul = document.createElement('ul');
    ul.className = 'luoi-ban';
    trangThai.dsBan.forEach((ban) => {
      const nut = document.createElement('button');
      nut.type = 'button';
      nut.className = 'o-ban';
      nut.dataset.tt = ban.trangThai;
      nut.dataset.banId = ban.banId;
      nut.innerHTML = '<span class="ten-ban"></span><span class="tt-ban">Đang phục vụ</span>';
      nut.querySelector('.ten-ban').textContent = ban.tenBan;
      nut.setAttribute('aria-label', `Xem hóa đơn bàn ${ban.tenBan}`);
      nut.setAttribute('aria-pressed', String(Boolean(trangThai.ban && trangThai.ban.banId === ban.banId)));
      const li = document.createElement('li');
      li.appendChild(nut);
      ul.appendChild(li);
    });
    dsBanEl.replaceChildren(ul);
  }

  async function taiDsBan(im = false) {
    try {
      const ds = (await Api.get('/tables', { im })).filter((b) => b.trangThai === 'DANG_PHUC_VU');
      if (JSON.stringify(ds) === JSON.stringify(trangThai.dsBan) && dsBanEl.firstChild) return;
      trangThai.dsBan = ds;
      veDsBan();
    } catch (err) {
      if (!daBaoLoi(err)) UI.toast(thongBaoLoi(err), 'loi');
      if (!trangThai.dsBan.length) UI.trangThaiRong(dsBanEl, 'Không tải được danh sách bàn.');
    }
  }

  dsBanEl.addEventListener('click', (e) => {
    const nut = e.target.closest('.o-ban');
    if (!nut) return;
    const ban = trangThai.dsBan.find((b) => b.banId === nut.dataset.banId);
    if (ban) chonBan(ban);
  });

  $('nut-tai-lai').addEventListener('click', () => {
    taiDsBan();
    if (trangThai.ban) chonBan(trangThai.ban);
  });

  // ================= UC08: lap hoa don =================

  function hienChuThich(noiDung, laLoi = false) {
    const p = document.createElement('p');
    p.className = laLoi ? 'hop-loi' : 'rong-nho';
    p.textContent = noiDung;
    khuHoaDon.replaceChildren(p);
  }

  async function chonBan(ban) {
    if (trangThai.dangXuLy) return;
    trangThai.ban = ban;
    trangThai.hoaDon = null;
    trangThai.maGiaoDich = null; // doi ban = luot thanh toan moi
    veDsBan();
    $('tieu-de-hoa-don').textContent = `Hóa đơn bàn ${ban.tenBan}`;
    hienChuThich('Đang lập hóa đơn…');
    try {
      const { donHangId } = await Api.get(`/tables/${enc(ban.banId)}/current-order`);
      const hoaDon = await Api.get(`/orders/${enc(donHangId)}/invoice`);
      if (trangThai.ban !== ban) return; // da chon ban khac trong luc cho
      trangThai.hoaDon = hoaDon;
      veHoaDon();
    } catch (err) {
      if (trangThai.ban !== ban) return;
      if (daBaoLoi(err)) hienChuThich('Không tải được hóa đơn. Bấm lại vào bàn để thử lại.');
      else hienChuThich(thongBaoLoi(err), true);
    }
  }

  function veHoaDon() {
    const hd = trangThai.hoaDon;
    const khung = document.createElement('div');
    khung.innerHTML = `
      <table class="bang-hd">
        <caption></caption>
        <thead><tr><th scope="col">Món</th><th scope="col"><abbr title="Số lượng">SL</abbr></th><th scope="col">Đơn giá</th><th scope="col">Thành tiền</th></tr></thead>
        <tbody></tbody>
      </table>
      <div class="dong-tien"><span>Tổng tiền</span><span data-o="tong"></span></div>
      <div class="dong-tien"><span>Giảm giá</span><span data-o="giam"></span></div>
      <div class="dong-tien lon"><span>Cần thanh toán</span><span data-o="can"></span></div>
      <button type="button" class="btn btn-chinh btn-rong" data-o="nut">Thanh toán</button>`;
    khung.querySelector('caption').textContent = `Mã đơn: ${hd.donHangId}`;
    const tbody = khung.querySelector('tbody');
    hd.dsMon.forEach((m) => {
      const tr = document.createElement('tr');
      [m.tenMon, m.soLuong, UI.tien(m.donGia), UI.tien(m.thanhTien)].forEach((giaTri) => {
        const td = document.createElement('td');
        td.textContent = giaTri;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    khung.querySelector('[data-o="tong"]').textContent = UI.tien(hd.tongTien);
    khung.querySelector('[data-o="giam"]').textContent = hd.tienGiamGia ? `−${UI.tien(hd.tienGiamGia)}` : UI.tien(0);
    khung.querySelector('[data-o="can"]').textContent = UI.tien(hd.canThanhToan);
    khung.querySelector('[data-o="nut"]').addEventListener('click', moPopup);
    khuHoaDon.replaceChildren(khung);
  }

  // ================= UC10: thanh toan =================

  // Vi du: gd-20261010-142233-a1b2c3 (VARCHAR(100), UNIQUE o CSDL)
  function taoMaGiaoDich() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    const ngay = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
    const gio = `${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
    const ngauNhien = Array.from(crypto.getRandomValues(new Uint8Array(3)), (b) => b.toString(16).padStart(2, '0')).join('');
    return `gd-${ngay}-${gio}-${ngauNhien}`;
  }

  function moPopup() {
    const hd = trangThai.hoaDon;
    if (!hd) return;
    // 1 ma giao dich cho ca luot: bam lai sau khi mat mang van gui ma cu -> server tra ket qua cu, khong thu 2 lan
    if (!trangThai.maGiaoDich) trangThai.maGiaoDich = taoMaGiaoDich();
    form.reset();
    anLoiTt();
    datLoiTien('');
    $('tt-tieu-de').textContent = `Thanh toán bàn ${hd.soBan}`;
    $('tt-can-tra').textContent = UI.tien(hd.canThanhToan);
    $('tt-qr-so-tien').textContent = UI.tien(hd.canThanhToan);
    $('tt-ma-gd').textContent = trangThai.maGiaoDich;
    veGoiYTien(hd.canThanhToan);
    veQr(trangThai.maGiaoDich);
    doiPhuongThuc();
    popup.showModal();
    oTien.focus();
  }

  function dongPopup() {
    if (trangThai.dangXuLy) return;
    popup.close();
  }

  nutHuy.addEventListener('click', dongPopup);
  popup.addEventListener('cancel', (e) => {
    e.preventDefault(); // phim Esc: khong dong khi dang xu ly
    dongPopup();
  });

  function doiPhuongThuc() {
    const laTienMat = form.phuongThuc.value === 'TIEN_MAT';
    $('khu-tien-mat').classList.toggle('an', !laTienMat);
    $('khu-qr').classList.toggle('an', laTienMat);
    anLoiTt();
    capNhatTienThoi();
  }
  form.addEventListener('change', (e) => {
    if (e.target.name === 'phuongThuc') doiPhuongThuc();
  });

  // Nut chon nhanh: dung so tien + cac menh gia chan gan nhat
  function veGoiYTien(can) {
    const lamTron = (buoc) => Math.ceil(can / buoc) * buoc;
    const ds = [...new Set([can, lamTron(10000), lamTron(50000), lamTron(100000), 200000, 500000])]
      .filter((x) => x >= can)
      .sort((a, b) => a - b)
      .slice(0, 5);
    const khung = $('goi-y-tien');
    khung.replaceChildren(...ds.map((x, i) => {
      const nut = document.createElement('button');
      nut.type = 'button';
      nut.className = 'btn btn-nho';
      nut.dataset.tien = x;
      nut.textContent = i === 0 ? `Đúng ${UI.tien(x)}` : UI.tien(x);
      return nut;
    }));
  }
  $('goi-y-tien').addEventListener('click', (e) => {
    const nut = e.target.closest('[data-tien]');
    if (!nut) return;
    oTien.value = nut.dataset.tien;
    datLoiTien('');
    capNhatTienThoi();
  });

  // null = bo trong, NaN = nhap sai
  function docTien() {
    const chuoi = oTien.value.trim();
    if (chuoi === '') return null;
    const n = Number(chuoi);
    return Number.isFinite(n) && n >= 0 ? n : NaN;
  }

  function capNhatTienThoi() {
    if (!trangThai.hoaDon) return;
    const tien = docTien();
    const can = trangThai.hoaDon.canThanhToan;
    $('tt-tien-thoi').textContent = tien !== null && tien >= can ? UI.tien(tien - can) : '—';
  }

  oTien.addEventListener('input', () => {
    datLoiTien('');
    capNhatTienThoi();
  });

  function datLoiTien(noiDung) {
    $('loi-tien-khach-dua').textContent = noiDung;
    oTien.setAttribute('aria-invalid', noiDung ? 'true' : 'false');
  }

  function hienLoiTt(noiDung) {
    ttLoi.textContent = noiDung;
    ttLoi.classList.remove('an');
  }

  function anLoiTt() {
    ttLoi.classList.add('an');
  }

  // Khoa nut khi dang xu ly (chong bam 2 lan)
  function khoa(dangXuLy) {
    trangThai.dangXuLy = dangXuLy;
    nutXacNhan.disabled = dangXuLy;
    nutHuy.disabled = dangXuLy;
    form.querySelectorAll('input').forEach((o) => { o.disabled = dangXuLy; });
    nutXacNhan.textContent = dangXuLy ? 'Đang xử lý…' : 'Xác nhận thanh toán';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const hd = trangThai.hoaDon;
    if (trangThai.dangXuLy || !hd) return;
    anLoiTt();
    const phuongThuc = form.phuongThuc.value;
    const body = { donHangId: hd.donHangId, phuongThuc, maGiaoDich: trangThai.maGiaoDich };

    // Bao loi ngay duoi o (server van kiem tra lai: TIEN_KHONG_DU)
    if (phuongThuc === 'TIEN_MAT') {
      const tien = docTien();
      if (tien === null || Number.isNaN(tien)) {
        datLoiTien('Vui lòng nhập số tiền khách đưa');
        oTien.focus();
        return;
      }
      if (tien < hd.canThanhToan) {
        datLoiTien(THONG_BAO.TIEN_KHONG_DU);
        oTien.focus();
        return;
      }
      body.tienKhachDua = tien;
    }

    khoa(true);
    try {
      const ketQua = await Api.post('/payments', body);
      khoa(false);
      popup.close();
      thanhToanXong(ketQua);
    } catch (err) {
      khoa(false);
      xuLyLoiThanhToan(err);
    }
  });

  // 3 nhanh loi nhu SD_ThanhToan: nghiep vu (hien trong popup), mat mang, loi he thong
  function xuLyLoiThanhToan(err) {
    if (err.maLoi === 'MAT_KET_NOI') {
      hienLoiTt('Mất kết nối, chưa rõ đã thanh toán chưa. Bấm "Xác nhận" lại khi có mạng: cùng mã giao dịch nên khách không bị thu 2 lần.');
      return;
    }
    if (err.status >= 500) {
      hienLoiTt('Hệ thống đang gặp sự cố. Thử lại sau ít phút, mã giao dịch được giữ nguyên.');
      return;
    }
    if (err.maLoi === 'TIEN_KHONG_DU') {
      datLoiTien(THONG_BAO.TIEN_KHONG_DU);
      oTien.focus();
      return;
    }
    if (err.maLoi === 'DON_DA_THANH_TOAN' || err.maLoi === 'DON_KHONG_TON_TAI') {
      popup.close();
      UI.toast(thongBaoLoi(err), 'loi', 5000);
      boChonBan();
      return;
    }
    hienLoiTt(thongBaoLoi(err));
  }

  function thanhToanXong(kq) {
    const soBan = trangThai.hoaDon.soBan;
    const laTienMat = kq.phuongThuc === 'TIEN_MAT';
    // daXuLyTruoc: lan gui truoc (bi mat phan hoi) da thu roi, server tra lai ket qua cu, khong thu them
    const ghiChu = kq.daXuLyTruoc ? ' Giao dịch đã được ghi nhận từ lần gửi trước, không thu thêm.' : '';
    UI.toast(`Thanh toán bàn ${soBan} thành công.${laTienMat ? ` Tiền thối ${UI.tien(kq.tienThoi)}.` : ''}${ghiChu}`, 'thanh-cong', 6000);
    boChonBan();
    $('tieu-de-hoa-don').textContent = `Đã thanh toán bàn ${soBan}`;

    // Tom tat ket qua de thu ngan doc lai tien thoi cho khach
    const khung = document.createElement('div');
    const dong = (nhan, giaTri, lon = false) => {
      const d = document.createElement('div');
      d.className = lon ? 'dong-tien lon' : 'dong-tien';
      d.innerHTML = '<span></span><span></span>';
      d.children[0].textContent = nhan;
      d.children[1].textContent = giaTri;
      khung.appendChild(d);
    };
    dong('Số tiền', UI.tien(kq.soTienThanhToan));
    dong('Phương thức', laTienMat ? 'Tiền mặt' : 'Chuyển khoản QR');
    dong('Mã giao dịch', kq.maGiaoDich);
    if (laTienMat) dong('Tiền thối', UI.tien(kq.tienThoi), true);
    const p = document.createElement('p');
    p.className = 'rong-nho';
    p.textContent = 'Bàn đã chuyển sang "Cần dọn". Chọn bàn khác để tiếp tục.';
    khung.appendChild(p);
    khuHoaDon.replaceChildren(khung);
  }

  // Xoa hoa don dang mo; ban vua thanh toan chuyen CAN_DON nen bien mat khoi danh sach
  function boChonBan() {
    trangThai.ban = null;
    trangThai.hoaDon = null;
    trangThai.maGiaoDich = null;
    $('tieu-de-hoa-don').textContent = 'Hóa đơn';
    hienChuThich('Chọn một bàn để xem hóa đơn.');
    taiDsBan();
  }

  // Ma QR gia lap (UC10.2): hoa van 25x25 sinh tu ma giao dich, co 3 o dinh vi nhu QR that. Khong quet duoc.
  function veQr(chuoi) {
    const n = 25;
    let h = 2166136261;
    for (const c of chuoi) {
      h ^= c.charCodeAt(0);
      h = Math.imul(h, 16777619);
    }
    const ngauNhien = () => {
      h ^= h << 13;
      h ^= h >>> 17;
      h ^= h << 5;
      return (h >>> 0) / 4294967296;
    };
    const laDinhVi = (x, y) => (x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8);
    let duong = '';
    for (let y = 0; y < n; y += 1) {
      for (let x = 0; x < n; x += 1) {
        if (!laDinhVi(x, y) && ngauNhien() < 0.5) duong += `M${x} ${y}h1v1h-1z`;
      }
    }
    const dinhVi = (x, y) => `<rect x="${x + 0.5}" y="${y + 0.5}" width="6" height="6" fill="none" stroke="#2B1B12"/>
      <rect x="${x + 2}" y="${y + 2}" width="3" height="3" fill="#2B1B12"/>`;
    $('qr-gia').innerHTML = `<svg viewBox="-1 -1 ${n + 2} ${n + 2}" shape-rendering="crispEdges" aria-hidden="true">
      <path d="${duong}" fill="#2B1B12"/>${dinhVi(0, 0)}${dinhVi(n - 7, 0)}${dinhVi(0, n - 7)}</svg>`;
  }

  // ================= Khoi dong =================
  hienChuThich('Chọn một bàn để xem hóa đơn.');
  taiDsBan();
  // Tu lam moi danh sach ban 10 giay/lan (khong lam khi dang mo popup)
  setInterval(() => {
    if (!document.hidden && !popup.open) taiDsBan(true);
  }, 10000);
})();
