const kdsClients = new Set();


// =====================================================
// Gửi dữ liệu tới một KDS client
// =====================================================
function sendEvent(client, event, data) {

  try {

    client.write(
      `event: ${event}\n` +
      `data: ${JSON.stringify(data)}\n\n`
    );

    return true;

  } catch (err) {

    console.error(
      `[KDS] Không thể gửi event ${event}:`,
      err.message
    );

    return false;
  }
}


// =====================================================
// GET /api/kds/stream
//
// Mở kết nối Server-Sent Events (SSE)
// =====================================================
function subscribeKDS(req, res) {

  // -------------------------------------------------
  // Headers bắt buộc cho SSE
  // -------------------------------------------------

  res.setHeader(
    'Content-Type',
    'text/event-stream; charset=utf-8'
  );

  res.setHeader(
    'Cache-Control',
    'no-cache, no-transform'
  );

  res.setHeader(
    'Connection',
    'keep-alive'
  );

  // Một số proxy hỗ trợ header này để tránh buffering
  res.setHeader(
    'X-Accel-Buffering',
    'no'
  );

  // Gửi headers ngay lập tức
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }


  // -------------------------------------------------
  // Thêm client vào danh sách
  // -------------------------------------------------

  kdsClients.add(res);

  console.log(
    `[KDS] Đã kết nối. Tổng số màn hình: ${kdsClients.size}`
  );


  // -------------------------------------------------
  // Gửi event xác nhận kết nối
  // -------------------------------------------------

  sendEvent(
    res,
    'connected',
    {
      message: 'Connected to KDS Realtime'
    }
  );


  // -------------------------------------------------
  // Heartbeat
  //
  // Giúp giữ connection không bị proxy/server
  // đóng khi không có order mới.
  // -------------------------------------------------

  const heartbeat = setInterval(() => {

    try {

      res.write(': heartbeat\n\n');

    } catch (err) {

      clearInterval(heartbeat);
    }

  }, 30000);


  // -------------------------------------------------
  // Khi client đóng connection
  // -------------------------------------------------

  req.on('close', () => {

    clearInterval(heartbeat);

    kdsClients.delete(res);

    console.log(
      `[KDS] Ngắt kết nối. Còn lại: ${kdsClients.size}`
    );
  });
}


// =====================================================
// Broadcast event tới tất cả KDS
// =====================================================
function broadcast(event, data) {

  const disconnectedClients = [];

  kdsClients.forEach((client) => {

    const success = sendEvent(
      client,
      event,
      data
    );

    if (!success) {
      disconnectedClients.push(client);
    }
  });


  // Xóa client chết
  disconnectedClients.forEach((client) => {
    kdsClients.delete(client);
  });


  console.log(
    `[KDS] Broadcast "${event}" tới ${kdsClients.size} màn hình`
  );
}


// =====================================================
// Order mới
//
// Được OrderService gọi sau khi:
// DB transaction COMMIT
// + KDS sync đã xử lý
// =====================================================
function broadcastNewOrder(orderData) {

  broadcast(
    'new-order',
    orderData
  );
}


// =====================================================
// Order được cập nhật
//
// Ví dụ:
// - thêm món
// - thay đổi số lượng
// =====================================================
function broadcastOrderUpdated(orderData) {

  broadcast(
    'order-updated',
    orderData
  );
}


// =====================================================
// Món bị hủy
// =====================================================
function broadcastItemCancelled(orderData) {

  broadcast(
    'item-cancelled',
    orderData
  );
}


// =====================================================
// Xuất module
// =====================================================
module.exports = {
  subscribeKDS,
  broadcastNewOrder,
  broadcastOrderUpdated,
  broadcastItemCancelled
};