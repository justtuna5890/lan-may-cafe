jest.mock('../src/repositories/BanRepository');
jest.mock('../src/repositories/MonAnRepository');
jest.mock('../src/repositories/DonHangRepository');
jest.mock('../src/services/KdsService');

const BanRepository = require('../src/repositories/BanRepository');
const MonAnRepository = require('../src/repositories/MonAnRepository');
const DonHangRepository = require('../src/repositories/DonHangRepository');
const KdsService = require('../src/services/KdsService');
const OrderService = require('../src/services/OrderService');

const MON_A = { monId: 'mon-01', tenMon: 'Bac xiu', gia: 45000, trangThai: 'CON_HANG' };
const dto = (soLuong = 2) => ({ banId: 'ban-05', dsMon: [{ monId: 'mon-01', soLuong, ghiChu: 'it da' }] });

beforeEach(() => {
  jest.resetAllMocks();
  BanRepository.findById.mockResolvedValue({ banId: 'ban-05', trangThai: 'TRONG' });
  MonAnRepository.findById.mockResolvedValue(MON_A);
  DonHangRepository.findDangPhucVuByBan.mockResolvedValue(null);
  DonHangRepository.luuOrder.mockImplementation(async (o) => ({ donHangId: 'dh-001', ...o }));
  KdsService.guiOrder.mockResolvedValue(true);
});

describe('UC01 tao order', () => {
  test('TC-01-01 thanh cong', async () => {
    const r = await OrderService.xuLyTaoOrder(dto(2));
    expect(r).toMatchObject({ trangThai: 'DANG_PHUC_VU', tongTien: 90000, isSynced: true });
    expect(BanRepository.capNhatTrangThai).toHaveBeenCalledWith('ban-05', 'DANG_PHUC_VU');
  });

  test('TC-01-12 response dung cau truc don day du theo api-contract', async () => {
    DonHangRepository.luuOrder.mockResolvedValue({
      id: 'dh-001', donHangId: 'dh-001', affectedRows: 1,
      dsChiTiet: [{ id: 'ct-001', chiTietId: 'ct-001', monId: 'mon-01', monAnId: 'mon-01', tenMon: 'Bac xiu',
        soLuong: 2, donGia: 45000, ghiChu: 'it da', trangThaiCheBien: 'CHO_PHA_CHE' }],
    });
    const r = await OrderService.xuLyTaoOrder(dto(2));
    expect(Object.keys(r).sort()).toEqual(['banId', 'donHangId', 'dsMon', 'isSynced', 'tongTien', 'trangThai']);
    expect(r).toMatchObject({ donHangId: 'dh-001', banId: 'ban-05', trangThai: 'DANG_PHUC_VU', tongTien: 90000, isSynced: true });
    expect(r.dsMon).toEqual([
      { chiTietId: 'ct-001', monId: 'mon-01', tenMon: 'Bac xiu', soLuong: 2, donGia: 45000, ghiChu: 'it da', trangThaiCheBien: 'CHO_PHA_CHE' },
    ]);
  });

  test.each([1, 99])('TC-01-02/03 so luong bien hop le %i', async (sl) => {
    const r = await OrderService.xuLyTaoOrder(dto(sl));
    expect(r.tongTien).toBe(sl * 45000);
  });

  test.each([0, -1, 100])('TC-01-04..06 so luong khong hop le %i', async (sl) => {
    await expect(OrderService.xuLyTaoOrder(dto(sl))).rejects.toMatchObject({ maLoi: 'SO_LUONG_KHONG_HOP_LE', status: 400 });
    expect(DonHangRepository.luuOrder).not.toHaveBeenCalled();
  });

  test('TC-01-07 mon TAM_HET', async () => {
    MonAnRepository.findById.mockResolvedValue({ ...MON_A, trangThai: 'TAM_HET' });
    await expect(OrderService.xuLyTaoOrder(dto())).rejects.toMatchObject({ maLoi: 'MON_TAM_HET', status: 409 });
    expect(DonHangRepository.luuOrder).not.toHaveBeenCalled();
  });

  test('TC-01-08 ban CAN_DON', async () => {
    BanRepository.findById.mockResolvedValue({ banId: 'ban-05', trangThai: 'CAN_DON' });
    await expect(OrderService.xuLyTaoOrder(dto())).rejects.toMatchObject({ maLoi: 'BAN_CAN_DON', status: 409 });
  });

  test('TC-01-09 ban da co don', async () => {
    DonHangRepository.findDangPhucVuByBan.mockResolvedValue({ donHangId: 'dh-000' });
    await expect(OrderService.xuLyTaoOrder(dto())).rejects.toMatchObject({ maLoi: 'BAN_DA_CO_DON', status: 409 });
  });

  test('TC-01-10 bep khong phan hoi sau 5 giay -> isSynced=false, don van luu', async () => {
    jest.useFakeTimers();
    KdsService.guiOrder.mockReturnValue(new Promise(() => {}));
    const p = OrderService.xuLyTaoOrder(dto());
    await jest.advanceTimersByTimeAsync(5000);
    const r = await p;
    expect(r.isSynced).toBe(false);
    expect(DonHangRepository.luuOrder).toHaveBeenCalled();
    jest.useRealTimers();
  });

  test('TC-01-11 gio hang rong', async () => {
    await expect(OrderService.xuLyTaoOrder({ banId: 'ban-05', dsMon: [] })).rejects.toMatchObject({ maLoi: 'DS_MON_RONG', status: 400 });
  });
});