let currentFile = null;

async function loadFiles() {
  const res = await fetch("/api/files");
  const files = await res.json();
  const list = document.getElementById("fileList");
  list.innerHTML = "";
  files.forEach((file) => {
    const li = document.createElement("li");
    li.textContent = file;
    li.onclick = () => selectFile(file);
    list.appendChild(li);
  });
}
async function selectFile(file) {
  const res = await fetch(`/api/files/${file}`);
  const content = await res.text();
  currentFile = file;
  editor.setValue(content);
  socket.emit("select-file", file);
  highlightActiveFile(file);
}

function highlightActiveFile(name) {
  const listItems = document.querySelectorAll("#fileList li");
  listItems.forEach((li) => {
    if (li.textContent === name) {
      li.classList.add("active");
    } else {
      li.classList.remove("active");
    }
  });
}

async function createFile() {
  const name = document.getElementById("newFileInput").value.trim();
  if (!name) return;
  await fetch(`/api/files/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: "" }),
  });
  document.getElementById("newFileInput").value = "";
  loadFiles();
}

async function saveCurrentFile() {
  if (!currentFile) return alert("No file selected");
  await fetch(`/api/files/${currentFile}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: editor.getValue() }),
  });
  alert("File saved!");
}

const socket = io();
const username = prompt("Enter your username:") || "Anonymous";
socket.emit("set-username", username);

require.config({
  paths: { vs: "https://unpkg.com/monaco-editor@0.44.0/min/vs" },
});
// require(["vs/editor/editor.main"], function () {
//   const editor = monaco.editor.create(document.getElementById("editor"), {
//     value: "// Start coding...",
//     language: "javascript",
//     theme: "vs-dark",
//     automaticLayout: true,
//   });

//   editor.onDidChangeModelContent(() => {
//     const code = editor.getValue();
//     socket.emit("code-change", code);
//   });

//   socket.on("code-change", (code) => {
//     if (editor.getValue() !== code) {
//       editor.setValue(code);
//     }
//   });
// });
let editor;

require(["vs/editor/editor.main"], function () {
  editor = monaco.editor.create(document.getElementById("editor"), {
    value: "// Start coding...",
    language: "javascript",
    theme: "vs-dark",
    automaticLayout: true,
  });

  editor.onDidChangeModelContent(() => {
    const code = editor.getValue();
    socket.emit("code-change", code);
  });

  socket.on("code-change", (code) => {
    if (editor.getValue() !== code) {
      editor.setValue(code);
    }
  });

  loadFiles();
});

const msgInput = document.getElementById("messageInput");
const messages = document.getElementById("messages");

msgInput.addEventListener("keypress", function (e) {
  if (e.key === "Enter" && this.value.trim()) {
    socket.emit("chat-message", this.value);
    this.value = "";
  }
});

function appendSystemMessage(msg) {
  const div = document.createElement("div");
  div.style.color = "#888";
  div.style.fontStyle = "italic";
  div.textContent = msg;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function appendChatMessage(msg) {
  const div = document.createElement("div");
  div.textContent = msg;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

socket.on("chat-message", appendChatMessage);
socket.on("user-joined", appendSystemMessage);
socket.on("user-left", appendSystemMessage);
socket.on("file-list-update", () => {
  loadFiles(); // refresh file list when notified
});
