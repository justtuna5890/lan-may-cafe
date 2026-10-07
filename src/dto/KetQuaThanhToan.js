// Ket qua tra ve cho UC10 (khop docs/api-contract.md, muc UC10)
class KetQuaThanhToan {
  constructor({
    thanhCong = true, maGiaoDich, donHangId, phuongThuc,
    soTienThanhToan, tienThoi, trangThaiDon, trangThaiBan, daXuLyTruoc = false,
  }) {
    this.thanhCong = thanhCong;
    this.maGiaoDich = maGiaoDich;
    this.donHangId = donHangId;
    this.phuongThuc = phuongThuc;
    this.soTienThanhToan = soTienThanhToan;
    this.tienThoi = tienThoi;
    this.trangThaiDon = trangThaiDon;
    this.trangThaiBan = trangThaiBan;
    this.daXuLyTruoc = daXuLyTruoc;
  }
}

module.exports = KetQuaThanhToan;
