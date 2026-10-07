const AppError = require('../utils/AppError');
const config = require('../config');
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
    if (!Array.isArray(dto.dsMon) || dto.dsMon.length === 0) {
      throw new AppError('DS_MON_RONG', 'Gio hang dang trong', 400);
    }
    for (const m of dto.dsMon) {
      if (!Number.isInteger(m.soLuong) || m.soLuong < 1 || m.soLuong > 99) {
        throw new AppError('SO_LUONG_KHONG_HOP_LE', 'So luong phai tu 1 den 99', 400);
      }
    }
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
}

module.exports = OrderService;
