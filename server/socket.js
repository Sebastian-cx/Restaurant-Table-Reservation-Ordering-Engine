let ioInstance = null;

function initSocket(io) {
  ioInstance = io;

  io.on('connection', (socket) => {
    // Notify clients of updated online presence count
    const onlineCount = io.engine.clientsCount;
    io.emit('presence_update', { onlineCount });

    // Client joins room for specific user ID
    socket.on('join_user', (userId) => {
      if (userId) {
        const room = `user_${userId}`;
        socket.join(room);
      }
    });

    // Client leaves user room
    socket.on('leave_user', (userId) => {
      if (userId) {
        socket.leave(`user_${userId}`);
      }
    });

    // Client joins room for specific restaurant ID
    socket.on('join_restaurant', (restaurantId) => {
      if (restaurantId) {
        socket.join(`restaurant_${restaurantId}`);
      }
    });

    // Staff/Kitchen joins staff room
    socket.on('join_staff', () => {
      socket.join('staff_room');
    });

    // Staff leaves staff room
    socket.on('leave_staff', () => {
      socket.leave('staff_room');
    });

    // Platform Admin joins admin room
    socket.on('join_admin', () => {
      socket.join('admin_room');
    });

    // Admin leaves admin room
    socket.on('leave_admin', () => {
      socket.leave('admin_room');
    });

    // Customer or delivery agent joins specific order room
    socket.on('join_order', (orderId) => {
      if (orderId) {
        socket.join(`order_${orderId}`);
      }
    });

    // Client sends direct socket ping / health
    socket.on('ping_server', (callback) => {
      if (typeof callback === 'function') {
        callback({ status: 'ok', time: new Date().toISOString() });
      }
    });

    socket.on('disconnect', () => {
      const remainingCount = io.engine.clientsCount;
      io.emit('presence_update', { onlineCount: remainingCount });
    });
  });

  return ioInstance;
}

function getIO() {
  return ioInstance;
}

function broadcastEvent(eventName, payload) {
  if (ioInstance) {
    ioInstance.emit(eventName, payload);
  }
}

function emitToUser(userId, eventName, payload) {
  if (ioInstance && userId) {
    ioInstance.to(`user_${userId}`).emit(eventName, payload);
  }
}

function emitToStaff(eventName, payload) {
  if (ioInstance) {
    ioInstance.to('staff_room').emit(eventName, payload);
    // Also notify admin room so administrators have real-time visibility
    ioInstance.to('admin_room').emit(eventName, payload);
  }
}

function emitToAdmin(eventName, payload) {
  if (ioInstance) {
    ioInstance.to('admin_room').emit(eventName, payload);
  }
}

function emitToOrder(orderId, eventName, payload) {
  if (ioInstance && orderId) {
    ioInstance.to(`order_${orderId}`).emit(eventName, payload);
  }
}

module.exports = {
  initSocket,
  getIO,
  broadcastEvent,
  emitToUser,
  emitToStaff,
  emitToAdmin,
  emitToOrder
};
