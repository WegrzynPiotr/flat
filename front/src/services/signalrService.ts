import * as SignalR from '@microsoft/signalr';
import { API_BASE_URL } from '@env';

let connection: SignalR.HubConnection | null = null;
const messageCallbacks: Set<(message: any) => void> = new Set();

export const startSignalRConnection = async (token: string) => {
  if (connection && connection.state === SignalR.HubConnectionState.Connected) {
    console.log('SignalR already connected');
    return connection;
  }

  const hubUrl = API_BASE_URL.replace('/api', '') + '/chatHub';
  console.log('🔌 Connecting to SignalR hub:', hubUrl);
  console.log('🔑 Using token:', token.substring(0, 20) + '...');

  connection = new SignalR.HubConnectionBuilder()
    .withUrl(hubUrl, {
      accessTokenFactory: () => token,
      skipNegotiation: false,
      transport: SignalR.HttpTransportType.WebSockets | SignalR.HttpTransportType.LongPolling,
    })
    .withAutomaticReconnect()
    .configureLogging(SignalR.LogLevel.Debug)
    .build();

  connection.onreconnecting((error) => {
    console.log('⚠️ SignalR reconnecting:', error?.message);
  });

  connection.onreconnected((connectionId) => {
    console.log('✅ SignalR reconnected:', connectionId);
  });

  connection.onclose((error) => {
    console.log('❌ SignalR connection closed:', error?.message);
  });

  // Główny listener który rozgłasza do wszystkich subskrybentów
  connection.on('ReceiveMessage', (message) => {
    console.log('📨 SignalR received message, notifying', messageCallbacks.size, 'subscribers');
    messageCallbacks.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('Error in message callback:', error);
      }
    });
  });

  try {
    await connection.start();
    console.log('✅ SignalR connected successfully, state:', connection.state);
    console.log('✅ Connection ID:', connection.connectionId);
    return connection;
  } catch (error) {
    console.error('❌ SignalR connection error:', error);
    throw error;
  }
};

export const stopSignalRConnection = async () => {
  if (connection) {
    try {
      await connection.stop();
      console.log('SignalR connection stopped');
      connection = null;
      messageCallbacks.clear();
    } catch (error) {
      console.error('Error stopping SignalR:', error);
    }
  }
};

export const onReceiveMessage = (callback: (message: any) => void) => {
  messageCallbacks.add(callback);
  console.log('📨 Added message listener, total listeners:', messageCallbacks.size);
  
  // Zwróć funkcję do usunięcia listenera
  return () => {
    messageCallbacks.delete(callback);
    console.log('📨 Removed message listener, remaining:', messageCallbacks.size);
  };
};

export const offReceiveMessage = (callback?: (message: any) => void) => {
  if (callback) {
    messageCallbacks.delete(callback);
  } else {
    messageCallbacks.clear();
  }
  console.log('📨 Cleared message listeners, remaining:', messageCallbacks.size);
};

export const getConnection = () => connection;
