const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs-extra");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const FILES_DIR = path.join(__dirname, "../files");
fs.ensureDirSync(FILES_DIR);

app.use(express.static(path.join(__dirname, "../frontend")));
app.use(express.json());

// === API Endpoints for File Operations ===

app.get("/api/files", async (req, res) => {
  const files = await fs.readdir(FILES_DIR);
  res.json(files);
});

app.get("/api/files/:name", async (req, res) => {
  const filePath = path.join(FILES_DIR, req.params.name);
  if (await fs.pathExists(filePath)) {
    const content = await fs.readFile(filePath, "utf-8");
    res.send(content);
  } else {
    res.status(404).send("File not found");
  }
});

app.post("/api/files/:name", async (req, res) => {
  const filePath = path.join(FILES_DIR, req.params.name);
  await fs.writeFile(filePath, req.body.content || "", "utf-8");
  res.sendStatus(200);
});

app.delete("/api/files/:name", async (req, res) => {
  const filePath = path.join(FILES_DIR, req.params.name);
  await fs.remove(filePath);
  res.sendStatus(200);
});

// === Real-time Features ===

const users = {};
let currentFileContent = "";
const fileStates = {}; // { filename: code }
const socketToFile = {}; // { socket.id: filename }

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("set-username", (username) => {
    users[socket.id] = username;
    socket.broadcast.emit("user-joined", `${username} joined the session`);
  });

  socket.on("select-file", (filename) => {
    socketToFile[socket.id] = filename;
    if (fileStates[filename]) {
      socket.emit("code-change", fileStates[filename]);
    }
  });

  socket.on("code-change", ({ filename, code }) => {
    fileStates[filename] = code;
    for (const [id, file] of Object.entries(socketToFile)) {
      if (file === filename && id !== socket.id) {
        io.to(id).emit("code-change", code);
      }
    }
  });

  socket.on("chat-message", (msg) => {
    const username = users[socket.id] || "Anonymous";
    io.emit("chat-message", `${username}: ${msg}`);
  });

  socket.on("disconnect", () => {
    const username = users[socket.id];
    if (username) {
      socket.broadcast.emit("user-left", `${username} left the session`);
      delete users[socket.id];
    }
    delete socketToFile[socket.id];
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
