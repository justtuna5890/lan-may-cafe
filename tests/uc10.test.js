jest.mock('../src/repositories/DonHangRepository');
jest.mock('../src/repositories/BanRepository');
jest.mock('../src/repositories/ThanhToanRepository');
// withTransaction gia: chay work voi 1 "ket noi" gia, ghi nhan commit/rollback
jest.mock('../src/config/db', () => ({ withTransaction: jest.fn() }));

const { withTransaction } = require('../src/config/db');
const DonHangRepository = require('../src/repositories/DonHangRepository');
const BanRepository = require('../src/repositories/BanRepository');
const ThanhToanRepository = require('../src/repositories/ThanhToanRepository');
const PaymentService = require('../src/services/PaymentService');

const DON = { donHangId: 'dh-001', banId: 'ban-05', trangThai: 'DANG_PHUC_VU', tongTien: 90000, tienGiamGia: 0, isSynced: true };
const reqTienMat = (tienKhachDua = 100000, maGiaoDich = 'gd-0001') =>
  ({ donHangId: 'dh-001', phuongThuc: 'TIEN_MAT', tienKhachDua, maGiaoDich });

let trangThaiTx;

beforeEach(() => {
  jest.resetAllMocks();
  trangThaiTx = { commit: 0, rollback: 0 };
  withTransaction.mockImplementation(async (work) => {
    try {
      const r = await work('CONN');
      trangThaiTx.commit += 1;
      return r;
    } catch (err) {
      trangThaiTx.rollback += 1;
      throw err;
    }
  });
  ThanhToanRepository.findByMaGiaoDich.mockResolvedValue(null);
  ThanhToanRepository.save.mockResolvedValue(undefined);
  DonHangRepository.findById.mockResolvedValue({ ...DON });
  DonHangRepository.capNhatTrangThai.mockResolvedValue(undefined);
  BanRepository.capNhatTrangThai.mockResolvedValue(undefined);
});

const khongGhiGi = () => {
  expect(ThanhToanRepository.save).not.toHaveBeenCalled();
  expect(DonHangRepository.capNhatTrangThai).not.toHaveBeenCalled();
  expect(BanRepository.capNhatTrangThai).not.toHaveBeenCalled();
};

