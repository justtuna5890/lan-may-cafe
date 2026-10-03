// Loi nghiep vu: service nem ra, errorHandler doi thanh response chuan
class AppError extends Error {
  constructor(maLoi, message, status = 400) {
    super(message);
    this.name = 'AppError';
    this.maLoi = maLoi;
    this.status = status;
  }
}

module.exports = AppError;
