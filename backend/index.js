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
  console.log(`[API] GET /api/files — files: ${files.join(", ")}`);
  res.json(files);
});

app.get("/api/files/:name", async (req, res) => {
  const filePath = path.join(FILES_DIR, req.params.name);
  const content = await fs.readFile(filePath, "utf-8");
  console.log(`[API] GET /api/files/${req.params.name} — read file`);
  res.send(content);
});

app.post("/api/files/:name", async (req, res) => {
  const filePath = path.join(FILES_DIR, req.params.name);
  const isNewFile = !(await fs.pathExists(filePath));
  await fs.writeFile(filePath, req.body.content || "", "utf-8");
  console.log(
    `[API] POST /api/files/${req.params.name} — saved file${
      isNewFile ? " (new)" : ""
    }`
  );
  res.sendStatus(200);

  if (isNewFile) {
    io.emit("file-list-update");
    console.log(`[Socket] Emitted file-list-update (new file created)`);
  }
});

app.delete("/api/files/:name", async (req, res) => {
  const filePath = path.join(FILES_DIR, req.params.name);
  await fs.remove(filePath);
  console.log(`[API] DELETE /api/files/${req.params.name} — file deleted`);
  res.sendStatus(200);

  io.emit("file-list-update");
  console.log(`[Socket] Emitted file-list-update (file deleted)`);
});

// === Real-time Features ===

const users = {};
let currentFileContent = "";
const fileStates = {}; // { filename: code }
const socketToFile = {}; // { socket.id: filename }
io.on("connection", (socket) => {
  console.log(`[Socket] User connected: ${socket.id}`);

  socket.on("set-username", (username) => {
    users[socket.id] = username;
    console.log(`[Socket] Username set: ${username} (Socket ID: ${socket.id})`);
    socket.broadcast.emit("user-joined", `${username} joined the session`);
  });

  socket.on("select-file", (filename) => {
    socketToFile[socket.id] = filename;
    console.log(`[Socket] User ${users[socket.id]} selected file: ${filename}`);
    if (fileStates[filename]) {
      socket.emit("code-change", fileStates[filename]);
    }
  });

  socket.on("code-change", async ({ filename, code }) => {
    fileStates[filename] = code;
    console.log(
      `[Socket] Code changed on file "${filename}" by ${
        users[socket.id] || "Anonymous"
      }`
    );

    for (const [id, file] of Object.entries(socketToFile)) {
      if (file === filename && id !== socket.id) {
        io.to(id).emit("code-change", code);
        console.log(`[Socket] Broadcasting code change to ${id}`);
      }
    }

    // Auto-save to disk (if implemented)
    const filePath = path.join(FILES_DIR, filename);
    try {
      await fs.writeFile(filePath, code, "utf-8");
      console.log(`[FS] Saved file "${filename}" to disk`);
    } catch (err) {
      console.error(`[FS] Error saving file "${filename}":`, err);
    }
  });

  socket.on("chat-message", (msg) => {
    const username = users[socket.id] || "Anonymous";
    console.log(`[Chat] ${username}: ${msg}`);
    io.emit("chat-message", `${username}: ${msg}`);
  });

  socket.on("disconnect", () => {
    const username = users[socket.id];
    console.log(
      `[Socket] User disconnected: ${socket.id} (${username || "Anonymous"})`
    );
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
