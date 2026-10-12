const posClients = new Set();

// =====================================================
// Gửi dữ liệu tới một POS client
// =====================================================
function sendEvent(client, event, data) {
  try {
    client.write(
      `event: ${event}\n` +
      `data: ${JSON.stringify(data)}\n\n`
    );
    return true;
  } catch (err) {
    console.error(`[POS] Không thể gửi event ${event}:`, err.message);
    return false;
  }
}

// =====================================================
// GET /api/pos/stream
// Mở kết nối Server-Sent Events (SSE) cho Thu ngân / Phục vụ
// =====================================================
function subscribePOS(req, res) {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  posClients.add(res);
  console.log(`[POS] Đã kết nối client realtime. Tổng số: ${posClients.size}`);

  sendEvent(res, 'connected', {
    message: 'Connected to POS Realtime'
  });

  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch (err) {
      clearInterval(heartbeat);
    }
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    posClients.delete(res);
    console.log(`[POS] Ngắt kết nối. Còn lại: ${posClients.size}`);
  });
}

// =====================================================
// Broadcast event tới tất cả POS / Phục vụ clients
// =====================================================
function broadcastToPOS(event, data) {
  const disconnected = [];
  posClients.forEach((client) => {
    const success = sendEvent(client, event, data);
    if (!success) disconnected.push(client);
  });

  disconnected.forEach((client) => posClients.delete(client));
  console.log(`[POS] Broadcast "${event}" tới ${posClients.size} clients`);
}

// =====================================================
// Các event chuyên biệt
// =====================================================
function broadcastOrderCompleted(data) {
  broadcastToPOS('order-completed', data);
}

function broadcastMenuUpdated(data) {
  broadcastToPOS('menu-updated', data);
}

function broadcastTableUpdated(data) {
  broadcastToPOS('table-updated', data);
}

module.exports = {
  subscribePOS,
  broadcastToPOS,
  broadcastOrderCompleted,
  broadcastMenuUpdated,
  broadcastTableUpdated
};
