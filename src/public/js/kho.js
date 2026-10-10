(() => {
  const state = { items: [], loc: 'TAT_CA', tuKhoa: '', dangCapNhat: new Set(), formDangMo: null };
  const el = {};

  function khoiTao() {
    if (!Phien.yeuCau('BARISTA')) return;
    ['danh-sach-nguyen-lieu', 'loi-kho', 'thoi-diem-cap-nhat', 'dem-tat-ca', 'dem-con-hang', 'dem-het-hang', 'tu-khoa', 'nut-lam-moi'].forEach((id) => { el[id] = document.getElementById(id); });
    document.querySelectorAll('[data-loc]').forEach((nut) => nut.addEventListener('click', () => chonLoc(nut.dataset.loc)));
    el['tu-khoa'].addEventListener('input', (event) => { state.tuKhoa = event.target.value.trim().toLocaleLowerCase('vi'); veDanhSach(); });
    el['nut-lam-moi'].addEventListener('click', () => taiDanhSach());
    taiDanhSach();
  }

  async function taiDanhSach(im = false) {
    datLoi('');
    el['danh-sach-nguyen-lieu'].setAttribute('aria-busy', 'true');
    if (!state.items.length) hienTrangThai('Đang tải danh sách nguyên liệu…');
    try {
      const data = await Api.get('/inventory', { im });
      state.items = Array.isArray(data) ? data : [];
      el['thoi-diem-cap-nhat'].textContent = `Cập nhật lúc ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    } catch (error) {
      if (error.status === 403) datLoi('Bạn không có quyền truy cập quản lý kho.');
      else if (error.status !== 401) datLoi(error.message || 'Không thể tải danh sách nguyên liệu.');
    } finally {
      el['danh-sach-nguyen-lieu'].setAttribute('aria-busy', 'false');
      veDanhSach();
    }
  }

  function chonLoc(loc) {
    state.loc = loc;
    document.querySelectorAll('[data-loc]').forEach((nut) => { const dangChon = nut.dataset.loc === loc; nut.classList.toggle('dang-chon', dangChon); nut.setAttribute('aria-pressed', String(dangChon)); });
    veDanhSach();
  }

  function laHetHang(item) { return Number(item.tonKho) <= 0; }
  function itemsDaLoc() {
    return state.items.filter((item) => {
      const hetHang = laHetHang(item);
      const dungLoc = state.loc === 'TAT_CA' || (state.loc === 'HET_HANG' ? hetHang : !hetHang);
      return dungLoc && `${item.tenNguyenLieu || ''} ${item.id || ''}`.toLocaleLowerCase('vi').includes(state.tuKhoa);
    });
  }

  function veDanhSach() {
    const items = itemsDaLoc();
    capNhatThongKe();
    el['danh-sach-nguyen-lieu'].replaceChildren();
    if (!items.length) { UI.trangThaiRong(el['danh-sach-nguyen-lieu'], state.items.length ? 'Không có nguyên liệu phù hợp với bộ lọc.' : 'Chưa có nguyên liệu trong kho.'); return; }
    items.forEach((item) => el['danh-sach-nguyen-lieu'].appendChild(taoThe(item)));
  }

  function hienTrangThai(noiDung) { el['danh-sach-nguyen-lieu'].replaceChildren(tao('p', 'rong', noiDung)); }
  function capNhatThongKe() { const het = state.items.filter(laHetHang).length; el['dem-tat-ca'].textContent = state.items.length; el['dem-het-hang'].textContent = het; el['dem-con-hang'].textContent = state.items.length - het; }

  function taoThe(item) {
    const hetHang = laHetHang(item); const dangXuLy = state.dangCapNhat.has(item.id);
    const card = tao('article', 'the kho-nguyen-lieu'); card.dataset.hetHang = String(hetHang); card.dataset.id = item.id || '';
    const dau = tao('div', 'kho-dau'); const thongTin = tao('div'); thongTin.append(tao('h2', '', item.tenNguyenLieu || 'Nguyên liệu chưa có tên'), tao('p', 'kho-ma', `Mã: ${item.id || '—'}`));
    dau.append(thongTin, tao('span', `kho-trang-thai${hetHang ? ' het-hang' : ''}`, hetHang ? 'Hết hàng' : 'Còn hàng'));
    const ton = tao('p', 'kho-ton'); ton.append(document.createTextNode('Tồn kho: '), tao('strong', '', dinhDangSo(item.tonKho)), document.createTextNode(` ${item.donViTinh || ''}`));
    const actions = tao('div', 'kho-hanh-dong');
    if (!hetHang) actions.appendChild(taoNut('Đánh dấu hết', () => danhDauHet(item), dangXuLy, 'btn-nguy-hiem'));
    actions.append(taoNut('Nhập thêm', () => moForm(item.id, 'restock'), dangXuLy), taoNut('Xuất kho', () => moForm(item.id, 'issue'), dangXuLy));
    card.append(dau, ton, actions);
    if (state.formDangMo && state.formDangMo.id === item.id) card.appendChild(taoForm(item, state.formDangMo.loai, dangXuLy));
    return card;
  }

  function taoForm(item, loai, dangXuLy) {
    const form = tao('form', 'kho-form-nhap'); const nhan = loai === 'restock' ? 'Số lượng nhập thêm' : 'Số lượng xuất';
    const label = tao('label', '', nhan); const input = document.createElement('input'); input.type = 'number'; input.name = 'soLuong'; input.min = '0.000001'; input.step = 'any'; input.required = true; input.inputMode = 'decimal'; label.appendChild(input);
    const submit = taoNut(dangXuLy ? 'Đang xử lý…' : (loai === 'restock' ? 'Xác nhận nhập' : 'Xác nhận xuất'), () => {}, dangXuLy, 'btn-chinh'); submit.type = 'submit';
    const huy = taoNut('Đóng', () => { state.formDangMo = null; veDanhSach(); }, dangXuLy);
    form.append(label, submit, huy); form.addEventListener('submit', (event) => { event.preventDefault(); capNhatSoLuong(item, loai, input.value); }); return form;
  }

  function moForm(id, loai) { state.formDangMo = { id, loai }; veDanhSach(); const card = Array.from(el['danh-sach-nguyen-lieu'].querySelectorAll('article')).find((node) => node.dataset.id === id); const input = card && card.querySelector('.kho-form-nhap input'); if (input) input.focus(); }
  async function danhDauHet(item) {
    const dongY = await UI.xacNhan(`Tồn kho “${item.tenNguyenLieu}” sẽ được đưa về 0. Các món dùng nguyên liệu này có thể chuyển sang tạm hết.`, { tieuDe: 'Đánh dấu hết nguyên liệu', nutChinh: 'Đánh dấu hết', nguyHiem: true });
    if (dongY) await thucHien(item.id, () => Api.patch(`/inventory/${encodeURIComponent(item.id)}/out-of-stock`), `Đã đánh dấu hết “${item.tenNguyenLieu}”.`);
  }
  async function capNhatSoLuong(item, loai, giaTri) {
    const soLuong = Number(giaTri);
    if (!Number.isFinite(soLuong) || soLuong <= 0) { datLoi('Số lượng phải là số lớn hơn 0.'); return; }
    const endpoint = loai === 'restock' ? 'restock' : 'issue'; const nhan = loai === 'restock' ? 'Đã nhập thêm' : 'Đã xuất';
    await thucHien(item.id, () => Api.post(`/inventory/${encodeURIComponent(item.id)}/${endpoint}`, { soLuong }), `${nhan} ${dinhDangSo(soLuong)} ${item.donViTinh || ''} “${item.tenNguyenLieu}”.`);
  }
  async function thucHien(id, request, thongBao) {
    if (state.dangCapNhat.has(id)) return; state.dangCapNhat.add(id); datLoi(''); veDanhSach();
    try { await request(); state.formDangMo = null; UI.toast(thongBao, 'thanh-cong'); await taiDanhSach(true); }
    catch (error) { if (error.status === 403) datLoi('Bạn không có quyền thực hiện thao tác này.'); else if (error.status !== 401) datLoi(error.message || 'Không thể cập nhật kho.'); }
    finally { state.dangCapNhat.delete(id); veDanhSach(); }
  }
  function datLoi(noiDung) { el['loi-kho'].textContent = noiDung; el['loi-kho'].classList.toggle('an', !noiDung); }
  function dinhDangSo(value) { return Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits: 3 }); }
  function tao(tag, className = '', noiDung) { const node = document.createElement(tag); node.className = className; if (noiDung !== undefined) node.textContent = noiDung; return node; }
  function taoNut(nhan, xuLy, disabled, themClass = '') { const nut = tao('button', `btn btn-nho ${themClass}`, nhan); nut.type = 'button'; nut.disabled = disabled; nut.addEventListener('click', xuLy); return nut; }
  khoiTao();
})();
