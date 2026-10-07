const AppError = require('../utils/AppError');
const { withTransaction } = require('../config/db');
const DonHangRepository = require('../repositories/DonHangRepository');
const BanRepository = require('../repositories/BanRepository');
const ThanhToanRepository = require('../repositories/ThanhToanRepository');
const KetQuaThanhToan = require('../dto/KetQuaThanhToan');

const PHUONG_THUC = ['TIEN_MAT', 'QR'];

class PaymentService {
  // UC08 - tra HoaDonDTO (soBan, dsMon, tongTien, tienGiamGia, canThanhToan)
  static async layHoaDon(donHangId) {
    // TODO(T5)
    throw new AppError('CHUA_CAI_DAT', 'UC08 chua duoc cai dat', 501);
  }

  // Kiem tra o server, khong chi o giao dien (TC-10-04, TC-10-05)
  static kiemTraDauVao(req) {
    if (!req || typeof req.donHangId !== 'string' || !req.donHangId
      || typeof req.maGiaoDich !== 'string' || !req.maGiaoDich) {
      throw new AppError('DU_LIEU_KHONG_HOP_LE', 'Thieu ma don hang hoac ma giao dich', 400);
    }
    if (!PHUONG_THUC.includes(req.phuongThuc)) {
      throw new AppError('PHUONG_THUC_KHONG_HOP_LE', 'Phuong thuc thanh toan khong hop le', 400);
    }
    if (req.phuongThuc === 'TIEN_MAT'
      && (typeof req.tienKhachDua !== 'number' || !Number.isFinite(req.tienKhachDua) || req.tienKhachDua < 0)) {
      throw new AppError('DU_LIEU_KHONG_HOP_LE', 'Thieu so tien khach dua', 400);
    }
  }

  // Don chi duoc thanh toan khi chua tra tien va moi mon da gui bep (TC-10-08, TC-10-09)
  static coTheThanhToan(don) {
    if (don.trangThai === 'DA_THANH_TOAN') {
      throw new AppError('DON_DA_THANH_TOAN', 'Don hang da duoc thanh toan', 409);
    }
    if (!don.isSynced) {
      throw new AppError('DON_CHUA_GUI_BEP', 'Don con mon chua gui bep, chua the thanh toan', 409);
    }
  }

  static tinhTienThoi(tienKhachDua, canThanhToan) {
    return tienKhachDua - canThanhToan;
  }

  // Dung lai ket qua cu khi gui trung ma giao dich (TC-10-07)
  static ketQuaDaXuLy(daCo) {
    return new KetQuaThanhToan({
      maGiaoDich: daCo.maGiaoDich,
      donHangId: daCo.donHangId,
      phuongThuc: daCo.phuongThuc,
      soTienThanhToan: daCo.soTienThanhToan,
      tienThoi: daCo.tienThoi,
      trangThaiDon: 'DA_THANH_TOAN',
      trangThaiBan: 'CAN_DON',
      daXuLyTruoc: true,
    });
  }

  // UC10 - theo SD_ThanhToan:
  // findByMaGiaoDich (da co thi tra ket qua cu) -> findById -> coTheThanhToan()
  // -> tao ThanhToan -> save -> don DA_THANH_TOAN -> ban CAN_DON (1 transaction)
  static async processPayment(req) {
    PaymentService.kiemTraDauVao(req);

    const daCo = await ThanhToanRepository.findByMaGiaoDich(req.maGiaoDich);
    if (daCo) return PaymentService.ketQuaDaXuLy(daCo);

    const don = await DonHangRepository.findById(req.donHangId);
    if (!don) throw new AppError('DON_KHONG_TON_TAI', 'Khong tim thay don hang', 404);
    PaymentService.coTheThanhToan(don);

    const canThanhToan = don.tongTien - (don.tienGiamGia || 0);
    let tienKhachDua = canThanhToan; // QR gia lap: khach tra dung so tien
    if (req.phuongThuc === 'TIEN_MAT') {
      tienKhachDua = req.tienKhachDua;
      if (tienKhachDua < canThanhToan) {
        throw new AppError('TIEN_KHONG_DU', 'Số tiền khách đưa chưa đủ', 400);
      }
    }
    const tienThoi = PaymentService.tinhTienThoi(tienKhachDua, canThanhToan);

    const thanhToan = {
      maGiaoDich: req.maGiaoDich,
      donHangId: don.donHangId,
      phuongThuc: req.phuongThuc,
      soTienThanhToan: canThanhToan,
      tienKhachDua,
      tienThoi,
    };

    try {
      // 3 thao tac ghi trong 1 transaction: loi giua chung thi rollback (TC-10-10)
      await withTransaction(async (conn) => {
        await ThanhToanRepository.save(thanhToan, conn);
        await DonHangRepository.capNhatTrangThai(don.donHangId, 'DA_THANH_TOAN', conn);
        await BanRepository.capNhatTrangThai(don.banId, 'CAN_DON', conn);
      });
    } catch (err) {
      // 2 request cung ma giao dich toi cung luc: request cham gap UNIQUE, tra ket qua cua request truoc
      if (err && err.code === 'ER_DUP_ENTRY') {
        const truoc = await ThanhToanRepository.findByMaGiaoDich(req.maGiaoDich);
        if (truoc) return PaymentService.ketQuaDaXuLy(truoc);
      }
      throw err;
    }

    return new KetQuaThanhToan({
      maGiaoDich: thanhToan.maGiaoDich,
      donHangId: thanhToan.donHangId,
      phuongThuc: thanhToan.phuongThuc,
      soTienThanhToan: canThanhToan,
      tienThoi,
      trangThaiDon: 'DA_THANH_TOAN',
      trangThaiBan: 'CAN_DON',
      daXuLyTruoc: false,
    });
  }
}

module.exports = PaymentService;
