const socket = io();

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

socket.on("chat-message", (msg) => {
  const div = document.createElement("div");
  div.textContent = msg;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
});
