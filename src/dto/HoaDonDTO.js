// Hoa don hien tren man Thu ngan (khop docs/api-contract.md, muc UC08)
class HoaDonDTO {
  constructor({ donHangId, soBan, dsMon, tongTien, tienGiamGia = 0, canThanhToan }) {
    this.donHangId = donHangId;
    this.soBan = soBan;
    this.dsMon = dsMon; // [{ tenMon, soLuong, donGia, thanhTien }]
    this.tongTien = tongTien;
    this.tienGiamGia = tienGiamGia;
    this.canThanhToan = canThanhToan;
  }
}

module.exports = HoaDonDTO;
