jest.mock('../src/repositories/DonHangRepository');
jest.mock('../src/repositories/BanRepository');
jest.mock('../src/repositories/MonAnRepository');
jest.mock('../src/services/KdsService');
jest.mock('../src/config/db', () => ({ withTransaction: jest.fn() }));

const { withTransaction } = require('../src/config/db');
const DonHangRepository = require('../src/repositories/DonHangRepository');
const MonAnRepository = require('../src/repositories/MonAnRepository');
const KdsService = require('../src/services/KdsService');
const OrderService = require('../src/services/OrderService');

const DON = { donHangId: 'dh-001', banId: 'ban-05', trangThai: 'DANG_PHUC_VU', tongTien: 90000, isSynced: true };
const mon = (o) => ({
  chiTietId: 'ct-1', monId: 'mon-01', tenMon: 'Bac xiu', soLuong: 2, donGia: 45000,
  ghiChu: null, trangThaiCheBien: 'CHO_PHA_CHE', ...o,
});
const MON_B = { monId: 'mon-02', tenMon: 'Tra dao', gia: 50000, trangThai: 'CON_HANG' };

let chiTiet;

const khongGhiGi = () => {
  expect(DonHangRepository.themChiTiet).not.toHaveBeenCalled();
  expect(DonHangRepository.capNhatChiTiet).not.toHaveBeenCalled();
  expect(DonHangRepository.capNhatTongTien).not.toHaveBeenCalled();
};

beforeEach(() => {
  jest.resetAllMocks();
  chiTiet = [mon({ chiTietId: 'ct-1' })];
  withTransaction.mockImplementation((work) => work('CONN'));
  DonHangRepository.findById.mockResolvedValue({ ...DON });
  DonHangRepository.findChiTietByDon.mockImplementation(async () => chiTiet.map((m) => ({ ...m })));
  DonHangRepository.themChiTiet.mockImplementation(async (id, ds) =>
    ds.map((m, i) => ({ ...m, chiTietId: `ct-moi-${i}` })));
  MonAnRepository.findById.mockResolvedValue(MON_B);
  KdsService.guiOrder.mockResolvedValue(true);
});

describe('UC04 goi them mon', () => {
  const dsMoi = [{ monId: 'mon-02', soLuong: 1, ghiChu: 'it duong' }];

  test('TC-04-01 goi them mon vao don dang phuc vu', async () => {
    const r = await OrderService.themMon('dh-001', dsMoi);
    expect(r.dsMon).toHaveLength(2);
    expect(r.dsMon[0]).toMatchObject({ chiTietId: 'ct-1', trangThaiCheBien: 'CHO_PHA_CHE', soLuong: 2 });
    expect(r.dsMon[1]).toMatchObject({ monId: 'mon-02', trangThaiCheBien: 'CHO_PHA_CHE', soLuong: 1 });
    expect(r.tongTien).toBe(90000 + 50000);
    expect(DonHangRepository.capNhatTongTien).toHaveBeenCalledWith('dh-001', 140000, 'CONN');
    // chi phan mon moi duoc gui xuong bep
    expect(KdsService.guiOrder).toHaveBeenCalledTimes(1);
    const gui = KdsService.guiOrder.mock.calls[0][0];
    expect(gui.dsMon).toHaveLength(1);
    expect(gui.dsMon[0].monId).toBe('mon-02');
  });

  test('TC-04-11 goi them mon da het nguyen lieu', async () => {
    MonAnRepository.findById.mockResolvedValue({ ...MON_B, trangThai: 'TAM_HET' });
    await expect(OrderService.themMon('dh-001', dsMoi))
      .rejects.toMatchObject({ maLoi: 'MON_TAM_HET', status: 409 });
    khongGhiGi();
  });

  test('goi them voi gio hang rong', async () => {
    await expect(OrderService.themMon('dh-001', []))
      .rejects.toMatchObject({ maLoi: 'DS_MON_RONG', status: 400 });
    khongGhiGi();
  });

  test('goi them so luong 100 bi tu choi', async () => {
    await expect(OrderService.themMon('dh-001', [{ monId: 'mon-02', soLuong: 100 }]))
      .rejects.toMatchObject({ maLoi: 'SO_LUONG_KHONG_HOP_LE', status: 400 });
    khongGhiGi();
  });

  test('bep khong phan hoi: don van luu, isSynced=false', async () => {
    jest.useFakeTimers();
    KdsService.guiOrder.mockReturnValue(new Promise(() => {}));
    const p = OrderService.themMon('dh-001', dsMoi);
    await jest.advanceTimersByTimeAsync(5000);
    const r = await p;
    expect(r.isSynced).toBe(false);
    expect(DonHangRepository.capNhatDongBo).toHaveBeenCalledWith('dh-001', false, 'CONN');
    jest.useRealTimers();
  });

  test('don da HOAN_THANH: goi them thi quay lai DANG_PHUC_VU', async () => {
    DonHangRepository.findById.mockResolvedValue({ ...DON, trangThai: 'HOAN_THANH' });
    const r = await OrderService.themMon('dh-001', dsMoi);
    expect(r.trangThai).toBe('DANG_PHUC_VU');
    expect(DonHangRepository.capNhatTrangThai).toHaveBeenCalledWith('dh-001', 'DANG_PHUC_VU', 'CONN');
  });
});

