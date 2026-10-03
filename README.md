# Lan May Cafe - Nhom 5

He thong quan ly quan cafe, kien truc 3 tang, Node.js + Express + MySQL 8.

## Cai dat

Yeu cau: Node.js >= 18, MySQL 8.

```bash
npm install
cp .env.example .env   # sua DB_USER, DB_PASSWORD cho khop may
npm run dev            # http://localhost:3000
npm test
```

CSDL: chay `docs/db/schema.sql` roi `docs/db/seed.sql` (An cung cap).

## Tai khoan test

Cap nhat sau khi co seed.sql (An).

## Cau truc va tang

| Thu muc | Tang |
|---|---|
| `src/public` | Giao dien (presentation) |
| `src/routes`, `src/controllers`, `src/middlewares` | Dieu phoi / API |
| `src/services`, `src/dto` | Nghiep vu (business) |
| `src/repositories`, `src/models`, `src/config/db.js` | Du lieu (data) |
| `docs` | Tai lieu, API contract, SQL |
| `tests` | Test |

## Quy uoc

- Response: `{ success, data, maLoi, message }`.
- Nhanh: `main` (chi Tuan merge), `develop`, moi UC 1 nhanh `feature/uc01-tao-order`; vao `develop` qua Pull Request.
- Commit: `feat(order): kiem tra mon het truoc khi luu #UC-01`.
- Danh so UC theo UC diagram cuoi (UC01-UC25).
