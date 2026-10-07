const AppError = require('../utils/AppError');

class BanRepository {
  // Tra ve { banId, tenBan, trangThai } hoac null
  static async findById(banId) {
    throw new AppError('CHUA_CAI_DAT', 'BanRepository.findById chua cai dat', 501);
  }

  static async capNhatTrangThai(banId, trangThai) {
    throw new AppError('CHUA_CAI_DAT', 'BanRepository.capNhatTrangThai chua cai dat', 501);
  }
}

module.exports = BanRepository;