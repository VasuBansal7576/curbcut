const enabled = document.querySelector("#jev-enabled");
const enabledStatus = document.querySelector("#jev-enabled-status");
chrome.storage.local.get("instantEnabled").then(settings => {
  enabled.checked = settings.instantEnabled === true;
  enabled.disabled = false;
}).catch(() => { enabledStatus.textContent = "Could not load the instant fix setting."; });

enabled.addEventListener("change", async () => {
  const checked = enabled.checked;
  try {
    await chrome.storage.local.set({ instantEnabled: checked });
    enabledStatus.textContent = checked ? "Instant fix enabled." : "Instant fix disabled.";
  } catch {
    enabled.checked = !checked;
    enabledStatus.textContent = "Could not save the instant fix setting.";
  }
});

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

function bindSwitch(id, key, label) {
  const toggle = document.querySelector("#" + id);
  const feedback = document.querySelector("#" + id + "-status");
  chrome.storage.local.get(key).then(settings => {
    toggle.checked = settings[key] === true;
    toggle.disabled = false;
  }).catch(() => { feedback.textContent = "Could not load the setting."; });
  toggle.addEventListener("change", async () => {
    const checked = toggle.checked;
    try {
      await chrome.storage.local.set({ [key]: checked });
      feedback.textContent = label + (checked ? " enabled." : " disabled.");
    } catch {
      toggle.checked = !checked;
      feedback.textContent = "Could not save the setting.";
    }
  });
}
bindSwitch("live-names", "liveNamesEnabled", "Live naming");
bindSwitch("stuck-detection", "stuckEnabled", "Keyboard help");

const evidenceForm = document.querySelector("#evidence-form");
const evidenceInput = document.querySelector("#evidence-base");
const evidenceStatus = document.querySelector("#evidence-status");
chrome.storage.local.get("evidenceBase").then(settings => {
  evidenceInput.value = settings.evidenceBase || "";
}).catch(() => { evidenceStatus.textContent = "Could not load the evidence URL."; });
evidenceForm.addEventListener("submit", async event => {
  event.preventDefault();
  const evidenceBase = evidenceInput.value.trim();
  try {
    const response = await chrome.runtime.sendMessage({ type: "SET_EVIDENCE_BASE", evidenceBase });
    evidenceStatus.textContent = response?.ok ? (evidenceBase ? "Evidence URL saved." : "Using the GitHub evidence archive.") : "Evidence URL rejected.";
  } catch {
    evidenceStatus.textContent = "Could not save the evidence URL.";
  }
});
