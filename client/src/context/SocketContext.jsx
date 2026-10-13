import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

function getSocketUrl() {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  if (typeof window !== 'undefined' && (window.location.port === '3000' || window.location.port === '5173')) {
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }
  return '/';
}

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Initialize socket connection once
  useEffect(() => {
    const socketUrl = getSocketUrl();
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      const currentUser = userRef.current;
      if (currentUser?.id) {
        newSocket.emit('join_user', currentUser.id);
        if (currentUser.role === 'Staff') {
          newSocket.emit('join_staff');
        } else if (currentUser.role === 'Admin') {
          newSocket.emit('join_admin');
          newSocket.emit('join_staff');
        }
      }
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('presence_update', (data) => {
      if (data?.onlineCount !== undefined) {
        setOnlineCount(data.onlineCount);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Update room subscriptions whenever active user or role changes
  useEffect(() => {
    if (!socket || !socket.connected) return;

    if (user?.id) {
      socket.emit('join_user', user.id);
      if (user.role === 'Staff') {
        socket.emit('join_staff');
        socket.emit('leave_admin');
      } else if (user.role === 'Admin') {
        socket.emit('join_admin');
        socket.emit('join_staff');
      } else {
        socket.emit('leave_staff');
        socket.emit('leave_admin');
      }
    }
  }, [socket, user]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, onlineCount }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}

