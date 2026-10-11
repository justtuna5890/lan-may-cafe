jest.mock('../src/repositories/DonHangRepository');
jest.mock('../src/repositories/BanRepository');
jest.mock('../src/repositories/ThanhToanRepository');
jest.mock('../src/config/db', () => ({ withTransaction: jest.fn() }));

const DonHangRepository = require('../src/repositories/DonHangRepository');
const BanRepository = require('../src/repositories/BanRepository');
const PaymentService = require('../src/services/PaymentService');

const DON = { donHangId: 'dh-001', banId: 'ban-05', trangThai: 'DANG_PHUC_VU', tongTien: 90000, tienGiamGia: 0, isSynced: true };
const CHI_TIET = [
  { tenMon: 'Bac xiu', soLuong: 2, donGia: 45000, trangThaiCheBien: 'DA_XONG' },
];

beforeEach(() => {
  jest.resetAllMocks();
  DonHangRepository.findById.mockResolvedValue({ ...DON });
  DonHangRepository.findChiTietByDon.mockResolvedValue(CHI_TIET.map((m) => ({ ...m })));
  DonHangRepository.findDangPhucVuByBan.mockResolvedValue({ donHangId: 'dh-001' });
  BanRepository.findById.mockResolvedValue({ banId: 'ban-05', tenBan: '05', trangThai: 'DANG_PHUC_VU' });
});

describe('UC08 lap hoa don', () => {
  test('TC-08-01 lap hoa don binh thuong', async () => {
    const hd = await PaymentService.layHoaDon('dh-001');
    expect(hd).toMatchObject({
      donHangId: 'dh-001', soBan: '05', tongTien: 90000, tienGiamGia: 0, canThanhToan: 90000,
    });
    expect(hd.dsMon).toEqual([{ tenMon: 'Bac xiu', soLuong: 2, donGia: 45000, thanhTien: 90000 }]);
  });

  test('TC-08-02 ban trong: khong co don de lap hoa don', async () => {
    DonHangRepository.findDangPhucVuByBan.mockResolvedValue(null);
    await expect(PaymentService.layDonHienTaiCuaBan('ban-05'))
      .rejects.toMatchObject({ maLoi: 'BAN_KHONG_CO_DON', status: 404 });
  });

  test('co don: layDonHienTaiCuaBan tra ma don', async () => {
    await expect(PaymentService.layDonHienTaiCuaBan('ban-05')).resolves.toEqual({ donHangId: 'dh-001' });
  });

  test('layDonHienTaiCuaBan: ban khong ton tai', async () => {
    BanRepository.findById.mockResolvedValue(null);
    await expect(PaymentService.layDonHienTaiCuaBan('ban-99'))
      .rejects.toMatchObject({ maLoi: 'BAN_KHONG_TON_TAI', status: 404 });
  });

  test('TC-08-03 don con mon chua gui bep', async () => {
    DonHangRepository.findById.mockResolvedValue({ ...DON, isSynced: false });
    await expect(PaymentService.layHoaDon('dh-001'))
      .rejects.toMatchObject({ maLoi: 'DON_CHUA_GUI_BEP', status: 409 });
  });

  test('TC-08-04 co giam gia: can thanh toan = tong tien - giam gia', async () => {
    DonHangRepository.findById.mockResolvedValue({ ...DON, tienGiamGia: 10000 });
    const hd = await PaymentService.layHoaDon('dh-001');
    expect(hd).toMatchObject({ tongTien: 90000, tienGiamGia: 10000, canThanhToan: 80000 });
  });

  test('TC-08-05 gia tri cuc lon van tinh dung', async () => {
    DonHangRepository.findChiTietByDon.mockResolvedValue([
      { tenMon: 'Combo', soLuong: 99, donGia: 9999999, trangThaiCheBien: 'DA_XONG' },
    ]);
    const hd = await PaymentService.layHoaDon('dh-001');
    expect(hd.tongTien).toBe(99 * 9999999);
    expect(hd.canThanhToan).toBe(99 * 9999999);
  });

  test('mon da huy khong len hoa don', async () => {
    DonHangRepository.findChiTietByDon.mockResolvedValue([
      ...CHI_TIET,
      { tenMon: 'Tra dao', soLuong: 1, donGia: 50000, trangThaiCheBien: 'DA_HUY' },
    ]);
    const hd = await PaymentService.layHoaDon('dh-001');
    expect(hd.dsMon).toHaveLength(1);
    expect(hd.tongTien).toBe(90000);
  });

  test('don hang khong ton tai', async () => {
    DonHangRepository.findById.mockResolvedValue(null);
    await expect(PaymentService.layHoaDon('dh-999'))
      .rejects.toMatchObject({ maLoi: 'DON_KHONG_TON_TAI', status: 404 });
  });

  test('don da thanh toan khong lap hoa don lai', async () => {
    DonHangRepository.findById.mockResolvedValue({ ...DON, trangThai: 'DA_THANH_TOAN' });
    await expect(PaymentService.layHoaDon('dh-001'))
      .rejects.toMatchObject({ maLoi: 'DON_DA_THANH_TOAN', status: 409 });
  });
});
