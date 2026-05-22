window.addEventListener("error", (e) => {
  const s = document.getElementById("status");
  if (s) {
    s.textContent =
      "Startup error:\n" +
      e.message +
      "\n" +
      (e.filename || "") +
      ":" +
      (e.lineno || "");
  }
});

window.addEventListener("unhandledrejection", (e) => {
  const s = document.getElementById("status");
  if (s) {
    s.textContent =
      "Promise error:\n" + (e.reason?.message || String(e.reason));
  }
});
