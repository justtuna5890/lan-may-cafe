const mysql = require('mysql2/promise');
const config = require('./index');

// Pool dung chung cho tat ca repository
const pool = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true, // DECIMAL(12,2) tra ve number thay vi string
});

// Chay nhieu cau lenh trong 1 transaction (UC10: 3 thao tac ghi, loi thi rollback)
async function withTransaction(work) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { pool, withTransaction };
