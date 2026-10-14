// Chay voi MySQL that: nhieu yeu cau thanh toan cung luc cho 1 don (ma giao dich khac nhau)
// chi duoc 1 yeu cau thanh cong. Dung don mau dh-002 (ban-04) va tra lai nguyen trang sau khi chay.
const { pool } = require('../src/config/db');
const PaymentService = require('../src/services/PaymentService');

const DON = 'dh-002';
const BAN = 'ban-04';

async function datLai() {
  await pool.query('DELETE FROM thanh_toan WHERE ma_giao_dich LIKE ?', ['RACE-%']);
  await pool.query("UPDATE don_hang SET trang_thai = 'HOAN_THANH' WHERE id = ?", [DON]);
  await pool.query("UPDATE ban SET trang_thai = 'DANG_PHUC_VU' WHERE id = ?", [BAN]);
}

beforeAll(datLai);
afterAll(async () => {
  await datLai();
  await pool.end();
});

test('5 yeu cau thanh toan song song cho cung 1 don: dung 1 thanh cong, 4 bi tu choi 409', async () => {
  const ketQua = await Promise.allSettled(
    [1, 2, 3, 4, 5].map((i) => PaymentService.processPayment({
      donHangId: DON, phuongThuc: 'QR', maGiaoDich: `RACE-${i}`,
    })),
  );

  const thanhCong = ketQua.filter((r) => r.status === 'fulfilled');
  const biChan = ketQua.filter((r) => r.status === 'rejected');
  expect(thanhCong).toHaveLength(1);
  expect(biChan.map((r) => r.reason.maLoi)).toEqual(Array(4).fill('DON_DA_THANH_TOAN'));

  const [[{ soLan }]] = await pool.query(
    "SELECT COUNT(*) AS soLan FROM thanh_toan WHERE don_hang_id = ? AND ma_giao_dich LIKE 'RACE-%'", [DON],
  );
  expect(soLan).toBe(1);
});
