const AppError = require('../utils/AppError');
const config = require('../config');
const { withTransaction } = require('../config/db');
const BanRepository = require('../repositories/BanRepository');
const MonAnRepository = require('../repositories/MonAnRepository');
const DonHangRepository = require('../repositories/DonHangRepository');
const KdsService = require('./KdsService');

class OrderService {
  // Kiem tra o server, khong chi o giao dien (TC-01-04..06, TC-01-11)
  static kiemTraDauVao(dto) {
    if (!dto || typeof dto.banId !== 'string' || !dto.banId) {
      throw new AppError('DU_LIEU_KHONG_HOP_LE', 'Thieu ma ban', 400);
    }
    OrderService.kiemTraDsMon(dto.dsMon);
  }

  static kiemTraSoLuong(soLuong) {
    if (!Number.isInteger(soLuong) || soLuong < 1 || soLuong > 99) {
      throw new AppError('SO_LUONG_KHONG_HOP_LE', 'So luong phai tu 1 den 99', 400);
    }
  }

  // Dung chung cho UC01 (tao order) va UC04 (goi them)
  static kiemTraDsMon(dsMon) {
    if (!Array.isArray(dsMon) || dsMon.length === 0) {
      throw new AppError('DS_MON_RONG', 'Gio hang dang trong', 400);
    }
    for (const m of dsMon) OrderService.kiemTraSoLuong(m.soLuong);
  }

  // Tra ve danh sach mon day du (ten, gia) neu tat ca con hang
  static async kiemTraTonKho(dsMon) {
    const ketQua = [];
    for (const m of dsMon) {
      const mon = await MonAnRepository.findById(m.monId);
      if (!mon) throw new AppError('MON_KHONG_TON_TAI', 'Khong tim thay mon', 404);
      if (mon.trangThai === 'TAM_HET') {
        throw new AppError('MON_TAM_HET', `Mon ${mon.tenMon} da het nguyen lieu`, 409);
      }
      ketQua.push({
        monId: mon.monId, tenMon: mon.tenMon, donGia: mon.gia,
        soLuong: m.soLuong, ghiChu: m.ghiChu || null, trangThaiCheBien: 'CHO_PHA_CHE',
      });
    }
    return ketQua;
  }

  static async kiemTraDieuKienOrder(ban) {
    if (ban.trangThai === 'CAN_DON') {
      throw new AppError('BAN_CAN_DON', 'Ban dang can don, khong the goi mon', 409);
    }
    const donHienTai = await DonHangRepository.findDangPhucVuByBan(ban.banId);
    if (donHienTai) {
      throw new AppError('BAN_DA_CO_DON', 'Ban da co don, hay dung chuc nang goi them', 409);
    }
  }

  static tinhTongTien(dsMon) {
    return dsMon.reduce((tong, m) => tong + m.soLuong * m.donGia, 0);
  }

