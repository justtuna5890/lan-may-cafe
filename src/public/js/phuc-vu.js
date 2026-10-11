// Man Phuc vu (H3): so do ban, goi mon (UC01), cap nhat order (UC04)
// Can nap ui.js, phien.js, api.js truoc file nay.
(() => {
  const phien = Phien.yeuCau('PHUC_VU');
  if (!phien) return;

  const TEN_TT_BAN = { TRONG: 'Trống', DANG_PHUC_VU: 'Đang phục vụ', CAN_DON: 'Cần dọn', DAT_TRUOC: 'Đặt trước' };
  const TEN_CHE_BIEN = { CHO_PHA_CHE: 'Chờ pha chế', DANG_LAM: 'Đang làm', DA_XONG: 'Đã xong', DA_HUY: 'Đã hủy' };

  // Anh mon co san trong /assets, mon khac dung logo
  const ANH_MON = {
    'Cà phê đen': 'cf-den',
    'Cà phê sữa': 'cf-sua-da',
    'Bạc xỉu': 'bac-xiu',
    'Trà đào': 'tra-dao',
    'Trà sữa': 'tra-sua',
    'Bánh Croissant': 'banh-croissant',
  };

  // Server tra message khong dau: giao dien hien cau co dau theo maLoi (api-contract muc UC01, UC04)
  const THONG_BAO = {
    BAN_CAN_DON: 'Bàn đang cần dọn, chưa thể gọi món.',
    BAN_KHONG_TON_TAI: 'Không tìm thấy bàn.',
    DS_MON_RONG: 'Chưa chọn món nào.',
    SO_LUONG_KHONG_HOP_LE: 'Số lượng phải từ 1 đến 99.',
    MON_KHONG_TON_TAI: 'Món không còn trong thực đơn.',
    DON_KHONG_TON_TAI: 'Không tìm thấy đơn hàng.',
    DON_DA_THANH_TOAN: 'Đơn đã thanh toán, không thể cập nhật.',
    MON_DA_CHE_BIEN: 'Món đang làm hoặc đã xong, không thể sửa hay hủy.',
    MON_DA_HUY: 'Món này đã bị hủy.',
    MON_TRONG_DON_KHONG_TON_TAI: 'Không tìm thấy món trong đơn.',
    KHONG_CO_QUYEN: 'Tài khoản không có quyền dùng chức năng này.',
  };

  function thongBaoLoi(err) {
    if (err.maLoi === 'MON_TAM_HET') {
      const khop = /^Mon (.+) da het nguyen lieu$/.exec(err.message || '');
      return khop ? `Món ${khop[1]} đã hết nguyên liệu.` : 'Có món đã hết nguyên liệu.';
    }
    return THONG_BAO[err.maLoi] || err.message || 'Có lỗi xảy ra.';
  }

  // Mat ket noi / loi 5xx: api.js da hien toast / alert, man hinh khong bao them
  const daBaoLoi = (err) => err.maLoi === 'MAT_KET_NOI' || err.status >= 500;

  const $ = (id) => document.getElementById(id);
  const manSoDo = $('man-so-do');
  const manGoiMon = $('man-goi-mon');
  const luoiBan = $('luoi-ban');
  const dsThucDon = $('ds-thuc-don');
  const oTim = $('o-tim');
  const khuDon = $('khu-don');
  const gioHang = $('gio-hang');
  const loiGio = $('loi-gio');
  const nutGuiBep = $('nut-gui-bep');

  const trangThai = {
    dsBan: [],
    thucDon: [],
    ban: null, // ban dang mo
    don: null, // don hien tai cua ban; null = ban chua co don -> tao order moi (UC01)
    gio: [], // mon moi chua gui: { monId, tenMon, gia, soLuong (null neu nhap sai), ghiChu }
    dangGui: false,
  };

  // ================= Man 1: so do ban =================

  function veSoDo() {
    if (!trangThai.dsBan.length) {
      UI.trangThaiRong(luoiBan, 'Chưa có bàn nào.');
      return;
    }
    const ul = document.createElement('ul');
    ul.className = 'luoi-ban';
    trangThai.dsBan.forEach((ban) => {
      const tenTT = TEN_TT_BAN[ban.trangThai] || ban.trangThai;
      const nut = document.createElement('button');
      nut.type = 'button';
      nut.className = 'o-ban';
      nut.dataset.tt = ban.trangThai;
      nut.dataset.banId = ban.banId;
      nut.innerHTML = '<span class="ten-ban"></span><span class="tt-ban"></span>';
      nut.querySelector('.ten-ban').textContent = ban.tenBan;
      nut.querySelector('.tt-ban').textContent = tenTT;
      nut.setAttribute('aria-label', `Bàn ${ban.tenBan}, ${tenTT}`);
      // Ban CAN_DON khong goi mon duoc (UC01)
      if (ban.trangThai === 'CAN_DON') nut.setAttribute('aria-disabled', 'true');
      const li = document.createElement('li');
      li.appendChild(nut);
      ul.appendChild(li);
    });
    luoiBan.replaceChildren(ul);
  }

  async function taiSoDo(im = false) {
    try {
      const ds = await Api.get('/tables', { im });
      if (JSON.stringify(ds) === JSON.stringify(trangThai.dsBan) && luoiBan.firstChild) return;
      trangThai.dsBan = ds;
      veSoDo();
    } catch (err) {
      if (!daBaoLoi(err)) UI.toast(thongBaoLoi(err), 'loi');
      if (!trangThai.dsBan.length) UI.trangThaiRong(luoiBan, 'Không tải được sơ đồ bàn.');
    }
  }

  luoiBan.addEventListener('click', (e) => {
    const nut = e.target.closest('.o-ban');
    if (!nut) return;
    const ban = trangThai.dsBan.find((b) => b.banId === nut.dataset.banId);
    if (ban) moBan(ban);
  });

  // ================= Mo 1 ban: lay thuc don + don hien tai =================

  async function layDonCuaBan(banId) {
    try {
      const { donHangId } = await Api.get(`/tables/${encodeURIComponent(banId)}/current-order`);
      return await Api.get(`/orders/${encodeURIComponent(donHangId)}`);
    } catch (err) {
      if (err.maLoi === 'BAN_KHONG_CO_DON') return null;
      throw err;
    }
  }

  async function moBan(ban) {
    if (ban.trangThai === 'CAN_DON') {
      UI.toast(THONG_BAO.BAN_CAN_DON, 'loi');
      return;
    }
    try {
      const [thucDon, don] = await Promise.all([Api.get('/menu'), layDonCuaBan(ban.banId)]);
      trangThai.thucDon = thucDon;
      trangThai.don = don;
    } catch (err) {
      if (!daBaoLoi(err)) UI.toast(thongBaoLoi(err), 'loi');
      return;
    }
    trangThai.ban = { ...ban };
    trangThai.gio = [];
    oTim.value = '';
    anLoiGio();
    manSoDo.classList.add('an');
    manGoiMon.classList.remove('an');
    veManGoiMon();
    $('tieu-de-goi-mon').focus();
    batTuLamMoi();
  }

  async function quayVeSoDo({ hoi = true } = {}) {
    if (hoi && trangThai.gio.length) {
      const dongY = await UI.xacNhan('Các món mới chưa gửi bếp sẽ bị bỏ. Quay lại sơ đồ bàn?', {
        tieuDe: 'Chưa gửi bếp', nutChinh: 'Bỏ và quay lại', nutPhu: 'Ở lại',
      });
      if (!dongY) return;
    }
    const banCu = trangThai.ban;
    trangThai.ban = null;
    trangThai.don = null;
    trangThai.gio = [];
    manGoiMon.classList.add('an');
    manSoDo.classList.remove('an');
    batTuLamMoi();
    await taiSoDo();
    // Dua focus ve o ban vua mo (nguoi dung ban phim khong bi lac)
    const nut = banCu && luoiBan.querySelector(`[data-ban-id="${CSS.escape(banCu.banId)}"]`);
    if (nut) nut.focus();
  }

  $('nut-quay-lai').addEventListener('click', () => quayVeSoDo());
  $('nut-tai-lai').addEventListener('click', () => taiSoDo());

  // ================= Man 2: goi mon / cap nhat order =================

  function veManGoiMon() {
    const { ban, don } = trangThai;
    $('tieu-de-goi-mon').textContent = `Bàn ${ban.tenBan}`;
    const tt = don ? 'DANG_PHUC_VU' : ban.trangThai;
    const nhan = $('nhan-ban');
    nhan.dataset.tt = tt;
    nhan.textContent = TEN_TT_BAN[tt] || tt;
    veThucDon();
    veDon();
    veGio();
  }

  const laMonHet = (monId) => trangThai.thucDon.some((m) => m.monId === monId && m.trangThai === 'TAM_HET');

  // Tim khong dau: "tra dao" van ra "Trà đào"
  function boDau(chuoi) {
    return chuoi.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
  }

  // ---------- Thuc don: mon TAM_HET hien xam, khong chon duoc ----------
  function veThucDon() {
    const tuKhoa = boDau(oTim.value.trim());
    const ds = trangThai.thucDon.filter((m) => !tuKhoa || boDau(m.tenMon).includes(tuKhoa));
    if (!ds.length) {
      UI.trangThaiRong(dsThucDon, tuKhoa ? 'Không tìm thấy món phù hợp.' : 'Thực đơn đang trống.');
      return;
    }
    const ul = document.createElement('ul');
    ul.className = 'luoi-mon';
    ds.forEach((mon) => {
      const het = mon.trangThai === 'TAM_HET';
      const nut = document.createElement('button');
      nut.type = 'button';
      nut.className = 'o-mon';
      nut.dataset.monId = mon.monId;
      nut.innerHTML = `<img alt="" src="/assets/${ANH_MON[mon.tenMon] || 'logo'}.svg">
        <span class="ten-mon"></span><span class="gia"></span>${het ? '<span class="nhan-het">Tạm hết</span>' : ''}`;
      nut.querySelector('.ten-mon').textContent = mon.tenMon;
      nut.querySelector('.gia').textContent = UI.tien(mon.gia);
      nut.setAttribute('aria-label', het ? `${mon.tenMon}, tạm hết` : `Thêm ${mon.tenMon}, ${UI.tien(mon.gia)}`);
      if (het) nut.setAttribute('aria-disabled', 'true');
      const li = document.createElement('li');
      li.appendChild(nut);
      ul.appendChild(li);
    });
    dsThucDon.replaceChildren(ul);
  }

  oTim.addEventListener('input', veThucDon);

  dsThucDon.addEventListener('click', (e) => {
    const nut = e.target.closest('.o-mon');
    if (!nut) return;
    const mon = trangThai.thucDon.find((m) => m.monId === nut.dataset.monId);
    if (!mon) return;
    if (mon.trangThai === 'TAM_HET') {
      UI.toast(`Món ${mon.tenMon} đã hết nguyên liệu.`, 'loi');
      return;
    }
    const dong = trangThai.gio.find((d) => d.monId === mon.monId);
    if (dong) dong.soLuong = Math.min(99, (dong.soLuong || 0) + 1);
    else trangThai.gio.push({ monId: mon.monId, tenMon: mon.tenMon, gia: mon.gia, soLuong: 1, ghiChu: '' });
    anLoiGio();
    veGio();
  });

  // ---------- Mon da goi (UC04): sua so luong, huy mon khi con CHO_PHA_CHE ----------
  function veDon() {
    const { don } = trangThai;
    $('tieu-de-don').classList.toggle('an', !don);
    if (!don) {
      khuDon.innerHTML = '<p class="rong-nho">Bàn chưa có đơn. Chọn món rồi bấm "Gửi bếp" để tạo order.</p>';
      return;
    }
    const khung = document.createDocumentFragment();
    if (don.isSynced === false) {
      const p = document.createElement('p');
      p.className = 'canh-bao';
      p.textContent = 'Bếp chưa xác nhận order này (quá 5 giây). Đơn vẫn đã được lưu, hãy báo quầy bếp kiểm tra.';
      khung.appendChild(p);
    }
    const ul = document.createElement('ul');
    ul.className = 'ds-dong';
    don.dsMon.forEach((m) => ul.appendChild(taoDongDaGoi(m)));
    khung.appendChild(ul);

    const tong = document.createElement('div');
    tong.className = 'dong-tien';
    tong.innerHTML = '<span>Tổng đơn hiện tại</span><strong></strong>';
    tong.querySelector('strong').textContent = UI.tien(don.tongTien);
    khung.appendChild(tong);
    khuDon.replaceChildren(khung);
  }

  function taoDongDaGoi(m) {
    const li = document.createElement('li');
    li.className = 'dong-mon';
    li.dataset.chiTietId = m.chiTietId;
    if (m.trangThaiCheBien === 'DA_HUY') li.classList.add('da-huy');
    li.innerHTML = `
      <div class="hang"><span class="ten"></span><span class="nhan-cb"></span></div>
      <p class="ghi-chu an"></p>`;
    li.querySelector('.ten').textContent = `${m.tenMon} × ${m.soLuong}`;
    const nhan = li.querySelector('.nhan-cb');
    nhan.dataset.cb = m.trangThaiCheBien;
    nhan.textContent = TEN_CHE_BIEN[m.trangThaiCheBien] || m.trangThaiCheBien;
    if (m.ghiChu) {
      const gc = li.querySelector('.ghi-chu');
      gc.textContent = `Ghi chú: ${m.ghiChu}`;
      gc.classList.remove('an');
    }

    // Chi mon CHO_PHA_CHE moi sua / huy duoc; DANG_LAM, DA_XONG, DA_HUY an nut
    if (m.trangThaiCheBien === 'CHO_PHA_CHE') {
      const idSl = `sua-sl-${m.chiTietId}`;
      const hang = document.createElement('div');
      hang.className = 'hang';
      hang.innerHTML = `
        <div class="buoc-sl">
          <label class="sr-only" for="${idSl}"></label>
          <input type="number" id="${idSl}" min="1" max="99" step="1" inputmode="numeric" aria-describedby="loi-${idSl}">
          <button type="button" class="btn btn-nho" data-hd="luu">Lưu số lượng</button>
        </div>
        <button type="button" class="btn btn-nho btn-nguy-hiem day-phai" data-hd="huy">Hủy món</button>`;
      hang.querySelector('label').textContent = `Số lượng ${m.tenMon}`;
      hang.querySelector('input').value = m.soLuong;
      hang.querySelector('[data-hd="huy"]').setAttribute('aria-label', `Hủy món ${m.tenMon}`);
      const loi = document.createElement('p');
      loi.className = 'loi-o';
      loi.id = `loi-${idSl}`;
      li.append(hang, loi);
    }
    return li;
  }

  khuDon.addEventListener('click', async (e) => {
    const nut = e.target.closest('[data-hd]');
    if (!nut || !trangThai.don) return;
    const li = nut.closest('.dong-mon');
    const mon = trangThai.don.dsMon.find((m) => String(m.chiTietId) === li.dataset.chiTietId);
    if (!mon) return;
    const duongDan = `/orders/${encodeURIComponent(trangThai.don.donHangId)}/items/${encodeURIComponent(mon.chiTietId)}`;

    if (nut.dataset.hd === 'luu') {
      const o = li.querySelector('input');
      const soLuong = docSoLuong(o.value);
      if (soLuong === null) {
        datLoiO(o, THONG_BAO.SO_LUONG_KHONG_HOP_LE);
        o.focus();
        return;
      }
      if (soLuong === mon.soLuong) return;
      await capNhatDon(() => Api.patch(duongDan, { soLuong }), `Đã đổi ${mon.tenMon} thành ${soLuong}.`);
    }

    if (nut.dataset.hd === 'huy') {
      const dongY = await UI.xacNhan(`Hủy món ${mon.tenMon} × ${mon.soLuong}? Món sẽ bị trừ khỏi đơn.`, {
        tieuDe: 'Hủy món', nutChinh: 'Hủy món', nutPhu: 'Giữ lại', nguyHiem: true,
      });
      if (!dongY) return;
      await capNhatDon(() => Api.del(duongDan), `Đã hủy ${mon.tenMon}.`);
    }
  });

  // Goi API sua / huy, cap nhat lai don theo response (don day du)
  async function capNhatDon(goiApi, thongBaoThanhCong) {
    try {
      trangThai.don = await goiApi();
      veDon();
      capNhatTong();
      UI.toast(thongBaoThanhCong, 'thanh-cong');
    } catch (err) {
      if (daBaoLoi(err)) return;
      UI.toast(thongBaoLoi(err), 'loi', 5000);
      // Bep vua bat dau lam / mon vua bi huy o may khac: tai lai de thay trang thai moi
      if (['MON_DA_CHE_BIEN', 'MON_DA_HUY', 'MON_TRONG_DON_KHONG_TON_TAI'].includes(err.maLoi)) await lamMoiDon({ ep: true });
      if (err.maLoi === 'DON_DA_THANH_TOAN') quayVeSoDo({ hoi: false });
    }
  }

  // ---------- Mon moi (gio hang) ----------
  function docSoLuong(chuoi) {
    const n = Number(chuoi);
    return chuoi !== '' && Number.isInteger(n) && n >= 1 && n <= 99 ? n : null;
  }

  function datLoiO(o, noiDung) {
    o.setAttribute('aria-invalid', noiDung ? 'true' : 'false');
    const loi = document.getElementById(o.getAttribute('aria-describedby'));
    if (loi) loi.textContent = noiDung;
  }

  function hienLoiGio(noiDung) {
    loiGio.textContent = noiDung;
    loiGio.classList.remove('an');
  }

  function anLoiGio() {
    loiGio.classList.add('an');
  }

  function veGio() {
    if (!trangThai.gio.length) {
      gioHang.innerHTML = '<li class="rong-nho">Chọn món ở thực đơn để thêm vào đây.</li>';
    } else {
      gioHang.replaceChildren(...trangThai.gio.map(taoDongGio));
    }
    capNhatTong();
  }

  function taoDongGio(d, i) {
    const li = document.createElement('li');
    li.className = 'dong-mon';
    li.dataset.i = i;
    if (laMonHet(d.monId)) li.classList.add('loi');
    li.innerHTML = `
      <div class="hang"><span class="ten"></span><strong class="thanh-tien"></strong></div>
      <div class="hang">
        <div class="buoc-sl">
          <button type="button" class="btn btn-nho" data-hd="giam">−</button>
          <label class="sr-only" for="sl-${i}"></label>
          <input type="number" id="sl-${i}" min="1" max="99" step="1" inputmode="numeric" aria-describedby="loi-sl-${i}">
          <button type="button" class="btn btn-nho" data-hd="tang">+</button>
        </div>
        <button type="button" class="btn btn-nho btn-nguy-hiem day-phai" data-hd="bo">Bỏ</button>
      </div>
      <p class="loi-o" id="loi-sl-${i}"></p>
      <label class="sr-only" for="gc-${i}"></label>
      <input type="text" class="o-ghi-chu" id="gc-${i}" maxlength="255" placeholder="Ghi chú: ít đá, không đường…">`;
    li.querySelector('.ten').textContent = d.tenMon;
    li.querySelector('.thanh-tien').textContent = UI.tien((d.soLuong || 0) * d.gia);
    li.querySelector(`label[for="sl-${i}"]`).textContent = `Số lượng ${d.tenMon}`;
    li.querySelector(`label[for="gc-${i}"]`).textContent = `Ghi chú cho ${d.tenMon}`;
    li.querySelector('[data-hd="giam"]').setAttribute('aria-label', `Giảm số lượng ${d.tenMon}`);
    li.querySelector('[data-hd="tang"]').setAttribute('aria-label', `Tăng số lượng ${d.tenMon}`);
    li.querySelector('[data-hd="bo"]').setAttribute('aria-label', `Bỏ ${d.tenMon} khỏi món mới`);
    const oSl = li.querySelector(`#sl-${i}`);
    oSl.value = d.soLuong === null ? '' : d.soLuong;
    if (d.soLuong === null) datLoiO(oSl, THONG_BAO.SO_LUONG_KHONG_HOP_LE);
    if (laMonHet(d.monId)) li.querySelector('.loi-o').textContent = 'Món này vừa hết nguyên liệu, hãy bỏ khỏi đơn.';
    li.querySelector('.o-ghi-chu').value = d.ghiChu;
    return li;
  }

  gioHang.addEventListener('click', (e) => {
    const nut = e.target.closest('[data-hd]');
    if (!nut) return;
    const i = Number(nut.closest('.dong-mon').dataset.i);
    const d = trangThai.gio[i];
    if (nut.dataset.hd === 'tang') d.soLuong = Math.min(99, (d.soLuong || 0) + 1);
    if (nut.dataset.hd === 'giam') d.soLuong = Math.max(1, (d.soLuong || 2) - 1);
    if (nut.dataset.hd === 'bo') trangThai.gio.splice(i, 1);
    veGio();
    // Giu focus o nut vua bam sau khi ve lai
    const conLai = gioHang.querySelector(`[data-i="${i}"] [data-hd="${nut.dataset.hd}"]`);
    if (conLai) conLai.focus();
  });

  // Go so luong / ghi chu: cap nhat trang thai, khong ve lai ca gio de khong mat focus
  gioHang.addEventListener('input', (e) => {
    const li = e.target.closest('.dong-mon');
    if (!li) return;
    const d = trangThai.gio[Number(li.dataset.i)];
    if (e.target.type === 'number') {
      d.soLuong = docSoLuong(e.target.value);
      datLoiO(e.target, d.soLuong === null ? THONG_BAO.SO_LUONG_KHONG_HOP_LE : '');
      li.querySelector('.thanh-tien').textContent = UI.tien((d.soLuong || 0) * d.gia);
      capNhatTong();
    } else {
      d.ghiChu = e.target.value;
    }
  });

  function capNhatTong() {
    const tongGio = trangThai.gio.reduce((tong, d) => tong + (d.soLuong || 0) * d.gia, 0);
    $('tong-gio').textContent = UI.tien(tongGio);
    $('tong-don').textContent = UI.tien((trangThai.don ? trangThai.don.tongTien : 0) + tongGio);
    nutGuiBep.disabled = trangThai.dangGui;
    if (!trangThai.dangGui) nutGuiBep.textContent = trangThai.don ? 'Gọi thêm (gửi bếp)' : 'Gửi bếp';
  }

  // ---------- Gui bep: UC01 tao order moi, UC04 goi them vao don dang co ----------
  nutGuiBep.addEventListener('click', guiBep);

  async function guiBep() {
    if (trangThai.dangGui) return; // chong bam 2 lan
    anLoiGio();
    if (!trangThai.gio.length) {
      hienLoiGio(THONG_BAO.DS_MON_RONG);
      return;
    }
    // Kiem tra truoc o giao dien; server van kiem tra lai (SO_LUONG_KHONG_HOP_LE)
    const iSai = trangThai.gio.findIndex((d) => d.soLuong === null);
    if (iSai >= 0) {
      hienLoiGio('Số lượng mỗi món phải từ 1 đến 99.');
      $(`sl-${iSai}`).focus();
      return;
    }
    const monHet = trangThai.gio.find((d) => laMonHet(d.monId));
    if (monHet) {
      hienLoiGio(`Món ${monHet.tenMon} đã hết nguyên liệu, hãy bỏ món này.`);
      return;
    }

    const dsMon = trangThai.gio.map((d) => ({ monId: d.monId, soLuong: d.soLuong, ghiChu: d.ghiChu.trim() || undefined }));
    const goiThem = Boolean(trangThai.don);
    trangThai.dangGui = true;
    nutGuiBep.disabled = true;
    nutGuiBep.textContent = 'Đang gửi…';
    try {
      const don = goiThem
        ? await Api.post(`/orders/${encodeURIComponent(trangThai.don.donHangId)}/items`, { dsMon })
        : await Api.post('/orders', { banId: trangThai.ban.banId, dsMon });
      trangThai.don = don;
      trangThai.gio = [];
      trangThai.ban.trangThai = 'DANG_PHUC_VU';
      veManGoiMon();
      if (don.isSynced === false) {
        UI.toast('Bếp chưa xác nhận (quá 5 giây). Đơn vẫn đã được lưu.', 'loi', 6000);
      } else {
        UI.toast(goiThem ? 'Đã gửi món gọi thêm xuống bếp.' : `Đã gửi order bàn ${trangThai.ban.tenBan} xuống bếp.`, 'thanh-cong');
      }
    } catch (err) {
      if (!daBaoLoi(err)) await xuLyLoiGui(err);
    } finally {
      trangThai.dangGui = false;
      capNhatTong();
    }
  }

  async function xuLyLoiGui(err) {
    switch (err.maLoi) {
      case 'MON_TAM_HET': // mon vua het trong luc dang chon: tai lai thuc don de lam xam
        hienLoiGio(thongBaoLoi(err));
        try {
          trangThai.thucDon = await Api.get('/menu');
        } catch (e) { /* giu thuc don cu */ }
        veThucDon();
        veGio();
        break;
      case 'BAN_DA_CO_DON': // phuc vu khac vua tao don cho ban nay: chuyen sang goi them, giu gio
        try {
          trangThai.don = await layDonCuaBan(trangThai.ban.banId);
        } catch (e) { /* giu nguyen */ }
        veManGoiMon();
        hienLoiGio('Bàn vừa có đơn khác. Đã mở đơn hiện tại, bấm "Gọi thêm" để gửi lại các món mới.');
        break;
      case 'BAN_CAN_DON':
      case 'DON_DA_THANH_TOAN':
        await UI.alert(err.maLoi === 'BAN_CAN_DON' ? THONG_BAO.BAN_CAN_DON : 'Đơn của bàn đã được thanh toán.', 'Không thể gửi bếp');
        quayVeSoDo({ hoi: false });
        break;
      default:
        hienLoiGio(thongBaoLoi(err));
    }
  }

  // ================= Tu lam moi =================
  // So do ban: 10 giay/lan. Dang mo ban: 5 giay/lan de thay bep doi trang thai mon (Cho -> Dang lam -> Da xong)

  async function lamMoiDon({ ep = false } = {}) {
    const don = trangThai.don;
    if (!don) return;
    let moi;
    try {
      moi = await Api.get(`/orders/${encodeURIComponent(don.donHangId)}`, { im: true });
    } catch (err) {
      return;
    }
    if (trangThai.don !== don) return; // da doi ban hoac vua cap nhat trong luc cho
    if (moi.trangThai === 'DA_THANH_TOAN') {
      UI.toast(`Đơn bàn ${trangThai.ban.tenBan} đã được thanh toán.`);
      quayVeSoDo({ hoi: false });
      return;
    }
    if (!ep && JSON.stringify(moi) === JSON.stringify(don)) return;
    // Dang go so luong o mon da goi: de lan sau moi ve lai
    if (!ep && khuDon.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') return;
    trangThai.don = moi;
    veDon();
    capNhatTong();
  }

  let hen = null;
  function batTuLamMoi() {
    clearInterval(hen);
    hen = setInterval(() => {
      if (document.hidden) return;
      if (trangThai.ban) lamMoiDon();
      else taiSoDo(true);
    }, trangThai.ban ? 5000 : 10000);
  }

  taiSoDo();
  batTuLamMoi();
})();
