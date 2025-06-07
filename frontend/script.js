const socket = io();
const username = prompt("Enter your username:") || "Anonymous";
socket.emit("set-username", username);

require.config({
  paths: { vs: "https://unpkg.com/monaco-editor@0.44.0/min/vs" },
});
require(["vs/editor/editor.main"], function () {
  const editor = monaco.editor.create(document.getElementById("editor"), {
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