  // true neu bep nhan duoc; qua KDS_TIMEOUT_MS thi false (isSynced=false), don van duoc luu
  static async guiOrderDenKDS(order) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('KDS_TIMEOUT')), config.kdsTimeoutMs);
    });
    try {
      await Promise.race([KdsService.guiOrder(order), timeout]);
      return true;
    } catch (err) {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  static async xuLyTaoOrder(orderDTO) {
    OrderService.kiemTraDauVao(orderDTO);

    const ban = await BanRepository.findById(orderDTO.banId);
    if (!ban) throw new AppError('BAN_KHONG_TON_TAI', 'Khong tim thay ban', 404);

    const dsMon = await OrderService.kiemTraTonKho(orderDTO.dsMon);
    await OrderService.kiemTraDieuKienOrder(ban);

    const order = {
      banId: ban.banId,
      dsMon,
      tongTien: OrderService.tinhTongTien(dsMon),
      trangThai: 'DANG_PHUC_VU',
      isSynced: true,
    };
    order.isSynced = await OrderService.guiOrderDenKDS(order);

    const daLuu = await DonHangRepository.luuOrder(order);
    await BanRepository.capNhatTrangThai(ban.banId, 'DANG_PHUC_VU');
    return daLuu;
  }

  // ---- Ho tro giao dien: so do ban, thuc don, xem don ----

  static async layDanhSachBan() {
    return BanRepository.findAll();
  }

  // Mon TAM_HET van tra ve de giao dien lam xam
  static async layThucDon() {
    const dsMon = await MonAnRepository.findAll();
    return dsMon.map((m) => ({ monId: m.monId, tenMon: m.tenMon, gia: m.gia, trangThai: m.trangThai }));
  }

  static async layDonDayDu(donHangId) {
    const don = await DonHangRepository.findById(donHangId);
    if (!don) throw new AppError('DON_KHONG_TON_TAI', 'Khong tim thay don hang', 404);
    const chiTiet = await DonHangRepository.findChiTietByDon(don.donHangId);
    return OrderService.dungDonDayDu(don, chiTiet, don.tongTien, don.isSynced !== false);
  }

  // ---- UC04: cap nhat order (goi them, sua, huy mon) ----

  // Don phai ton tai va chua thanh toan (TC-04-12)
  static async layDonDeCapNhat(donHangId) {
    const don = await DonHangRepository.findById(donHangId);
    if (!don) throw new AppError('DON_KHONG_TON_TAI', 'Khong tim thay don hang', 404);
    if (don.trangThai === 'DA_THANH_TOAN') {
      throw new AppError('DON_DA_THANH_TOAN', 'Don hang da thanh toan, khong the cap nhat', 409);
    }
    return don;
  }

  // Chi sua/huy duoc mon dang CHO_PHA_CHE (TC-04-08..10, TC-04-13)
  static timMonCoTheSua(chiTiet, chiTietId) {
    const mon = chiTiet.find((m) => String(m.chiTietId) === String(chiTietId));
    if (!mon) {
      throw new AppError('MON_TRONG_DON_KHONG_TON_TAI', 'Khong tim thay mon trong don', 404);
    }
    if (mon.trangThaiCheBien === 'DA_HUY') {
      throw new AppError('MON_DA_HUY', 'Mon nay da bi huy', 409);
    }
    if (mon.trangThaiCheBien !== 'CHO_PHA_CHE') {
      throw new AppError('MON_DA_CHE_BIEN', 'Mon dang duoc che bien hoac da xong, khong the sua hoac huy', 409);
    }
    return mon;
  }

  // Tong tien chi tinh cac mon chua huy
  static tinhTongTienHieuLuc(chiTiet) {
    return OrderService.tinhTongTien(chiTiet.filter((m) => m.trangThaiCheBien !== 'DA_HUY'));
  }

  static dungDonDayDu(don, chiTiet, tongTien, isSynced) {
    return {
      donHangId: don.donHangId,
      banId: don.banId,
      trangThai: don.trangThai,
      tongTien,
      isSynced,
      dsMon: chiTiet.map((m) => ({
        chiTietId: m.chiTietId, monId: m.monId, tenMon: m.tenMon, soLuong: m.soLuong,
        donGia: m.donGia, ghiChu: m.ghiChu || null, trangThaiCheBien: m.trangThaiCheBien,
      })),
    };
  }

  // Goi them: chi phan mon moi duoc gui xuong bep (TC-04-01, TC-04-11)
  static async themMon(donHangId, dsMonDTO) {
    OrderService.kiemTraDsMon(dsMonDTO);
    const don = await OrderService.layDonDeCapNhat(donHangId);
    const dsMonMoi = await OrderService.kiemTraTonKho(dsMonDTO);
    const chiTietCu = await DonHangRepository.findChiTietByDon(don.donHangId);

    const dongBoMoi = await OrderService.guiOrderDenKDS({ donHangId: don.donHangId, banId: don.banId, dsMon: dsMonMoi });

    const trangThaiDon = don.trangThai === 'HOAN_THANH' ? 'DANG_PHUC_VU' : don.trangThai; // co mon moi thi don chua xong
    let chiTiet;
    let tongTien;
    await withTransaction(async (conn) => {
      const daLuu = await DonHangRepository.themChiTiet(don.donHangId, dsMonMoi, conn);
      chiTiet = [...chiTietCu, ...daLuu];
      tongTien = OrderService.tinhTongTienHieuLuc(chiTiet);
      await DonHangRepository.capNhatTongTien(don.donHangId, tongTien, conn);
      if (trangThaiDon !== don.trangThai) {
        await DonHangRepository.capNhatTrangThai(don.donHangId, trangThaiDon, conn);
      }
      if (!dongBoMoi) await DonHangRepository.capNhatDongBo(don.donHangId, false, conn);
    });

    return OrderService.dungDonDayDu({ ...don, trangThai: trangThaiDon }, chiTiet, tongTien, don.isSynced && dongBoMoi);
  }

  static async suaMon(donHangId, chiTietId, soLuong) {
    OrderService.kiemTraSoLuong(soLuong);
    const don = await OrderService.layDonDeCapNhat(donHangId);
    const chiTietCu = await DonHangRepository.findChiTietByDon(don.donHangId);
    OrderService.timMonCoTheSua(chiTietCu, chiTietId);

    const chiTiet = chiTietCu.map((m) => (String(m.chiTietId) === String(chiTietId) ? { ...m, soLuong } : m));
    const tongTien = OrderService.tinhTongTienHieuLuc(chiTiet);
    await withTransaction(async (conn) => {
      await DonHangRepository.capNhatChiTiet(chiTietId, { soLuong }, conn);
      await DonHangRepository.capNhatTongTien(don.donHangId, tongTien, conn);
    });
    return OrderService.dungDonDayDu(don, chiTiet, tongTien, don.isSynced);
  }

  static async huyMon(donHangId, chiTietId) {
    const don = await OrderService.layDonDeCapNhat(donHangId);
    const chiTietCu = await DonHangRepository.findChiTietByDon(don.donHangId);
    OrderService.timMonCoTheSua(chiTietCu, chiTietId);

    const chiTiet = chiTietCu.map((m) => (
      String(m.chiTietId) === String(chiTietId) ? { ...m, trangThaiCheBien: 'DA_HUY' } : m));
    const tongTien = OrderService.tinhTongTienHieuLuc(chiTiet);
    await withTransaction(async (conn) => {
      await DonHangRepository.capNhatChiTiet(chiTietId, { trangThaiCheBien: 'DA_HUY' }, conn);
      await DonHangRepository.capNhatTongTien(don.donHangId, tongTien, conn);
    });
    return OrderService.dungDonDayDu(don, chiTiet, tongTien, don.isSynced);
  }
}

module.exports = OrderService;
