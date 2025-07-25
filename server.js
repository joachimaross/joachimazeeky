const http = require('http');
const websocket = require('websocket-driver');

// Store all active client connections
const clients = new Set();

const server = http.createServer((req, res) => {
  // Handle regular HTTP requests if needed, e.g. serving a client HTML file.
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket server for chat is running. Please connect with a WebSocket client.');
});

server.on('upgrade', (request, socket, body) => {
  if (!websocket.isWebSocket(request)) {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    return;
  }

  const driver = websocket.http(request);

  // Add the new client to our set of clients
  clients.add(driver);
  console.log('Client connected. Total clients:', clients.size);

  // Pipe the socket to the driver and back.
  socket.pipe(driver.io).pipe(socket);
  // The `upgrade` event might have a body if the client sends one.
  driver.io.write(body);

  driver.messages.on('data', (message) => {
    console.log('Received message:', message);
    // Broadcast the message to all OTHER connected clients.
    for (const client of clients) {
      // The client that sent the message will handle its own UI update optimistically.
      if (client !== driver && client.state === 'open') {
        client.text(message);
      }
    }
  });

  driver.on('close', (event) => {
    console.log('Client disconnected. Code:', event.code, 'Reason:', event.reason);
    clients.delete(driver);
    console.log('Total clients:', clients.size);
  });

  driver.on('error', (error) => {
    console.error('Driver error:', error.message);
  });

  driver.start();
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server is listening for WebSocket connections on port ${PORT}`);
});