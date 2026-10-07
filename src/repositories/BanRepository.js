const AppError = require('../utils/AppError');

class BanRepository {
  // Tra ve { banId, tenBan, trangThai } hoac null
  static async findById(banId) {
    throw new AppError('CHUA_CAI_DAT', 'BanRepository.findById chua cai dat', 501);
  }

  // conn (tuy chon): ket noi cua transaction
  static async capNhatTrangThai(banId, trangThai, conn) {
    throw new AppError('CHUA_CAI_DAT', 'BanRepository.capNhatTrangThai chua cai dat', 501);
  }
}

module.exports = BanRepository;
