const { broadcastNewOrder } = require('../realtime/kds');

// Kitchen Display System
// Gui order xuong man hinh bep qua realtime SSE
class KdsService {
  static async guiOrder(order) {
    try {
      broadcastNewOrder(order);
    } catch (err) {
      console.error('[KDS] Lỗi phát broadcast:', err.message);
    }
    return true;
  }
}

module.exports = KdsService;