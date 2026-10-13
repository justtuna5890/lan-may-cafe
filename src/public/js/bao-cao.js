// =====================================================
// Trang Báo cáo doanh thu (UC24) - chỉ CHỦ QUÁN
// Gọi GET /api/reports/revenue?tuNgay=...&denNgay=... rồi vẽ: 3 số lớn, tiền mặt/QR, top món, từng ngày
// =====================================================
(() => {
  const phien = Phien.yeuCau('CHU_QUAN'); // chưa đăng nhập -> về trang đăng nhập; sai vai trò -> về trang của mình
  if (!phien) return; // không được vào thì dừng, không chạy phần dưới

  const TEN_PT = { TIEN_MAT: 'Tiền mặt', QR: 'Chuyển khoản QR' }; // tên tiếng Việt của phương thức
  const daBaoLoi = (err) => err.maLoi === 'MAT_KET_NOI' || err.status >= 500; // lỗi mạng / lỗi server: api.js đã tự báo

  const $ = (id) => document.getElementById(id); // lấy phần tử theo id cho gọn
  const oTu = $('tu-ngay'); // ô "Từ ngày"
  const oDen = $('den-ngay'); // ô "Đến ngày"
  const loiLoc = $('loi-loc'); // chỗ báo lỗi ngày

  // ================= Tiện ích ngày =================
  function chuoiNgay(d) { // Date -> 'YYYY-MM-DD' theo giờ máy
    const p = (n) => String(n).padStart(2, '0'); // 5 -> '05'
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; // tháng đếm từ 0 nên +1
  }

  function congNgay(d, soNgay) { // trả về ngày mới = d cộng thêm soNgay ngày (số âm = lùi lại)
    const moi = new Date(d); // sao chép, không sửa ngày gốc
    moi.setDate(moi.getDate() + soNgay); // JavaScript tự lo qua tháng, qua năm
    return moi;
  }

  function hienNgay(chuoi) { // '2026-10-13' -> '13/10/2026' cho dễ đọc
    const [y, m, d] = chuoi.split('-'); // tách năm, tháng, ngày
    return `${d}/${m}/${y}`;
  }

  // ================= Báo lỗi =================
  function hienLoi(noiDung) { // hiện khung lỗi đỏ dưới hàng chọn ngày
    loiLoc.textContent = noiDung;
    loiLoc.classList.remove('an'); // bỏ class "an" (ẩn) để hiện ra
  }

  function anLoi() { // ẩn khung lỗi
    loiLoc.classList.add('an');
  }

  // ================= Lấy báo cáo =================
  async function taiBaoCao() {
    anLoi(); // xóa lỗi cũ
    const tuNgay = oTu.value; // ô date trả chuỗi 'YYYY-MM-DD' hoặc '' nếu bỏ trống
    const denNgay = oDen.value || tuNgay; // bỏ trống "Đến ngày" -> xem đúng 1 ngày
    if (!tuNgay) { // chưa chọn "Từ ngày"
      hienLoi('Vui lòng chọn "Từ ngày".');
      oTu.focus();
      return;
    }
    if (tuNgay > denNgay) { // so sánh chuỗi 'YYYY-MM-DD' đúng thứ tự ngày
      hienLoi('"Từ ngày" không được sau "Đến ngày".');
      oDen.focus();
      return;
    }

    try {
      const tham = new URLSearchParams({ tuNgay, denNgay }); // tạo phần ?tuNgay=...&denNgay=... an toàn
      const bc = await Api.get(`/reports/revenue?${tham}`); // gọi API UC24 (Bước 4)
      veBaoCao(bc); // vẽ kết quả lên trang
    } catch (err) {
      if (daBaoLoi(err)) return; // api.js đã báo rồi
      hienLoi(err.message || 'Không tải được báo cáo.'); // lỗi từ server, ví dụ quá 366 ngày
    }
  }

  // ================= Vẽ báo cáo =================
  function veBaoCao(bc) {
    $('so-doanh-thu').textContent = UI.tien(bc.doanhThu); // 250000 -> '250.000đ'
    $('so-don').textContent = bc.soDon; // số đơn
    $('so-trung-binh').textContent = UI.tien(bc.trungBinhDon); // trung bình mỗi đơn
    veBangPhuongThuc(bc);
    veBangTopMon(bc.topMon);
    veBangTheoNgay(bc.theoNgay);
  }

  function taoBang(tieuDeCot, cacDong) { // tạo <table> từ tiêu đề cột + mảng dòng; mỗi ô là { chu, phai? }
    const bang = document.createElement('table');
    bang.className = 'bang-bc';
    const thead = bang.createTHead().insertRow(); // dòng tiêu đề
    tieuDeCot.forEach((c) => { // từng tiêu đề cột
      const th = document.createElement('th');
      th.scope = 'col'; // cho máy đọc màn hình biết đây là tiêu đề cột
      th.textContent = c.chu;
      if (c.phai) th.className = 'so-phai'; // cột số canh phải
      thead.appendChild(th);
    });
    const tbody = bang.createTBody();
    cacDong.forEach((dong) => { // từng dòng dữ liệu
      const tr = tbody.insertRow();
      dong.forEach((o) => { // từng ô
        const td = tr.insertCell();
        if (o.phanTu) td.appendChild(o.phanTu); // ô chứa phần tử (thanh ngang)
        else td.textContent = o.chu; // ô chữ; textContent để tên món không chạy được mã HTML
        if (o.phai) td.className = 'so-phai';
        if (o.lop) td.classList.add(o.lop);
      });
    });
    return bang;
  }

  function veBangPhuongThuc(bc) { // bảng Tiền mặt / QR + tỉ lệ %
    const cacDong = bc.theoPhuongThuc.map((pt) => [
      { chu: TEN_PT[pt.phuongThuc] || pt.phuongThuc }, // tên phương thức
      { chu: pt.soDon, phai: true }, // số đơn
      { chu: UI.tien(pt.doanhThu), phai: true }, // tiền
      { chu: bc.doanhThu ? `${Math.round((pt.doanhThu / bc.doanhThu) * 100)}%` : '0%', phai: true }, // phần trăm trên tổng; tổng = 0 thì 0%
    ]);
    $('khu-pt').replaceChildren(taoBang(
      [{ chu: 'Phương thức' }, { chu: 'Số đơn', phai: true }, { chu: 'Doanh thu', phai: true }, { chu: 'Tỉ lệ', phai: true }],
      cacDong,
    ));
  }

  function veBangTopMon(topMon) { // bảng 5 món bán chạy
    if (!topMon.length) { // chưa bán được món nào
      UI.trangThaiRong($('khu-top'), 'Chưa có món nào được bán trong khoảng này.');
      return;
    }
    const cacDong = topMon.map((m, i) => [
      { chu: i + 1 }, // hạng 1, 2, 3...
      { chu: m.tenMon }, // tên món
      { chu: m.soLuong, phai: true }, // số ly/cái đã bán
      { chu: UI.tien(m.doanhThu), phai: true }, // tiền thu từ món
    ]);
    $('khu-top').replaceChildren(taoBang(
      [{ chu: '#' }, { chu: 'Món' }, { chu: 'Đã bán', phai: true }, { chu: 'Doanh thu', phai: true }],
      cacDong,
    ));
  }

  function veBangTheoNgay(theoNgay) { // bảng từng ngày + thanh ngang so sánh
    if (!theoNgay.length) { // không có ngày nào có doanh thu
      UI.trangThaiRong($('khu-ngay'), 'Chưa có doanh thu trong khoảng này.');
      return;
    }
    const lonNhat = Math.max(...theoNgay.map((n) => n.doanhThu)); // ngày nhiều tiền nhất = thanh dài 100%
    const cacDong = theoNgay.map((n) => {
      const thanh = document.createElement('div'); // thanh ngang màu cam
      thanh.className = 'thanh';
      thanh.style.width = `${lonNhat ? (n.doanhThu / lonNhat) * 100 : 0}%`; // dài theo tỉ lệ với ngày lớn nhất
      return [
        { chu: hienNgay(n.ngay) }, // ngày dạng dd/mm/yyyy
        { chu: n.soDon, phai: true }, // số đơn trong ngày
        { chu: UI.tien(n.doanhThu), phai: true }, // doanh thu trong ngày
        { phanTu: thanh, lop: 'o-thanh' }, // ô chứa thanh ngang
      ];
    });
    $('khu-ngay').replaceChildren(taoBang(
      [{ chu: 'Ngày' }, { chu: 'Số đơn', phai: true }, { chu: 'Doanh thu', phai: true }, { chu: '' }],
      cacDong,
    ));
  }

  // ================= Nút chọn nhanh =================
  function chonKhoang(tu, den) { // điền 2 ô ngày rồi tải báo cáo luôn
    oTu.value = chuoiNgay(tu);
    oDen.value = chuoiNgay(den);
    taiBaoCao();
  }

  document.querySelector('.bo-loc').addEventListener('click', (e) => { // 1 bộ lắng nghe cho cả 3 nút nhanh
    const nut = e.target.closest('[data-nhanh]'); // nút được bấm (nếu có)
    if (!nut) return;
    const homNay = new Date();
    if (nut.dataset.nhanh === 'hom-nay') chonKhoang(homNay, homNay); // chỉ hôm nay
    if (nut.dataset.nhanh === '7-ngay') chonKhoang(congNgay(homNay, -6), homNay); // 6 ngày trước + hôm nay = 7 ngày
    if (nut.dataset.nhanh === 'thang-nay') chonKhoang(new Date(homNay.getFullYear(), homNay.getMonth(), 1), homNay); // từ ngày 1 đầu tháng
  });

  $('form-loc').addEventListener('submit', (e) => { // bấm "Xem báo cáo"
    e.preventDefault(); // không để trình duyệt tải lại trang
    taiBaoCao();
  });

  // ================= Khởi động =================
  const homNay = new Date();
  chonKhoang(homNay, homNay); // mở trang là xem ngay báo cáo hôm nay
})();