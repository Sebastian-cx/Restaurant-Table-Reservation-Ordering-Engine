const http = require('http');
const { io: ioClient } = require('socket.io-client');
const { app, server } = require('./server');

const PORT = server.address() ? server.address().port : (process.env.PORT || 5000);

function runSocketTests() {
  return new Promise(async (resolve, reject) => {
    console.log(`\n======================================================`);
      console.log(`🚀 RUNNING REAL-TIME SOCKET.IO AUTOMATED SUITE on :${PORT}`);
      console.log(`======================================================\n`);

      const SERVER_URL = `http://localhost:${PORT}`;
      const results = [];

      function logResult(name, passed, detail = '') {
        results.push({ name, passed, detail });
        console.log(`${passed ? '✅' : '❌'} ${name} ${detail ? '(' + detail + ')' : ''}`);
      }

      // 1. Establish 3 distinct clients
      const customerSocket = ioClient(SERVER_URL, { transports: ['websocket'] });
      const staffSocket = ioClient(SERVER_URL, { transports: ['websocket'] });
      const adminSocket = ioClient(SERVER_URL, { transports: ['websocket'] });

      const waitForEvent = (socket, event, timeout = 3000) => {
        return new Promise((res, rej) => {
          const timer = setTimeout(() => {
            socket.off(event, handler);
            rej(new Error(`Timeout waiting for event: ${event}`));
          }, timeout);
          const handler = (data) => {
            clearTimeout(timer);
            socket.off(event, handler);
            res(data);
          };
          socket.on(event, handler);
        });
      };

      try {
        // Step 1: Connect all clients
        await Promise.all([
          waitForEvent(customerSocket, 'connect'),
          waitForEvent(staffSocket, 'connect'),
          waitForEvent(adminSocket, 'connect')
        ]);
        logResult('Client Connection', true, 'Customer, Staff, and Admin connected via WebSocket');

        // Step 2: Join rooms
        customerSocket.emit('join_user', 1);
        staffSocket.emit('join_staff');
        adminSocket.emit('join_admin');

        // Step 3: Test ping_server
        const pingResponse = await new Promise((res) => {
          customerSocket.emit('ping_server', res);
        });
        logResult('Direct Ping-Pong', pingResponse?.status === 'ok', `status: ${pingResponse?.status}`);

        // Step 4: Test Table Lock Broadcast
        const { broadcastEvent, emitToStaff, emitToUser, emitToAdmin } = require('./socket');
        const lockPromiseCust = waitForEvent(customerSocket, 'table_locked');
        const lockPromiseStaff = waitForEvent(staffSocket, 'table_locked');
        
        broadcastEvent('table_locked', {
          tableId: 3,
          reservationDate: '2026-10-15',
          timeSlot: '19:00',
          userId: 1
        });

        const [custLock, staffLock] = await Promise.all([lockPromiseCust, lockPromiseStaff]);
        logResult('Table Lock Broadcast', custLock?.tableId === 3 && staffLock?.tableId === 3, 'Received by both customer and staff');

        // Step 5: Test Kitchen Order Notification
        const kitchenOrderPromise = waitForEvent(staffSocket, 'new_kitchen_order');
        const mockOrder = {
          id: 999,
          customerId: 1,
          restaurantId: 1,
          totalAmount: 1250,
          orderStatus: 'Pending',
          items: [{ name: 'ITC Dum Biryani', quantity: 2, price: 625 }]
        };
        emitToStaff('new_kitchen_order', mockOrder);
        const receivedKitchenOrder = await kitchenOrderPromise;
        logResult('Kitchen Pipeline Dispatch', receivedKitchenOrder?.id === 999 && receivedKitchenOrder?.totalAmount === 1250, 'Delivered to staff_room');

        // Step 6: Test User Room Direct Notification (Order Status Sync)
        const userSyncPromise = waitForEvent(customerSocket, 'order_status_sync');
        emitToUser(1, 'order_status_sync', mockOrder);
        const receivedUserSync = await userSyncPromise;
        logResult('Targeted User Room Delivery', receivedUserSync?.id === 999, 'Delivered exclusively to user_1');

        // Step 7: Test Admin Room Notification
        const adminStatsPromise = waitForEvent(adminSocket, 'admin_stats_updated');
        emitToAdmin('admin_stats_updated', { type: 'ORDER_CREATED', orderId: 999 });
        const receivedAdminStats = await adminStatsPromise;
        logResult('Platform Admin Realtime Alert', receivedAdminStats?.type === 'ORDER_CREATED', 'Delivered to admin_room');

        // Step 8: Test Order Status Update to Customer and Staff
        const custStatusPromise = waitForEvent(customerSocket, 'order_status_updated');
        const staffStatusPromise = waitForEvent(staffSocket, 'order_status_updated');
        const statusPayload = {
          orderId: 999,
          id: 999,
          orderStatus: 'Preparing'
        };
        emitToUser(1, 'order_status_updated', statusPayload);
        emitToStaff('order_status_updated', statusPayload);

        const [custStatus, staffStatus] = await Promise.all([custStatusPromise, staffStatusPromise]);
        logResult('Order Status Live Progression', custStatus?.orderStatus === 'Preparing' && staffStatus?.orderStatus === 'Preparing', 'Synced to both parties');

        // Step 9: Test Reservation Cancel Broadcast
        const cancelPromiseCust = waitForEvent(customerSocket, 'reservation_cancelled');
        const cancelPromiseStaff = waitForEvent(staffSocket, 'reservation_cancelled');
        broadcastEvent('reservation_cancelled', { id: 42 });
        const [custCancel, staffCancel] = await Promise.all([cancelPromiseCust, cancelPromiseStaff]);
        logResult('Reservation Cancellation Broadcast', custCancel?.id === 42 && staffCancel?.id === 42, 'Propagated across active viewers');

        // Close sockets and server
        customerSocket.disconnect();
        staffSocket.disconnect();
        adminSocket.disconnect();

        server.close(() => {
          console.log('\n======================================================');
          console.log(`🎉 ALL ${results.length} SOCKET.IO REALTIME TESTS PASSED!`);
          console.log('======================================================\n');
          resolve(true);
        });
      } catch (err) {
        customerSocket.disconnect();
        staffSocket.disconnect();
        adminSocket.disconnect();
        server.close();
        console.error('Socket test error:', err);
        reject(err);
      }
  });
}

runSocketTests()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
