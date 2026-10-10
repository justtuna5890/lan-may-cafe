(() => {
  const TRANG_THAI = {
    CHO_PHA_CHE: { nhan: 'Chờ pha chế', nut: 'Bắt đầu pha', tiepTheo: 'DANG_LAM' },
    DANG_LAM: { nhan: 'Đang pha chế', nut: 'Hoàn thành', tiepTheo: 'DA_XONG' },
    DA_XONG: { nhan: 'Hoàn thành' },
  };
  const state = { items: [], loc: 'TAT_CA', tuKhoa: '', dangCapNhat: new Set(), eventSource: null };
  const el = {};

  function khoiTao() {
    const phien = Phien.yeuCau('BARISTA');
    if (!phien) return;
    ['danh-sach-mon', 'loi-kds', 'trang-thai-ket-noi', 'thoi-diem-cap-nhat', 'dem-cho', 'dem-dang-lam', 'dem-tat-ca', 'tu-khoa', 'nut-lam-moi'].forEach((id) => { el[id] = document.getElementById(id); });
    document.querySelectorAll('[data-loc]').forEach((nut) => nut.addEventListener('click', () => chonLoc(nut.dataset.loc)));
    el['tu-khoa'].addEventListener('input', (event) => { state.tuKhoa = event.target.value.trim().toLocaleLowerCase('vi'); veDanhSach(); });
    el['nut-lam-moi'].addEventListener('click', () => taiDanhSach());
    taiDanhSach();
    ketNoiRealtime();
    window.addEventListener('beforeunload', () => state.eventSource?.close());
  }

  async function taiDanhSach(im = false) {
    datLoi('');
    el['danh-sach-mon'].setAttribute('aria-busy', 'true');
    try {
      const data = await Api.get('/kitchen/items', { im });
      state.items = Array.isArray(data) ? data : [];
      capNhatThoiDiem();
    } catch (error) {
      if (error.status === 403) datLoi('Bạn không có quyền truy cập màn hình bếp.');
      else if (error.status !== 401) datLoi(error.message || 'Không thể tải danh sách món.');
    } finally {
      el['danh-sach-mon'].setAttribute('aria-busy', 'false');
      veDanhSach();
    }
  }

  function chonLoc(loc) {
    state.loc = loc;
    document.querySelectorAll('[data-loc]').forEach((nut) => {
      const dangChon = nut.dataset.loc === loc;
      nut.classList.toggle('dang-chon', dangChon);
      nut.setAttribute('aria-pressed', String(dangChon));
    });
    veDanhSach();
  }

  function locItems() {
    return state.items.filter((item) => {
      const dungLoc = state.loc === 'TAT_CA' || item.trangThaiCheBien === state.loc;
      const tuKhoa = `${item.tenMon || ''} ${item.donHangId || ''} ${item.soBan || ''}`.toLocaleLowerCase('vi');
      return dungLoc && tuKhoa.includes(state.tuKhoa);
    });
  }

  function veDanhSach() {
    const danhSach = locItems();
    capNhatThongKe();
    el['danh-sach-mon'].replaceChildren();
    if (!danhSach.length) {
      UI.trangThaiRong(el['danh-sach-mon'], state.items.length ? 'Không có món phù hợp với bộ lọc.' : 'Chưa có món nào cần pha chế.');
      return;
    }
    danhSach.forEach((item) => el['danh-sach-mon'].appendChild(taoTheMon(item)));
  }

  function taoTheMon(item) {
    const thongTin = TRANG_THAI[item.trangThaiCheBien] || { nhan: item.trangThaiCheBien || 'Không xác định' };
    const card = tao('article', 'the kds-mon');
    card.dataset.trangThai = item.trangThaiCheBien || '';
    const dau = tao('div', 'kds-dau');
    dau.append(tao('p', 'kds-ma-don', `Đơn #${item.donHangId || item.chiTietId}`), tao('span', 'kds-ban', item.soBan ? `Bàn ${item.soBan}` : `Món #${item.chiTietId}`));
    card.append(dau, tao('h2', '', item.tenMon || 'Món chưa có tên'), tao('p', 'kds-so-luong', `Số lượng: ${item.soLuong || 0}`));
    if (item.ghiChu) { const ghiChu = tao('p', 'kds-ghi-chu'); ghiChu.append(tao('strong', '', 'Ghi chú: '), document.createTextNode(item.ghiChu)); card.appendChild(ghiChu); }
    const badge = tao('span', `kds-trang-thai ${item.trangThaiCheBien === 'DANG_LAM' ? 'dang-lam' : ''}`, thongTin.nhan);
    card.append(badge, tao('p', 'kds-thoi-gian', dinhDangThoiGian(item.ngayTao)));
    const actions = tao('div', 'kds-nut');
    if (thongTin.tiepTheo) actions.appendChild(taoNut(thongTin.nut, () => capNhatTrangThai(item, thongTin.tiepTheo), state.dangCapNhat.has(item.chiTietId), true));
    if (item.trangThaiCheBien === 'DANG_LAM') actions.appendChild(taoNut('Hoàn tác', () => hoanTac(item), state.dangCapNhat.has(item.chiTietId)));
    if (actions.childElementCount) card.appendChild(actions);
    return card;
  }

  async function capNhatTrangThai(item, trangThai) { await thucHien(item, () => Api.patch(`/kitchen/items/${encodeURIComponent(item.chiTietId)}/status`, { trangThai }), `Đã chuyển “${item.tenMon}” sang ${TRANG_THAI[trangThai]?.nhan || trangThai}.`); }
  async function hoanTac(item) { await thucHien(item, () => Api.post(`/kitchen/items/${encodeURIComponent(item.chiTietId)}/undo`, {}), `Đã hoàn tác “${item.tenMon}”.`); }
  async function thucHien(item, request, thongBao) {
    if (state.dangCapNhat.has(item.chiTietId)) return;
    state.dangCapNhat.add(item.chiTietId); veDanhSach(); datLoi('');
    try { await request(); UI.toast(thongBao, 'thanh-cong'); await taiDanhSach(true); }
    catch (error) { if (error.status === 403) datLoi('Bạn không có quyền thực hiện thao tác này.'); else if (error.status !== 401) datLoi(error.message || 'Không thể cập nhật trạng thái món.'); }
    finally { state.dangCapNhat.delete(item.chiTietId); veDanhSach(); }
  }

  function ketNoiRealtime() {
    if (!('EventSource' in window)) { datKetNoi('Trình duyệt không hỗ trợ cập nhật trực tiếp', false); return; }
    state.eventSource = new EventSource(`/api/kds/stream?token=${encodeURIComponent(Phien.token() || '')}`);
    state.eventSource.addEventListener('connected', () => datKetNoi('Đã kết nối trực tiếp', true));
    ['new-order', 'order-updated', 'item-cancelled'].forEach((eventName) => state.eventSource.addEventListener(eventName, () => taiDanhSach(true)));
    state.eventSource.onerror = () => datKetNoi('Mất kết nối trực tiếp — đang thử lại', false);
  }
  function datKetNoi(noiDung, thanhCong) { el['trang-thai-ket-noi'].textContent = noiDung; el['trang-thai-ket-noi'].classList.toggle('da-ket-noi', thanhCong); }
  function capNhatThongKe() { const dem = (trangThai) => state.items.filter((item) => item.trangThaiCheBien === trangThai).length; el['dem-cho'].textContent = dem('CHO_PHA_CHE'); el['dem-dang-lam'].textContent = dem('DANG_LAM'); el['dem-tat-ca'].textContent = state.items.length; }
  function datLoi(noiDung) { el['loi-kds'].textContent = noiDung; el['loi-kds'].classList.toggle('an', !noiDung); }
  function capNhatThoiDiem() { el['thoi-diem-cap-nhat'].textContent = `Cập nhật lúc ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`; }
  function dinhDangThoiGian(value) { if (!value) return 'Chưa có thời điểm tạo'; const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Chưa có thời điểm tạo' : `Tạo lúc ${date.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}`; }
  function tao(tag, className = '', noiDung) { const node = document.createElement(tag); node.className = className; if (noiDung !== undefined) node.textContent = noiDung; return node; }
  function taoNut(nhan, xuLy, disabled, chinh = false) { const nut = tao('button', `btn btn-nho${chinh ? ' btn-chinh' : ''}`, disabled ? 'Đang xử lý…' : nhan); nut.type = 'button'; nut.disabled = disabled; nut.addEventListener('click', xuLy); return nut; }
  khoiTao();
})();
