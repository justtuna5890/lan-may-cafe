// Component dùng chung (H1): toast, alert, popup xác nhận, trạng thái rỗng, loading, định dạng tiền, âm thanh
// Mọi trang đều nạp file này trước, nên tên hàm công khai ở cuối file phải giữ nguyên
const UI = (() => {
  // ===== Hàm phụ =====

  // Tạo phần tử mới với class và chữ (chữ gán bằng textContent nên không bị chèn HTML)
  function tao(thanh, lop, chu) {
    const el = document.createElement(thanh); // tạo thẻ, ví dụ 'div', 'button'
    if (lop) el.className = lop; // gán class nếu có
    if (chu !== undefined) el.textContent = chu; // gán chữ an toàn
    return el;
  }

  // Lấy vùng chứa theo id; chưa có thì tạo và gắn vào cuối trang (dùng cho toast, thanh loading)
  function layVung(id, taoMoi) {
    let el = document.getElementById(id); // tìm vùng đã có
    if (!el) {
      el = taoMoi(); // chưa có thì tạo mới
      document.body.appendChild(el);
    }
    return el;
  }

  // ===== Toast =====

  // Thông báo nhỏ góc phải, tự tắt. loai: 'thanh-cong' | 'loi' | ''
  function toast(noiDung, loai = '', thoiGian = 3500) {
    const khung = layVung('vung-toast', () => {
      const v = tao('div');
      v.id = 'vung-toast';
      v.setAttribute('role', 'status'); // trình đọc màn hình đọc thông báo mới
      v.setAttribute('aria-live', 'polite'); // đọc nhẹ nhàng, không ngắt lời đang đọc
      return v;
    });
    const t = tao('div', `toast ${loai}`, noiDung);
    khung.appendChild(t);
    setTimeout(() => t.remove(), thoiGian); // hết giờ thì gỡ khỏi trang
  }

  // ===== Popup =====

  // Dựng popup (thẻ dialog) gồm tiêu đề, nội dung, nút phụ (nếu có) và nút chính
  function dungPopup({ tieuDe, noiDung, nutChinh, nutPhu, nguyHiem }) {
    const dlg = tao('dialog', 'popup');
    dlg.setAttribute('aria-labelledby', 'popup-tieu-de'); // gắn nhãn cho trình đọc màn hình

    const h2 = tao('h2', '', tieuDe);
    h2.id = 'popup-tieu-de';
    const p = tao('p', '', noiDung);

    const hangNut = tao('div', 'hang-nut');
    const them = (chu, lop, kq) => { // thêm 1 nút; kq = '1' là nút chính, '0' là nút phụ
      const nut = tao('button', lop, chu);
      nut.type = 'button';
      nut.dataset.kq = kq;
      hangNut.appendChild(nut);
    };
    if (nutPhu) them(nutPhu, 'btn', '0'); // nút phụ đứng bên trái
    them(nutChinh, `btn ${nguyHiem ? 'btn-nguy-hiem' : 'btn-chinh'}`, '1');

    dlg.append(h2, p, hangNut);
    return dlg;
  }

  // Popup chung: trả về Promise<boolean> (true = bấm nút chính)
  function popup({ tieuDe, noiDung, nutChinh = 'OK', nutPhu = null, nguyHiem = false }) {
    return new Promise((resolve) => {
      const dlg = dungPopup({ tieuDe, noiDung, nutChinh, nutPhu, nguyHiem });

      const dong = (ketQua) => { // đóng, gỡ khỏi trang, rồi trả kết quả cho nơi gọi
        dlg.close();
        dlg.remove();
        resolve(ketQua);
      };
      dlg.addEventListener('click', (e) => {
        const nut = e.target.closest('[data-kq]'); // chỉ quan tâm click vào 2 nút
        if (nut) dong(nut.dataset.kq === '1');
      });
      dlg.addEventListener('cancel', (e) => { // phím Esc: coi như bấm nút phụ
        e.preventDefault();
        dong(false);
      });

      document.body.appendChild(dlg);
      dlg.showModal(); // hiện popup, chặn thao tác phía sau
    });
  }

  // Lỗi hệ thống (5xx): hộp thông báo phải bấm OK
  function alert(noiDung, tieuDe = 'Có lỗi xảy ra') {
    return popup({ tieuDe, noiDung });
  }

  // Hỏi lại trước thao tác quan trọng (hủy món, thanh toán...)
  function xacNhan(noiDung, { tieuDe = 'Xác nhận', nutChinh = 'Đồng ý', nutPhu = 'Quay lại', nguyHiem = false } = {}) {
    return popup({ tieuDe, noiDung, nutChinh, nutPhu, nguyHiem });
  }

  // ===== Trạng thái rỗng =====

  const ICON_RONG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16l-1.5 12h-13zM9 7V5h6v2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>'; // hình giỏ rỗng

  // Hiện "không có dữ liệu" trong một vùng
  function trangThaiRong(khung, noiDung) {
    const hop = tao('div', 'rong');
    hop.innerHTML = ICON_RONG; // hằng số của mình, không chứa dữ liệu người dùng
    hop.appendChild(tao('p', '', noiDung)); // chữ từ ngoài vào thì gán bằng textContent
    khung.replaceChildren(hop); // thay toàn bộ nội dung cũ của vùng
  }

  // ===== Loading =====

  // Đếm số request đang chạy; lớn hơn 0 thì hiện thanh loading
  let soDangTai = 0;
  function batLoading() {
    layVung('thanh-tai', () => {
      const v = tao('div');
      v.id = 'thanh-tai';
      v.setAttribute('aria-hidden', 'true'); // thanh trang trí, không cần đọc
      return v;
    });
    soDangTai += 1;
    document.body.classList.add('dang-tai');
  }
  function tatLoading() {
    soDangTai = Math.max(0, soDangTai - 1); // không để xuống số âm
    if (soDangTai === 0) document.body.classList.remove('dang-tai');
  }

  // ===== Định dạng tiền =====

  // Tiền VND: 90000 -> "90.000đ"
  function tien(soTien) {
    return `${Number(soTien || 0).toLocaleString('vi-VN')}đ`;
  }

  // ===== Âm thanh thông báo =====

  // Mỗi kiểu âm thanh là một danh sách "tiếng"; mỗi tiếng mô tả bằng số liệu, không viết lặp code
  //  tanSo: tần số bắt đầu (Hz) | tanSoCuoi: tần số kết thúc (nếu có, tiếng sẽ trượt lên)
  //  to: độ lớn lúc đầu | doDai: kéo dài bao lâu (giây) | tre: bắt đầu sau bao lâu (giây)
  const KIEU_AM_THANH = {
    chime: [ // 2 tiếng cho bếp: nốt Đô rồi nốt Sol
      { loai: 'triangle', tanSo: 523.25, to: 0.25, doDai: 0.5, tre: 0 },
      { loai: 'triangle', tanSo: 783.99, to: 0.25, doDai: 0.5, tre: 0.12 },
    ],
    ting: [ // 1 tiếng cho thu ngân: trượt lên
      { loai: 'sine', tanSo: 880, tanSoCuoi: 1320, to: 0.3, doDai: 0.7, tre: 0 },
    ],
  };

  // Phát 1 tiếng theo số liệu ở trên
  function phatTieng(ctx, tieng) {
    const batDau = ctx.currentTime + tieng.tre; // thời điểm bắt đầu
    const osc = ctx.createOscillator(); // nguồn tạo âm
    const gain = ctx.createGain(); // bộ chỉnh độ lớn
    osc.type = tieng.loai;
    osc.frequency.setValueAtTime(tieng.tanSo, batDau);
    if (tieng.tanSoCuoi) osc.frequency.exponentialRampToValueAtTime(tieng.tanSoCuoi, batDau + 0.08); // trượt lên nhanh
    gain.gain.setValueAtTime(tieng.to, batDau);
    gain.gain.exponentialRampToValueAtTime(0.001, batDau + tieng.doDai); // nhỏ dần cho êm tai
    osc.connect(gain);
    gain.connect(ctx.destination); // ra loa
    osc.start(batDau);
    osc.stop(batDau + tieng.doDai);
  }

  let audioCtx = null; // tạo một lần, dùng lại
  function amThanh(kieu = 'chime') {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return; // trình duyệt không hỗ trợ thì thôi
      if (!audioCtx) audioCtx = new AudioContextClass();
      if (audioCtx.state === 'suspended') audioCtx.resume(); // trình duyệt tự tắt tiếng cho tới khi người dùng bấm gì đó
      (KIEU_AM_THANH[kieu] || KIEU_AM_THANH.chime).forEach((tieng) => phatTieng(audioCtx, tieng)); // kiểu lạ thì dùng chime
    } catch (e) {
      // Bỏ qua nếu trình duyệt chặn âm thanh
    }
  }

  return { toast, alert, xacNhan, trangThaiRong, batLoading, tatLoading, tien, amThanh };
})();
