const AppError = require('../utils/AppError');

class MonAnRepository {
  // Tra ve { monId, tenMon, gia, trangThai } (CON_HANG | TAM_HET) hoac null
  static async findById(monId) {
    throw new AppError('CHUA_CAI_DAT', 'MonAnRepository.findById chua cai dat', 501);
  }
}

module.exports = MonAnRepository;