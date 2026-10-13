// =====================================================
// Trang Quản lý menu (UC22) - chỉ CHỦ QUÁN
// -----------------------------------------------------
// Gọi 3 API đã gắn ở routes/index.js (Bước 4):
//   GET   /api/menu-items       -> lấy thực đơn, vẽ bảng bên phải
//   POST  /api/menu-items       -> thêm món mới từ form bên trái
//   PATCH /api/menu-items/:id   -> sửa giá hoặc bật/tắt bán 1 món
// Dùng lại khung giao diện chung (H1):
//   Phien = đăng nhập + thanh menu, Api = gọi server (tự báo mất mạng / lỗi hệ thống),
//   UI = thông báo toast, trạng thái rỗng, định dạng tiền
// =====================================================
(() => {
  // Chưa đăng nhập -> về trang đăng nhập; không phải chủ quán -> về trang chủ của vai trò đó
  const phien = Phien.yeuCau('CHU_QUAN');
  if (!phien) return;

  // Giống luật trong MenuService. Server vẫn kiểm tra lại, ở đây chỉ để báo lỗi sớm cho người dùng
  const GIA_TOI_DA = 10000000;
  const TEN_TRANG_THAI = { CON_HANG: 'Đang bán', TAM_HET: 'Tạm hết' };

  // Lỗi mất mạng hoặc lỗi server (5xx): api.js đã tự hiện thông báo rồi, trang không báo thêm
  const daBaoLoi = (err) => err.maLoi === 'MAT_KET_NOI' || err.status >= 500;

  // Lấy các phần tử trên trang theo id (đặt trong quan-ly-menu.html)
  const $ = (id) => document.getElementById(id);
  const khuBang = $('khu-bang');
  const oTim = $('o-tim');
  const form = $('form-them');
  const oTen = $('ten-mon');
  const oGia = $('gia-mon');
  const nutThem = $('nut-them');

  // Danh sách món đang có, lấy từ server
  let dsMon = [];

  // ================= Tiện ích =================

  // Bỏ dấu tiếng Việt để gõ "tra dao" vẫn tìm ra "Trà đào"
  function boDau(chuoi) {
    return chuoi.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();
  }

  // Đọc giá từ ô nhập: trả về số nguyên từ 1 đến 10.000.000, sai thì trả về null
  function docGia(chuoi) {
    const n = Number(chuoi);
    return chuoi !== '' && Number.isInteger(n) && n >= 1 && n <= GIA_TOI_DA ? n : null;
  }

  // Hiện hoặc xóa lỗi ngay dưới 1 ô nhập (ô có aria-describedby trỏ tới chỗ hiện lỗi)
  function datLoi(o, noiDung) {
    o.setAttribute('aria-invalid', noiDung ? 'true' : 'false');
    const p = document.getElementById(o.getAttribute('aria-describedby'));
    if (p) p.textContent = noiDung;
  }

  // ================= Bảng thực đơn =================

  // Lấy thực đơn từ server rồi vẽ lại bảng
  async function taiThucDon() {
    try {
      dsMon = await Api.get('/menu-items');
      veBang();
    } catch (err) {
      if (!daBaoLoi(err)) UI.toast(err.message || 'Không tải được thực đơn.', 'loi');
      if (!dsMon.length) UI.trangThaiRong(khuBang, 'Không tải được thực đơn.');
    }
  }

  // Vẽ bảng theo ô tìm kiếm: mỗi món là 1 dòng
  function veBang() {
    const tuKhoa = boDau(oTim.value.trim());
    const ds = dsMon.filter((m) => !tuKhoa || boDau(m.tenMon).includes(tuKhoa));
    $('tieu-de-thuc-don').textContent = `Thực đơn (${dsMon.length} món)`;

    if (!ds.length) {
      UI.trangThaiRong(khuBang, tuKhoa ? 'Không tìm thấy món phù hợp.' : 'Thực đơn đang trống.');
      return;
    }

    const bang = document.createElement('table');
    bang.className = 'bang-menu';
    bang.innerHTML = `
      <thead><tr>
        <th scope="col">Tên món</th><th scope="col">Giá (đ)</th><th scope="col">Trạng thái</th><th scope="col">Bán</th>
      </tr></thead>
      <tbody></tbody>`;
    const tbody = bang.querySelector('tbody');
    ds.forEach((m) => tbody.appendChild(taoDong(m)));
    khuBang.replaceChildren(bang);
  }

  // Tạo 1 dòng cho 1 món: tên | ô giá + nút Lưu | nhãn trạng thái | nút Tắt bán / Bật bán
  // Chữ do người dùng nhập (tên món) luôn gán bằng textContent để không chạy được mã độc HTML
  function taoDong(m) {
    const tr = document.createElement('tr');
    tr.dataset.monId = m.monId;
    if (m.trangThai === 'TAM_HET') tr.classList.add('tam-het');

    const idGia = `gia-${m.monId}`;
    tr.innerHTML = `
      <td class="ten"></td>
      <td>
        <div class="o-gia">
          <label class="sr-only" for="${idGia}"></label>
          <input type="number" id="${idGia}" min="1" max="${GIA_TOI_DA}" step="1000" inputmode="numeric" aria-describedby="loi-${idGia}">
          <button type="button" class="btn btn-nho" data-hd="luu-gia">Lưu</button>
        </div>
        <p class="loi-o" id="loi-${idGia}"></p>
      </td>
      <td><span class="nhan-ban"></span></td>
      <td><button type="button" class="btn btn-nho" data-hd="doi-trang-thai"></button></td>`;

    tr.querySelector('.ten').textContent = m.tenMon;
    tr.querySelector('label').textContent = `Giá ${m.tenMon}`;
    tr.querySelector('input').value = m.gia;

    const nhan = tr.querySelector('.nhan-ban');
    nhan.dataset.tt = m.trangThai;
    nhan.textContent = TEN_TRANG_THAI[m.trangThai] || m.trangThai;

    // Đang bán -> nút đỏ "Tắt bán"; đang tạm hết -> nút "Bật bán"
    const dangBan = m.trangThai === 'CON_HANG';
    const nutDoi = tr.querySelector('[data-hd="doi-trang-thai"]');
    nutDoi.textContent = dangBan ? 'Tắt bán' : 'Bật bán';
    nutDoi.setAttribute('aria-label', `${dangBan ? 'Tắt bán' : 'Bật bán'} ${m.tenMon}`);
    if (dangBan) nutDoi.classList.add('btn-nguy-hiem');
    return tr;
  }

  // Bấm nút trong bảng: "Lưu" (sửa giá) hoặc "Tắt bán / Bật bán"
  // Dùng 1 bộ lắng nghe chung cho cả bảng (event delegation) vì bảng được vẽ lại nhiều lần
  khuBang.addEventListener('click', async (e) => {
    const nut = e.target.closest('[data-hd]');
    if (!nut) return;
    const tr = nut.closest('tr');
    const mon = dsMon.find((m) => m.monId === tr.dataset.monId);
    if (!mon) return;

    if (nut.dataset.hd === 'luu-gia') {
      const o = tr.querySelector('input');
      const gia = docGia(o.value.trim());
      if (gia === null) {
        datLoi(o, 'Giá từ 1 đến 10.000.000 đồng');
        o.focus();
        return;
      }
      if (gia === mon.gia) return; // giá không đổi thì không gọi server
      await capNhatMon(mon, { gia }, `Đã đổi giá "${mon.tenMon}" thành ${UI.tien(gia)}.`, nut);
    }

    if (nut.dataset.hd === 'doi-trang-thai') {
      const trangThai = mon.trangThai === 'CON_HANG' ? 'TAM_HET' : 'CON_HANG';
      const thongBao = trangThai === 'TAM_HET'
        ? `Đã tắt bán "${mon.tenMon}". Màn gọi món sẽ hiện món này là tạm hết.`
        : `Đã bật bán lại "${mon.tenMon}".`;
      await capNhatMon(mon, { trangThai }, thongBao, nut);
    }
  });

  // Gõ lại giá thì xóa chữ báo lỗi dưới ô
  khuBang.addEventListener('input', (e) => {
    if (e.target.type === 'number') datLoi(e.target, '');
  });

  // Gửi PATCH /api/menu-items/:id, thành công thì cập nhật món trong danh sách rồi vẽ lại bảng
  async function capNhatMon(mon, duLieu, thongBao, nut) {
    nut.disabled = true; // chống bấm 2 lần khi đang gửi
    try {
      const moi = await Api.patch(`/menu-items/${encodeURIComponent(mon.monId)}`, duLieu);
      Object.assign(mon, moi);
      veBang();
      UI.toast(thongBao, 'thanh-cong');
    } catch (err) {
      if (!daBaoLoi(err)) UI.toast(err.message || 'Không cập nhật được món.', 'loi', 5000);
      if (err.maLoi === 'MON_KHONG_TON_TAI') taiThucDon(); // món vừa bị xóa ở nơi khác: tải lại
    } finally {
      nut.disabled = false;
    }
  }

  // ================= Form thêm món mới =================

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); // không để trình duyệt tự tải lại trang khi bấm "Thêm món"
    datLoi(oTen, '');
    datLoi(oGia, '');

    // Kiểm tra trước ở giao diện, báo lỗi ngay dưới ô
    const tenMon = oTen.value.trim();
    const gia = docGia(oGia.value.trim());
    let hopLe = true;
    if (gia === null) {
      datLoi(oGia, 'Giá phải là số nguyên từ 1 đến 10.000.000 đồng');
      oGia.focus();
      hopLe = false;
    }
    if (!tenMon) {
      datLoi(oTen, 'Vui lòng nhập tên món');
      oTen.focus();
      hopLe = false;
    }
    if (!hopLe) return;

    nutThem.disabled = true; // chống bấm 2 lần tạo 2 món
    nutThem.textContent = 'Đang thêm…';
    try {
      const mon = await Api.post('/menu-items', { tenMon, gia });
      UI.toast(`Đã thêm "${mon.tenMon}" vào thực đơn.`, 'thanh-cong');
      form.reset();
      oTim.value = '';
      await taiThucDon();
      oTen.focus();
    } catch (err) {
      if (daBaoLoi(err)) return;
      // Lỗi từ server (MenuService): đặt chữ báo lỗi dưới đúng ô
      if (err.maLoi === 'GIA_KHONG_HOP_LE') datLoi(oGia, err.message);
      else if (err.maLoi && err.maLoi.startsWith('TEN_MON')) datLoi(oTen, err.message);
      else UI.toast(err.message || 'Không thêm được món.', 'loi');
    } finally {
      nutThem.disabled = false;
      nutThem.textContent = 'Thêm món';
    }
  });

  // Gõ lại thì xóa chữ báo lỗi
  oTen.addEventListener('input', () => datLoi(oTen, ''));
  oGia.addEventListener('input', () => datLoi(oGia, ''));

  // ================= Khởi động trang =================
  oTim.addEventListener('input', veBang);
  $('nut-tai-lai').addEventListener('click', taiThucDon);
  taiThucDon();
})();