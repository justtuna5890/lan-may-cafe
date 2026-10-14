// Màn Phục vụ (H3): sơ đồ bàn, gọi món (UC01), cập nhật order (UC04)
// Cần nạp ui.js, phien.js, api.js trước file này.
(() => {
  const phien = Phien.yeuCau('PHUC_VU', 'CHU_QUAN');
  if (!phien) return;

  // ================= Bảng tra =================

  const TEN_TT_BAN = { TRONG: 'Trống', DANG_PHUC_VU: 'Đang phục vụ', CAN_DON: 'Cần dọn', DAT_TRUOC: 'Đặt trước' };
  const TEN_CHE_BIEN = { CHO_PHA_CHE: 'Chờ pha chế', DANG_LAM: 'Đang làm', DA_XONG: 'Đã xong', DA_HUY: 'Đã hủy' };

  // Ảnh thật của món trong /assets (nguồn và tác giả: docs/nguon-anh.md); món chưa có ảnh dùng logo quán
  const ANH_MON = {
    'Cà phê đen': 'cf-den.jpg',
    'Cà phê sữa': 'cf-sua-da.jpg',
    'Bạc xỉu': 'bac-xiu.jpg',
    'Trà đào': 'tra-dao.jpg',
    'Trà sữa': 'tra-sua.jpg',
    'Bánh Croissant': 'banh-croissant.jpg',
    'Cà phê americano': 'cf-americano.jpg',
    'Espresso': 'espresso.jpg',
    'Chocolate đá': 'chocolate-da.jpg',
    'Matcha Latte': 'matcha-latte.jpg',
    'Trà chanh': 'tra-chanh.jpg',
    'Trà dâu': 'tra-dau.jpg',
    'Trà vải': 'tra-vai.jpg',
    'Bánh cookies': 'banh-cookies.jpg',
    'Bánh Tiramisu': 'banh-tiramisu.jpg',
  };
  const ANH_MAC_DINH = 'logo.svg';

  // Server trả message không dấu: giao diện hiện câu có dấu theo maLoi (api-contract mục UC01, UC04)
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

  // Các lỗi cho biết món trong đơn đã đổi ở nơi khác (bếp vừa làm, máy khác vừa hủy): phải tải lại đơn
  const LOI_DON_DA_DOI = ['MON_DA_CHE_BIEN', 'MON_DA_HUY', 'MON_TRONG_DON_KHONG_TON_TAI'];

  const SO_LUONG_TOI_DA = 99;
  const CHU_KY_SO_DO_MS = 10000; // sơ đồ bàn: 10 giây một lần
  const CHU_KY_DON_MS = 5000; // đang mở bàn: 5 giây một lần để thấy bếp đổi trạng thái món

  // ================= Phần tử trên trang và trạng thái =================

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
    ban: null, // bàn đang mở
    don: null, // đơn hiện tại của bàn; null = bàn chưa có đơn -> tạo order mới (UC01)
    gio: [], // món mới chưa gửi: { monId, tenMon, gia, soLuong (null nếu nhập sai), ghiChu }
    dangGui: false,
    nhom: 'CA_PHE', // tab nhóm món đang chọn (Figma: tab đầu tiên là Cà phê)
  };

  // ================= Hàm phụ =================

  // Mất kết nối / lỗi 5xx: api.js đã hiện toast / alert, màn hình không báo thêm
  const daBaoLoi = (err) => err.maLoi === 'MAT_KET_NOI' || err.status >= 500;

  function thongBaoLoi(err) {
    if (err.maLoi === 'MON_TAM_HET') {
      const khop = /^Mon (.+) da het nguyen lieu$/.exec(err.message || '');
      return khop ? `Món ${khop[1]} đã hết nguyên liệu.` : 'Có món đã hết nguyên liệu.';
    }
    return THONG_BAO[err.maLoi] || err.message || 'Có lỗi xảy ra.';
  }

  // Tìm không dấu: "tra dao" vẫn ra "Trà đào"
  function boDau(chuoi) {
    return chuoi.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
  }

  // 4 nhóm món theo Figma. CSDL chưa có cột nhóm nên gán theo từ khóa trong tên món (không dấu);
  // món không khớp từ khóa nào (ví dụ món chủ quán mới thêm) vào tab "Cà phê"
  function nhomCuaMon(tenMon) {
    const ten = boDau(tenMon);
    if (/banh|cookie|croissant|tiramisu/.test(ten)) return 'BANH';
    if (/^tra\b/.test(ten)) return 'TRA';
    if (/matcha|chocolate|da xay/.test(ten)) return 'DA_XAY';
    return 'CA_PHE';
  }

  // Số lượng hợp lệ là số nguyên từ 1 đến 99; sai thì trả null
  function docSoLuong(chuoi) {
    const n = Number(chuoi);
    return chuoi !== '' && Number.isInteger(n) && n >= 1 && n <= SO_LUONG_TOI_DA ? n : null;
  }

  // Đặt (hoặc xóa, nếu nội dung rỗng) lỗi ngay dưới một ô nhập
  function datLoiO(o, noiDung) {
    o.setAttribute('aria-invalid', noiDung ? 'true' : 'false');
    const loi = document.getElementById(o.getAttribute('aria-describedby'));
    if (loi) loi.textContent = noiDung;
  }

  const hienLoiGio = (noiDung) => {
    loiGio.textContent = noiDung;
    loiGio.classList.remove('an');
  };
  const anLoiGio = () => loiGio.classList.add('an');

  const laMonHet = (monId) => trangThai.thucDon.some((m) => m.monId === monId && m.trangThai === 'TAM_HET');

  // Chỉ hiện một màn: 'soDo' hoặc 'goiMon'
  function chuyenMan(ten) {
    manSoDo.classList.toggle('an', ten !== 'soDo');
    manGoiMon.classList.toggle('an', ten !== 'goiMon');
  }

  // Tạo phần tử với class (nếu có) và nhãn chữ (nếu có)
  function tao(thanh, lop, chu) {
    const el = document.createElement(thanh);
    if (lop) el.className = lop;
    if (chu !== undefined) el.textContent = chu;
    return el;
  }

  // Bọc một phần tử vào thẻ <li> (danh sách thẻ món, ô bàn)
  function boc(li, phanTu) {
    li.appendChild(phanTu);
    return li;
  }

  // ================= Màn 1: sơ đồ bàn =================

  function taoONBan(ban) {
    const tenTT = TEN_TT_BAN[ban.trangThai] || ban.trangThai;
    const nut = tao('button', 'o-ban');
    nut.type = 'button';
    nut.dataset.tt = ban.trangThai;
    nut.dataset.banId = ban.banId;
    nut.innerHTML = '<span class="ten-ban"></span><span class="tt-ban"></span>';
    nut.querySelector('.ten-ban').textContent = ban.tenBan;
    nut.querySelector('.tt-ban').textContent = tenTT;
    nut.setAttribute('aria-label', `Bàn ${ban.tenBan}, ${tenTT}`);
    if (ban.trangThai === 'CAN_DON') nut.setAttribute('aria-disabled', 'true'); // bàn cần dọn không gọi món được (UC01)
    return nut;
  }

  function veSoDo() {
    if (!trangThai.dsBan.length) {
      UI.trangThaiRong(luoiBan, 'Chưa có bàn nào.');
      return;
    }
    const ul = tao('ul', 'luoi-ban');
    trangThai.dsBan.forEach((ban) => ul.appendChild(boc(tao('li'), taoONBan(ban))));
    luoiBan.replaceChildren(ul);
  }

  async function taiSoDo(im = false) {
    try {
      const ds = await Api.get('/tables', { im });
      if (JSON.stringify(ds) === JSON.stringify(trangThai.dsBan) && luoiBan.firstChild) return; // không đổi thì khỏi vẽ lại
      trangThai.dsBan = ds;
      veSoDo();
    } catch (err) {
      if (!daBaoLoi(err)) UI.toast(thongBaoLoi(err), 'loi');
      if (!trangThai.dsBan.length) UI.trangThaiRong(luoiBan, 'Không tải được sơ đồ bàn.');
    }
  }

  // ================= Mở một bàn: lấy thực đơn và đơn hiện tại =================

  async function layDonCuaBan(banId) {
    try {
      const { donHangId } = await Api.get(`/tables/${encodeURIComponent(banId)}/current-order`);
      return await Api.get(`/orders/${encodeURIComponent(donHangId)}`);
    } catch (err) {
      if (err.maLoi === 'BAN_KHONG_CO_DON') return null; // bàn chưa có đơn: bình thường
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
    chuyenMan('goiMon');
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
    chuyenMan('soDo');
    batTuLamMoi();
    await taiSoDo();
    // Đưa focus về ô bàn vừa mở (người dùng bàn phím không bị lạc)
    const nut = banCu && luoiBan.querySelector(`[data-ban-id="${CSS.escape(banCu.banId)}"]`);
    if (nut) nut.focus();
  }

  // ================= Màn 2: gọi món / cập nhật order =================

  function veManGoiMon() {
    const { ban, don } = trangThai;
    $('tieu-de-goi-mon').textContent = `Bàn ${ban.tenBan}`;
    const tt = don ? 'DANG_PHUC_VU' : ban.trangThai; // bàn đã có đơn thì coi như đang phục vụ
    const nhan = $('nhan-ban');
    nhan.dataset.tt = tt;
    nhan.textContent = TEN_TT_BAN[tt] || tt;
    veThucDon();
    veDon();
    veGio();
  }

  // ---------- Thực đơn: món TAM_HET hiện xám, không chọn được ----------

  function taoTheMon(mon) {
    const het = mon.trangThai === 'TAM_HET';
    const the = tao('div', 'o-mon');
    the.dataset.monId = mon.monId;
    the.innerHTML = `<img alt="" loading="lazy" src="/assets/${ANH_MON[mon.tenMon] || ANH_MAC_DINH}">
        <span class="ten-mon"></span><span class="gia"></span>${het ? '<span class="nhan-het">Tạm hết</span>' : ''}
        <button type="button" class="btn btn-nho btn-chinh" data-hd="them">+ Thêm</button>`;
    the.querySelector('.ten-mon').textContent = mon.tenMon;
    the.querySelector('.gia').textContent = UI.tien(mon.gia);
    the.querySelector('[data-hd="them"]').setAttribute('aria-label', het ? `${mon.tenMon}, tạm hết` : `Thêm ${mon.tenMon}, ${UI.tien(mon.gia)}`);
    if (het) the.setAttribute('aria-disabled', 'true');
    return the;
  }

  function veThucDon() {
    const tuKhoa = boDau(oTim.value.trim());
    // Đang tìm kiếm thì tìm trên cả thực đơn (không giới hạn theo tab); không thì lọc theo tab đang chọn
    const ds = trangThai.thucDon.filter((m) => (tuKhoa
      ? boDau(m.tenMon).includes(tuKhoa)
      : nhomCuaMon(m.tenMon) === trangThai.nhom));
    if (!ds.length) {
      UI.trangThaiRong(dsThucDon, tuKhoa ? 'Không tìm thấy món phù hợp.' : 'Chưa có món nào trong nhóm này.');
      return;
    }
    const ul = tao('ul', 'luoi-mon');
    ds.forEach((mon) => ul.appendChild(boc(tao('li'), taoTheMon(mon))));
    dsThucDon.replaceChildren(ul);
  }

  // Thêm một phần vào giỏ: món đã có thì tăng số lượng, chưa có thì thêm dòng mới
  function themVaoGio(mon) {
    const dong = trangThai.gio.find((d) => d.monId === mon.monId);
    if (dong) dong.soLuong = Math.min(SO_LUONG_TOI_DA, (dong.soLuong || 0) + 1);
    else trangThai.gio.push({ monId: mon.monId, tenMon: mon.tenMon, gia: mon.gia, soLuong: 1, ghiChu: '' });
  }

  // ---------- Món đã gọi (UC04): sửa số lượng, hủy món khi còn CHO_PHA_CHE ----------

  function veDon() {
    const { don } = trangThai;
    $('tieu-de-don').classList.toggle('an', !don);
    if (!don) {
      khuDon.innerHTML = '<p class="rong-nho">Bàn chưa có đơn. Chọn món rồi bấm "Gửi bếp" để tạo order.</p>';
      return;
    }
    const khung = document.createDocumentFragment();
    if (don.isSynced === false) {
      khung.appendChild(tao('p', 'canh-bao', 'Bếp chưa xác nhận order này (quá 5 giây). Đơn vẫn đã được lưu, hãy báo quầy bếp kiểm tra.'));
    }
    const ul = tao('ul', 'ds-dong');
    don.dsMon.forEach((m) => ul.appendChild(taoDongDaGoi(m)));
    khung.appendChild(ul);

    const tong = tao('div', 'dong-tien');
    tong.innerHTML = '<span>Tổng đơn hiện tại</span><strong></strong>';
    tong.querySelector('strong').textContent = UI.tien(don.tongTien);
    khung.appendChild(tong);
    khuDon.replaceChildren(khung);
  }

  // Hàng sửa số lượng và hủy món; chỉ món CHO_PHA_CHE mới có
  function taoHangSua(m) {
    const idSl = `sua-sl-${m.chiTietId}`;
    const hang = tao('div', 'hang');
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
    const loi = tao('p', 'loi-o');
    loi.id = `loi-${idSl}`;
    return [hang, loi];
  }

  function taoDongDaGoi(m) {
    const li = tao('li', 'dong-mon');
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
    // Chỉ món CHO_PHA_CHE mới sửa / hủy được; DANG_LAM, DA_XONG, DA_HUY ẩn nút
    if (m.trangThaiCheBien === 'CHO_PHA_CHE') li.append(...taoHangSua(m));
    return li;
  }

  // Gọi API sửa / hủy, cập nhật lại đơn theo response (đơn đầy đủ)
  async function capNhatDon(goiApi, thongBaoThanhCong) {
    try {
      trangThai.don = await goiApi();
      veDon();
      capNhatTong();
      UI.toast(thongBaoThanhCong, 'thanh-cong');
    } catch (err) {
      if (daBaoLoi(err)) return;
      UI.toast(thongBaoLoi(err), 'loi', 5000);
      // Bếp vừa bắt đầu làm / món vừa bị hủy ở máy khác: tải lại để thấy trạng thái mới
      if (LOI_DON_DA_DOI.includes(err.maLoi)) await lamMoiDon({ ep: true });
      if (err.maLoi === 'DON_DA_THANH_TOAN') quayVeSoDo({ hoi: false });
    }
  }

  async function suaSoLuongDaGoi(mon, li, duongDan) {
    const o = li.querySelector('input');
    const soLuong = docSoLuong(o.value);
    if (soLuong === null) {
      datLoiO(o, THONG_BAO.SO_LUONG_KHONG_HOP_LE);
      o.focus();
      return;
    }
    if (soLuong === mon.soLuong) return; // không đổi gì thì khỏi gọi server
    await capNhatDon(() => Api.patch(duongDan, { soLuong }), `Đã đổi ${mon.tenMon} thành ${soLuong}.`);
  }

  async function huyMonDaGoi(mon, duongDan) {
    const dongY = await UI.xacNhan(`Hủy món ${mon.tenMon} × ${mon.soLuong}? Món sẽ bị trừ khỏi đơn.`, {
      tieuDe: 'Hủy món', nutChinh: 'Hủy món', nutPhu: 'Giữ lại', nguyHiem: true,
    });
    if (!dongY) return;
    await capNhatDon(() => Api.del(duongDan), `Đã hủy ${mon.tenMon}.`);
  }

  // ---------- Món mới (giỏ hàng) ----------

  function veGio() {
    if (!trangThai.gio.length) {
      gioHang.innerHTML = '<li class="rong-nho">Chọn món ở thực đơn để thêm vào đây.</li>';
    } else {
      gioHang.replaceChildren(...trangThai.gio.map(taoDongGio));
    }
    capNhatTong();
  }

  function taoDongGio(d, i) {
    const li = tao('li', 'dong-mon');
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

  function capNhatTong() {
    const tongGio = trangThai.gio.reduce((tong, d) => tong + (d.soLuong || 0) * d.gia, 0);
    $('tong-gio').textContent = UI.tien(tongGio);
    $('tong-don').textContent = UI.tien((trangThai.don ? trangThai.don.tongTien : 0) + tongGio);
    nutGuiBep.disabled = trangThai.dangGui;
    if (!trangThai.dangGui) nutGuiBep.textContent = trangThai.don ? 'Gọi thêm (gửi bếp)' : 'Gửi bếp';
  }

  // ---------- Gửi bếp: UC01 tạo order mới, UC04 gọi thêm vào đơn đang có ----------

  // Kiểm tra giỏ trước ở giao diện; server vẫn kiểm tra lại (SO_LUONG_KHONG_HOP_LE). Trả về false nếu có lỗi
  function kiemTraGio() {
    if (!trangThai.gio.length) {
      hienLoiGio(THONG_BAO.DS_MON_RONG);
      return false;
    }
    const iSai = trangThai.gio.findIndex((d) => d.soLuong === null);
    if (iSai >= 0) {
      hienLoiGio('Số lượng mỗi món phải từ 1 đến 99.');
      $(`sl-${iSai}`).focus();
      return false;
    }
    const monHet = trangThai.gio.find((d) => laMonHet(d.monId));
    if (monHet) {
      hienLoiGio(`Món ${monHet.tenMon} đã hết nguyên liệu, hãy bỏ món này.`);
      return false;
    }
    return true;
  }

  async function guiBep() {
    if (trangThai.dangGui) return; // chống bấm 2 lần
    anLoiGio();
    if (!kiemTraGio()) return;

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
      case 'MON_TAM_HET': // món vừa hết trong lúc đang chọn: tải lại thực đơn để làm xám
        hienLoiGio(thongBaoLoi(err));
        try {
          trangThai.thucDon = await Api.get('/menu');
        } catch (e) { /* giữ thực đơn cũ */ }
        veThucDon();
        veGio();
        break;
      case 'BAN_DA_CO_DON': // phục vụ khác vừa tạo đơn cho bàn này: chuyển sang gọi thêm, giữ giỏ
        try {
          trangThai.don = await layDonCuaBan(trangThai.ban.banId);
        } catch (e) { /* giữ nguyên */ }
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

  // ================= Tự làm mới =================

  async function lamMoiDon({ ep = false } = {}) {
    const don = trangThai.don;
    if (!don) return;
    let moi;
    try {
      moi = await Api.get(`/orders/${encodeURIComponent(don.donHangId)}`, { im: true });
    } catch (err) {
      return;
    }
    if (trangThai.don !== don) return; // đã đổi bàn hoặc vừa cập nhật trong lúc chờ
    if (moi.trangThai === 'DA_THANH_TOAN') {
      UI.toast(`Đơn bàn ${trangThai.ban.tenBan} đã được thanh toán.`);
      quayVeSoDo({ hoi: false });
      return;
    }
    if (!ep && JSON.stringify(moi) === JSON.stringify(don)) return; // không đổi thì khỏi vẽ lại
    // Đang gõ số lượng ở món đã gọi: để lần sau mới vẽ lại
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
    }, trangThai.ban ? CHU_KY_DON_MS : CHU_KY_SO_DO_MS);
  }

  // ================= Realtime SSE =================

  function ketNoiRealtime() {
    if (!('EventSource' in window)) return;
    const eventSource = new EventSource(`/api/pos/stream?token=${encodeURIComponent(Phien.token() || '')}`);
    eventSource.addEventListener('menu-updated', async () => {
      try {
        trangThai.thucDon = await Api.get('/menu');
        if (trangThai.ban) {
          veThucDon();
          veGio();
        }
        UI.toast('Thực đơn vừa được cập nhật từ kho!', '');
      } catch (_) {}
    });
    eventSource.addEventListener('table-updated', () => taiSoDo(true));
    eventSource.addEventListener('order-completed', () => {
      if (trangThai.ban) lamMoiDon({ ep: true });
    });
    window.addEventListener('beforeunload', () => eventSource.close());
  }

  // ================= Gắn sự kiện =================

  function ganSuKien() {
    luoiBan.addEventListener('click', (e) => {
      const nut = e.target.closest('.o-ban');
      if (!nut) return;
      const ban = trangThai.dsBan.find((b) => b.banId === nut.dataset.banId);
      if (ban) moBan(ban);
    });

    $('nut-quay-lai').addEventListener('click', () => quayVeSoDo());
    $('nut-tai-lai').addEventListener('click', () => taiSoDo());
    oTim.addEventListener('input', veThucDon);

    // Tab Cà phê / Trà / Bánh / Đá xay
    $('tab-nhom').addEventListener('click', (e) => {
      const nut = e.target.closest('[data-nhom]');
      if (!nut) return;
      trangThai.nhom = nut.dataset.nhom;
      document.querySelectorAll('#tab-nhom [data-nhom]').forEach((n) => n.setAttribute('aria-pressed', String(n === nut)));
      oTim.value = ''; // chọn tab thì bỏ từ khóa tìm kiếm để thấy đúng nhóm
      veThucDon();
    });

    dsThucDon.addEventListener('click', (e) => {
      const nutThem = e.target.closest('[data-hd="them"]'); // chỉ nút "+ Thêm" mới thêm món vào giỏ
      if (!nutThem) return;
      const mon = trangThai.thucDon.find((m) => m.monId === nutThem.closest('.o-mon').dataset.monId);
      if (!mon) return;
      if (mon.trangThai === 'TAM_HET') {
        UI.toast(`Món ${mon.tenMon} đã hết nguyên liệu.`, 'loi');
        return;
      }
      themVaoGio(mon);
      anLoiGio();
      veGio();
    });

    khuDon.addEventListener('click', async (e) => {
      const nut = e.target.closest('[data-hd]');
      if (!nut || !trangThai.don) return;
      const li = nut.closest('.dong-mon');
      const mon = trangThai.don.dsMon.find((m) => String(m.chiTietId) === li.dataset.chiTietId);
      if (!mon) return;
      const duongDan = `/orders/${encodeURIComponent(trangThai.don.donHangId)}/items/${encodeURIComponent(mon.chiTietId)}`;
      if (nut.dataset.hd === 'luu') await suaSoLuongDaGoi(mon, li, duongDan);
      if (nut.dataset.hd === 'huy') await huyMonDaGoi(mon, duongDan);
    });

    gioHang.addEventListener('click', (e) => {
      const nut = e.target.closest('[data-hd]');
      if (!nut) return;
      const i = Number(nut.closest('.dong-mon').dataset.i);
      const d = trangThai.gio[i];
      if (nut.dataset.hd === 'tang') d.soLuong = Math.min(SO_LUONG_TOI_DA, (d.soLuong || 0) + 1);
      if (nut.dataset.hd === 'giam') d.soLuong = Math.max(1, (d.soLuong || 2) - 1);
      if (nut.dataset.hd === 'bo') trangThai.gio.splice(i, 1);
      veGio();
      // Giữ focus ở nút vừa bấm sau khi vẽ lại
      const conLai = gioHang.querySelector(`[data-i="${i}"] [data-hd="${nut.dataset.hd}"]`);
      if (conLai) conLai.focus();
    });

    // Gõ số lượng / ghi chú: cập nhật trạng thái, không vẽ lại cả giỏ để không mất focus
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

    nutGuiBep.addEventListener('click', guiBep);
  }

  // ================= Khởi động =================
  ganSuKien();
  taiSoDo();
  batTuLamMoi();
  ketNoiRealtime();
})();
