// Test UC18 nhap/xuat kho khong mo lai mon Chu quan da tat ban (BUG-N5-001, TC-22-14)
// Gia lap (mock) kho va CSDL nen khong can bat MySQL
jest.mock('../src/repositories/KhoHangRepository');
jest.mock('../src/config/db', () => ({ withTransaction: jest.fn() }));

const { withTransaction } = require('../src/config/db');
const KhoHangRepository = require('../src/repositories/KhoHangRepository');
const KhoHangService = require('../src/services/KhoHangService');

// tao 1 nguyen lieu mau, truyen ton kho can thu
const nguyenLieu = (tonKho) => ({ id: 'kho-01', tenNguyenLieu: 'Ca phe hat', donViTinh: 'gram', tonKho });

beforeEach(() => {
  jest.resetAllMocks();
  // withTransaction gia: chay thang ham work voi 1 "ket noi" gia
  withTransaction.mockImplementation(async (work) => work('CONN'));
  KhoHangRepository.nhapKho.mockResolvedValue(true);
  KhoHangRepository.xuatKho.mockResolvedValue(true);
  KhoHangRepository.danhDauHetHang.mockResolvedValue(true);
  KhoHangRepository.dongBoTrangThaiMonAn.mockResolvedValue(1);
});

describe('UC18 nhap kho', () => {
  test('TC-22-14 nguyen lieu van con hang: nhap them khong dong bo lai trang thai mon', async () => {
    KhoHangRepository.findById.mockResolvedValue(nguyenLieu(5000));

    await KhoHangService.nhapKho('kho-01', 10);

    expect(KhoHangRepository.nhapKho).toHaveBeenCalledWith('kho-01', 10, 'CONN');
    // khong dong bo thi mon Chu quan da tat ban van giu TAM_HET
    expect(KhoHangRepository.dongBoTrangThaiMonAn).not.toHaveBeenCalled();
  });

  test('nguyen lieu dang het (ton kho 0): nhap lai thi dong bo de mo ban lai mon', async () => {
    KhoHangRepository.findById.mockResolvedValue(nguyenLieu(0));

    await KhoHangService.nhapKho('kho-01', 50);

    expect(KhoHangRepository.dongBoTrangThaiMonAn).toHaveBeenCalledTimes(1);
    expect(KhoHangRepository.dongBoTrangThaiMonAn).toHaveBeenCalledWith('kho-01', 'CONN');
  });

  test('nhap so luong khong hop le thi bao loi va khong dong bo', async () => {
    KhoHangRepository.findById.mockResolvedValue(nguyenLieu(0));

    await expect(KhoHangService.nhapKho('kho-01', -5)).rejects.toMatchObject({ maLoi: 'KHO_SO_LUONG_KHONG_HOP_LE' });
    await expect(KhoHangService.nhapKho('kho-01', 0)).rejects.toMatchObject({ maLoi: 'KHO_SO_LUONG_KHONG_HOP_LE' });

    expect(KhoHangRepository.nhapKho).not.toHaveBeenCalled();
    expect(KhoHangRepository.dongBoTrangThaiMonAn).not.toHaveBeenCalled();
  });
});

describe('UC18 xuat kho', () => {
  test('xuat xong nguyen lieu van con hang: khong dong bo lai trang thai mon', async () => {
    // lan doc 1: truoc khi xuat, lan doc 2: sau khi xuat
    KhoHangRepository.findById
      .mockResolvedValueOnce(nguyenLieu(5000))
      .mockResolvedValueOnce(nguyenLieu(4990));

    const ketQua = await KhoHangService.xuatKho('kho-01', 10);

    expect(ketQua.tonKho).toBe(4990);
    expect(KhoHangRepository.dongBoTrangThaiMonAn).not.toHaveBeenCalled();
  });

  test('xuat het nguyen lieu (ton kho ve 0): dong bo de khoa cac mon dung no', async () => {
    KhoHangRepository.findById
      .mockResolvedValueOnce(nguyenLieu(10))
      .mockResolvedValueOnce(nguyenLieu(0));

    const ketQua = await KhoHangService.xuatKho('kho-01', 10);

    expect(ketQua.tonKho).toBe(0);
    expect(KhoHangRepository.dongBoTrangThaiMonAn).toHaveBeenCalledWith('kho-01', 'CONN');
  });

  test('xuat qua ton kho thi bao loi, khong dong bo', async () => {
    KhoHangRepository.findById.mockResolvedValue(nguyenLieu(5));
    KhoHangRepository.xuatKho.mockResolvedValue(false);

    await expect(KhoHangService.xuatKho('kho-01', 999)).rejects.toMatchObject({ maLoi: 'KHO_XUAT_THAT_BAI' });

    expect(KhoHangRepository.dongBoTrangThaiMonAn).not.toHaveBeenCalled();
  });
});

describe('UC18 danh dau het hang', () => {
  test('danh dau het hang thi dong bo de khoa cac mon dung nguyen lieu do', async () => {
    KhoHangRepository.findById.mockResolvedValue(nguyenLieu(5000));

    const ketQua = await KhoHangService.danhDauHetHang('kho-01');

    expect(ketQua.tonKho).toBe(0);
    expect(KhoHangRepository.danhDauHetHang).toHaveBeenCalledWith('kho-01', 'CONN');
    expect(KhoHangRepository.dongBoTrangThaiMonAn).toHaveBeenCalledWith('kho-01', 'CONN');
  });
});
