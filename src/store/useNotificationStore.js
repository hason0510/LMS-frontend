import { create } from 'zustand';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getMyNotifications, countUnreadNotifications, markNotificationAsRead as apiMarkAsRead } from '../api/notification';
import { notification as antdNotification } from 'antd';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8081";

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  stompClient: null,
  isConnected: false,

  fetchNotifications: async () => {
    try {
      const res = await getMyNotifications();
      // res is ApiResponse { code, message, data: [...] }
      const data = res.data || [];
      set({ notifications: Array.isArray(data) ? data : [] });
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  },

  fetchUnreadCount: async () => {
    try {
      const res = await countUnreadNotifications();
      // res is ApiResponse { code, message, data: number }
      const count = res.data;
      set({ unreadCount: typeof count === 'number' ? count : 0 });
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  },

  markAsRead: async (id) => {
    try {
      await apiMarkAsRead(id);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, readStatus: true, isRead: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  },

  connect: (userId) => {
    if (get().isConnected || !userId) return;

    const socket = new SockJS(`${BACKEND_URL}/ws`);
    const client = new Client({
      webSocketFactory: () => socket,
      debug: (str) => {
        // console.log(str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.onConnect = (frame) => {
      set({ isConnected: true, stompClient: client });
      // console.log('Connected to WebSocket');

      client.subscribe(`/topic/notifications/${userId}`, (message) => {
        const newNotification = JSON.parse(message.body);
        
        // Add to list and play sound or show toast
        set((state) => ({
          notifications: [newNotification, ...state.notifications],
          unreadCount: state.unreadCount + 1,
        }));

        // Show Real-time Toast
        antdNotification.info({
          message: newNotification.title || 'Thông báo mới',
          description: newNotification.summary || newNotification.description || newNotification.message,
          placement: 'topRight',
          duration: 4.5,
        });
      });
    };

    client.onStompError = (frame) => {
      console.error('STOMP Error:', frame.headers['message']);
      console.error('STOMP Details:', frame.body);
      set({ isConnected: false });
    };

    client.onDisconnect = () => {
      set({ isConnected: false, stompClient: null });
      // console.log('Disconnected from WebSocket');
    };

    client.activate();
  },

  disconnect: () => {
    const { stompClient } = get();
    if (stompClient) {
      stompClient.deactivate();
      set({ isConnected: false, stompClient: null });
    }
  },
}));

export default useNotificationStore;
