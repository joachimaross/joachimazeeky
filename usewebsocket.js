import { useState, useEffect, useRef } from 'react';

const useWebSocket = (url) => {
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef(null);
  // Use a ref to store a unique client ID for the duration of the component's life
  const clientId = useRef(`zeeky-client-${Date.now()}-${Math.random()}`);

  useEffect(() => {
    if (!url) return;

    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.current.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    ws.current.onmessage = (event) => {
      // We only receive messages from other clients, so the sender is always 'other'.
      try {
        const receivedData = JSON.parse(event.data);
        // We can add more validation here if needed
        const message = { text: receivedData.text, sender: 'other' };
        setMessages((prevMessages) => [...prevMessages, message]);
      } catch (error) {
        console.error("Failed to parse incoming message:", event.data);
      }
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      if (ws.current) ws.current.close();
    };
  }, [url]);

  const sendMessage = (messageText) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      // Optimistically update our own UI
      const ownMessage = { text: messageText, sender: 'me' };
      setMessages((prevMessages) => [...prevMessages, ownMessage]);

      // Prepare and send the message to the server
      const payload = {
        text: messageText,
        clientId: clientId.current,
      };
      ws.current.send(JSON.stringify(payload));
    }
  };

  return { messages, sendMessage, isConnected };
};

export default useWebSocket;
