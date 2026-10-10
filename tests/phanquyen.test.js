jest.mock('../src/services/OrderService');
jest.mock('../src/services/PaymentService');
jest.mock('../src/config/db', () => ({ withTransaction: jest.fn(), pool: { query: jest.fn() } }));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const config = require('../src/config');
const OrderService = require('../src/services/OrderService');
const PaymentService = require('../src/services/PaymentService');
const app = require('../src/app');

const token = (vaiTro) => 'Bearer ' + jwt.sign({ nhanVienId: 'nv-test', hoTen: 'Test', vaiTro }, config.jwt.secret);

// [method, duong dan, cac vai tro duoc phep] - theo api-contract.md muc 2
const ROUTES = [
  ['get', '/api/tables', ['PHUC_VU', 'THU_NGAN']],
  ['get', '/api/menu', ['PHUC_VU']],
  ['get', '/api/orders/dh-001', ['PHUC_VU', 'THU_NGAN']],
  ['post', '/api/orders', ['PHUC_VU']],
  ['post', '/api/orders/dh-001/items', ['PHUC_VU']],
  ['patch', '/api/orders/dh-001/items/ct-001', ['PHUC_VU']],
  ['delete', '/api/orders/dh-001/items/ct-001', ['PHUC_VU']],
  ['get', '/api/tables/ban-01/current-order', ['PHUC_VU', 'THU_NGAN']],
  ['get', '/api/orders/dh-001/invoice', ['THU_NGAN']],
  ['post', '/api/payments', ['THU_NGAN']],
];
const TAT_CA = ['PHUC_VU', 'BARISTA', 'THU_NGAN', 'CHU_QUAN'];

beforeEach(() => {
  jest.resetAllMocks();
  for (const fn of Object.values(OrderService)) if (jest.isMockFunction(fn)) fn.mockResolvedValue({});
  for (const fn of Object.values(PaymentService)) if (jest.isMockFunction(fn)) fn.mockResolvedValue({});
});

describe.each(ROUTES)('phan quyen %s %s', (method, url, duocPhep) => {
  test('khong co token -> 401 CHUA_DANG_NHAP', async () => {
    const res = await request(app)[method](url).send({});
    expect(res.status).toBe(401);
    expect(res.body.maLoi).toBe('CHUA_DANG_NHAP');
  });

  test('token sai -> 401', async () => {
    const res = await request(app)[method](url).set('Authorization', 'Bearer abc.def.ghi').send({});
    expect(res.status).toBe(401);
  });

  test.each(TAT_CA)('vai tro %s', async (vaiTro) => {
    const res = await request(app)[method](url).set('Authorization', token(vaiTro)).send({});
    if (duocPhep.includes(vaiTro)) {
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    } else {
      expect(res.status).toBe(403);
      expect(res.body.maLoi).toBe('KHONG_CO_QUYEN');
    }
  });
});

test('health va dang nhap khong can token', async () => {
  expect((await request(app).get('/api/health')).status).toBe(200);
});
