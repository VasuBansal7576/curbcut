const button = document.getElementById("instant-fix");
const status = document.getElementById("instant-status");

document.getElementById("instant-settings").addEventListener("click", () => chrome.runtime.openOptionsPage());
button.addEventListener("click", async () => {
  button.disabled = true;
  status.textContent = "Looking for a fix…";
  try {
    const { pendingStuck, capturedTabId } = await chrome.storage.local.get(["pendingStuck", "capturedTabId"]);
    const result = await chrome.runtime.sendMessage({ type: "RUN_INSTANT", capturedTabId: pendingStuck ? capturedTabId : undefined });
    status.textContent = result?.ok ? "Fixed for you · unverified. Press Escape on the page to undo." : "Can’t fix this one yet.";
  } catch { status.textContent = "Can’t fix this one yet."; }
  finally { button.disabled = false; }
});