describe('UC10 thanh toan hoa don', () => {
  test('TC-10-01 tien mat, khach dua du tien', async () => {
    const r = await PaymentService.processPayment(reqTienMat(100000));
    expect(r).toMatchObject({
      thanhCong: true, soTienThanhToan: 90000, tienThoi: 10000,
      trangThaiDon: 'DA_THANH_TOAN', trangThaiBan: 'CAN_DON', daXuLyTruoc: false,
    });
    expect(ThanhToanRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ maGiaoDich: 'gd-0001', donHangId: 'dh-001', tienThoi: 10000 }), 'CONN');
    expect(DonHangRepository.capNhatTrangThai).toHaveBeenCalledWith('dh-001', 'DA_THANH_TOAN', 'CONN');
    expect(BanRepository.capNhatTrangThai).toHaveBeenCalledWith('ban-05', 'CAN_DON', 'CONN');
    expect(trangThaiTx).toEqual({ commit: 1, rollback: 0 });
  });

  test('TC-10-02 tien khach dua dung bang so can tra', async () => {
    const r = await PaymentService.processPayment(reqTienMat(90000));
    expect(r).toMatchObject({ thanhCong: true, tienThoi: 0, trangThaiDon: 'DA_THANH_TOAN', trangThaiBan: 'CAN_DON' });
  });

  test('TC-10-03 tien khach dua thieu 1.000d', async () => {
    await expect(PaymentService.processPayment(reqTienMat(89000)))
      .rejects.toMatchObject({ maLoi: 'TIEN_KHONG_DU', status: 400 });
    khongGhiGi();
  });

  test('TC-10-04 tien mat nhung thieu tienKhachDua', async () => {
    await expect(PaymentService.processPayment({ donHangId: 'dh-001', phuongThuc: 'TIEN_MAT', maGiaoDich: 'gd-1' }))
      .rejects.toMatchObject({ maLoi: 'DU_LIEU_KHONG_HOP_LE', status: 400 });
    khongGhiGi();
  });

  test('TC-10-05 phuong thuc khong hop le', async () => {
    await expect(PaymentService.processPayment({ donHangId: 'dh-001', phuongThuc: 'THE', maGiaoDich: 'gd-1' }))
      .rejects.toMatchObject({ maLoi: 'PHUONG_THUC_KHONG_HOP_LE', status: 400 });
    khongGhiGi();
  });

  test('TC-10-06 QR gia lap', async () => {
    const r = await PaymentService.processPayment({ donHangId: 'dh-001', phuongThuc: 'QR', maGiaoDich: 'gd-qr-1' });
    expect(r).toMatchObject({
      thanhCong: true, phuongThuc: 'QR', maGiaoDich: 'gd-qr-1', soTienThanhToan: 90000,
      trangThaiDon: 'DA_THANH_TOAN', trangThaiBan: 'CAN_DON',
    });
  });

  test('TC-10-07 bam xac nhan 2 lan cung ma giao dich', async () => {
    const lan1 = await PaymentService.processPayment(reqTienMat(100000));
    expect(lan1.daXuLyTruoc).toBe(false);

    ThanhToanRepository.findByMaGiaoDich.mockResolvedValue({
      maGiaoDich: 'gd-0001', donHangId: 'dh-001', phuongThuc: 'TIEN_MAT',
      soTienThanhToan: 90000, tienKhachDua: 100000, tienThoi: 10000,
    });
    const lan2 = await PaymentService.processPayment(reqTienMat(100000));
    expect(lan2).toMatchObject({ daXuLyTruoc: true, soTienThanhToan: 90000, tienThoi: 10000 });
    expect(ThanhToanRepository.save).toHaveBeenCalledTimes(1); // khong thu lan hai
  });

  test('2 request cung ma toi cung luc: request cham gap UNIQUE van tra ket qua cu', async () => {
    ThanhToanRepository.save.mockRejectedValue(Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' }));
    ThanhToanRepository.findByMaGiaoDich
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        maGiaoDich: 'gd-0001', donHangId: 'dh-001', phuongThuc: 'TIEN_MAT',
        soTienThanhToan: 90000, tienKhachDua: 100000, tienThoi: 10000,
      });
    const r = await PaymentService.processPayment(reqTienMat(100000));
    expect(r).toMatchObject({ daXuLyTruoc: true, tienThoi: 10000 });
  });

  test('TC-10-08 thanh toan don da thanh toan (ma giao dich khac)', async () => {
    DonHangRepository.findById.mockResolvedValue({ ...DON, trangThai: 'DA_THANH_TOAN' });
    await expect(PaymentService.processPayment(reqTienMat(100000, 'gd-moi')))
      .rejects.toMatchObject({ maLoi: 'DON_DA_THANH_TOAN', status: 409 });
    khongGhiGi();
  });

  test('TC-10-09 don chua gui bep', async () => {
    DonHangRepository.findById.mockResolvedValue({ ...DON, isSynced: false });
    await expect(PaymentService.processPayment(reqTienMat(100000)))
      .rejects.toMatchObject({ maLoi: 'DON_CHUA_GUI_BEP', status: 409 });
    khongGhiGi();
  });

  test('TC-10-10 loi giua chung: rollback, khong tra thanh cong', async () => {
    BanRepository.capNhatTrangThai.mockRejectedValue(new Error('mat ket noi CSDL'));
    await expect(PaymentService.processPayment(reqTienMat(100000))).rejects.toThrow('mat ket noi CSDL');
    expect(trangThaiTx).toEqual({ commit: 0, rollback: 1 });
  });

  test('don hang khong ton tai', async () => {
    DonHangRepository.findById.mockResolvedValue(null);
    await expect(PaymentService.processPayment(reqTienMat(100000)))
      .rejects.toMatchObject({ maLoi: 'DON_KHONG_TON_TAI', status: 404 });
    khongGhiGi();
  });

  test('co giam gia: can thanh toan = tong tien - giam gia', async () => {
    DonHangRepository.findById.mockResolvedValue({ ...DON, tienGiamGia: 10000 });
    const r = await PaymentService.processPayment(reqTienMat(100000));
    expect(r).toMatchObject({ soTienThanhToan: 80000, tienThoi: 20000 });
  });
});
