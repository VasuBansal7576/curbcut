const form = document.querySelector("#jev-form");
const input = document.querySelector("#jev-key");
const status = document.querySelector("#jev-status");

CurbCutJevConfig.get().then(key => {
  status.textContent = key ? "A personal key is saved. Enter a replacement, or save an empty field to clear it." :
    "Using the local Curb Cut server.";
}).catch(() => { status.textContent = "Could not open instant fix settings."; });

form.addEventListener("submit", async event => {
  event.preventDefault();
  try {
    const key = input.value.trim();
    await CurbCutJevConfig.set(key);
    input.value = "";
    status.textContent = key ? "Personal key saved on this browser." : "Using the local Curb Cut server.";
  } catch { status.textContent = "Could not save settings."; }
});
