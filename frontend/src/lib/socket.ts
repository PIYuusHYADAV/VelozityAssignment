import { io, Socket } from 'socket.io-client'; import { API } from './api';
export const connectSocket = (token: string): Socket => io(API, { auth: { token }, transports: ['websocket'] });
