import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../shared/types';

export const useSocket = () => {
  // Create the socket once, but don't connect until the effect runs
  // (connect-on-mount keeps StrictMode's double-invoke balanced)
  const [socket] = useState<Socket<ServerToClientEvents, ClientToServerEvents>>(() =>
    // Connect to same origin (single port deployment)
    io({ autoConnect: false })
  );

  useEffect(() => {
    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, [socket]);

  return socket;
};
