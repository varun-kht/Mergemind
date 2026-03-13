import http from "http";
import { Server } from "socket.io";
import app from "./app.js";

const PORT = process.env.PORT || 3000;

// Wrap express app
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: { origin: "*" } 
});

// Pass io to the app context
app.set("io", io);

io.on("connection", (socket) => {
  console.log("🖥️  Dashboard Connected");
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});