describe('UC04 sua so luong', () => {
  test('TC-04-02 sua so luong mon CHO_PHA_CHE', async () => {
    const r = await OrderService.suaMon('dh-001', 'ct-1', 3);
    expect(r.dsMon[0]).toMatchObject({ soLuong: 3, trangThaiCheBien: 'CHO_PHA_CHE' });
    expect(r.tongTien).toBe(3 * 45000);
    expect(DonHangRepository.capNhatChiTiet).toHaveBeenCalledWith('ct-1', { soLuong: 3 }, 'CONN');
    expect(DonHangRepository.capNhatTongTien).toHaveBeenCalledWith('dh-001', 135000, 'CONN');
  });

  test.each([1, 99])('TC-04-04/05 so luong bien hop le %i', async (sl) => {
    const r = await OrderService.suaMon('dh-001', 'ct-1', sl);
    expect(r.dsMon[0].soLuong).toBe(sl);
    expect(r.tongTien).toBe(sl * 45000);
  });

  test.each([0, 100])('TC-04-06/07 so luong khong hop le %i', async (sl) => {
    await expect(OrderService.suaMon('dh-001', 'ct-1', sl))
      .rejects.toMatchObject({ maLoi: 'SO_LUONG_KHONG_HOP_LE', status: 400 });
    khongGhiGi();
  });

  test('TC-04-09 sua so luong mon DANG_LAM bi chan', async () => {
    chiTiet = [mon({ trangThaiCheBien: 'DANG_LAM' })];
    await expect(OrderService.suaMon('dh-001', 'ct-1', 3))
      .rejects.toMatchObject({ maLoi: 'MON_DA_CHE_BIEN', status: 409 });
    khongGhiGi();
  });

  test('TC-04-10 sua mon DA_XONG bi chan', async () => {
    chiTiet = [mon({ trangThaiCheBien: 'DA_XONG' })];
    await expect(OrderService.suaMon('dh-001', 'ct-1', 3))
      .rejects.toMatchObject({ maLoi: 'MON_DA_CHE_BIEN', status: 409 });
    khongGhiGi();
  });

  test('TC-04-13 chiTietId khong ton tai', async () => {
    await expect(OrderService.suaMon('dh-001', 'ct-999', 3))
      .rejects.toMatchObject({ maLoi: 'MON_TRONG_DON_KHONG_TON_TAI', status: 404 });
    khongGhiGi();
  });

  test('sua mon da huy bi chan', async () => {
    chiTiet = [mon({ trangThaiCheBien: 'DA_HUY' })];
    await expect(OrderService.suaMon('dh-001', 'ct-1', 3))
      .rejects.toMatchObject({ maLoi: 'MON_DA_HUY', status: 409 });
  });
});

describe('UC04 huy mon', () => {
  test('TC-04-03 huy mon CHO_PHA_CHE: mon thanh DA_HUY, tru tien', async () => {
    chiTiet = [mon({ chiTietId: 'ct-1' }), mon({ chiTietId: 'ct-2', monId: 'mon-02', tenMon: 'Tra dao', soLuong: 1, donGia: 50000 })];
    const r = await OrderService.huyMon('dh-001', 'ct-1');
    expect(r.dsMon.find((m) => m.chiTietId === 'ct-1').trangThaiCheBien).toBe('DA_HUY');
    expect(r.tongTien).toBe(50000); // tru dung thanh tien 2 x 45.000
    expect(DonHangRepository.capNhatChiTiet).toHaveBeenCalledWith('ct-1', { trangThaiCheBien: 'DA_HUY' }, 'CONN');
    expect(DonHangRepository.capNhatTongTien).toHaveBeenCalledWith('dh-001', 50000, 'CONN');
  });

  test('TC-04-08 huy mon DANG_LAM bi chan', async () => {
    chiTiet = [mon({ trangThaiCheBien: 'DANG_LAM' })];
    await expect(OrderService.huyMon('dh-001', 'ct-1'))
      .rejects.toMatchObject({ maLoi: 'MON_DA_CHE_BIEN', status: 409 });
    khongGhiGi();
  });

  test('TC-04-10 huy mon DA_XONG bi chan', async () => {
    chiTiet = [mon({ trangThaiCheBien: 'DA_XONG' })];
    await expect(OrderService.huyMon('dh-001', 'ct-1'))
      .rejects.toMatchObject({ maLoi: 'MON_DA_CHE_BIEN', status: 409 });
  });

  test('huy mon khong ton tai', async () => {
    await expect(OrderService.huyMon('dh-001', 'ct-999'))
      .rejects.toMatchObject({ maLoi: 'MON_TRONG_DON_KHONG_TON_TAI', status: 404 });
  });
});

describe('UC04 dieu kien chung', () => {
  test('TC-04-12 cap nhat don da thanh toan bi chan (them, sua, huy)', async () => {
    DonHangRepository.findById.mockResolvedValue({ ...DON, trangThai: 'DA_THANH_TOAN' });
    const loi = { maLoi: 'DON_DA_THANH_TOAN', status: 409 };
    await expect(OrderService.themMon('dh-001', [{ monId: 'mon-02', soLuong: 1 }])).rejects.toMatchObject(loi);
    await expect(OrderService.suaMon('dh-001', 'ct-1', 3)).rejects.toMatchObject(loi);
    await expect(OrderService.huyMon('dh-001', 'ct-1')).rejects.toMatchObject(loi);
    khongGhiGi();
  });

  test('don khong ton tai', async () => {
    DonHangRepository.findById.mockResolvedValue(null);
    await expect(OrderService.huyMon('dh-999', 'ct-1'))
      .rejects.toMatchObject({ maLoi: 'DON_KHONG_TON_TAI', status: 404 });
  });
});
