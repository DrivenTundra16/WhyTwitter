const TWITTER_PATTERNS = [
  "twitter.com",
  "www.twitter.com",
  "x.com",
  "www.x.com"
];

const ALLOW_DURATION_MIN = 5; // 5 minutes per tab
const ALLOW_DURATION_MS = ALLOW_DURATION_MIN * 60 * 1000;

console.log("Why Twitter extension loaded");

function isTwitterUrl(url) {
  try {
    const hostname = new URL(url).hostname;
    return TWITTER_PATTERNS.includes(hostname);
  } catch {
    return false;
  }
}

async function isTabAllowed(tabId) {
  const result = await chrome.storage.local.get(`tab_${tabId}`);
  const tabData = result[`tab_${tabId}`];

  if (tabData && tabData.expiresAt) {
    if (Date.now() < tabData.expiresAt) {
      return true;
    } else {
      // Clean up expired tab allowance
      await chrome.storage.local.remove(`tab_${tabId}`);
      await chrome.alarms.clear(`expire_tab_${tabId}`);
    }
  }

  return false;
}

async function blockTab(tabId) {
  const blockUrl = chrome.runtime.getURL("block.html") + `?tabId=${tabId}`;
  try {
    await chrome.tabs.update(tabId, { url: blockUrl });
  } catch (e) {
    // Tab may have been closed
    console.log(`Could not block tab ${tabId}:`, e.message);
  }
}

// Listen for navigation to Twitter/X
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  // Only handle main frame navigations
  if (details.frameId !== 0) return;

  if (!isTwitterUrl(details.url)) return;

  const allowed = await isTabAllowed(details.tabId);

  if (!allowed) {
    // Store the intended URL so we can redirect after approval
    await chrome.storage.local.set({
      [`pending_${details.tabId}`]: details.url
    });
    await blockTab(details.tabId);
  }
});

// Log a reason to storage
async function logReason(reason) {
  const result = await chrome.storage.local.get("reason_log");
  const log = result.reason_log || [];

  log.unshift({
    reason: reason,
    timestamp: Date.now()
  });

  // Keep only last 50 entries
  if (log.length > 50) {
    log.length = 50;
  }

  await chrome.storage.local.set({ reason_log: log });
}

// Listen for messages from block.html
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "ALLOW_ACCESS") {
    const tabId = message.tabId;
    const reason = message.reason;

    (async () => {
      // Log the reason
      if (reason) {
        await logReason(reason);
      }

      // Mark this specific tab as allowed with expiry
      await chrome.storage.local.set({
        [`tab_${tabId}`]: {
          allowed: true,
          expiresAt: Date.now() + ALLOW_DURATION_MS
        }
      });

      // Set an alarm to auto-block this tab after the time limit
      await chrome.alarms.create(`expire_tab_${tabId}`, {
        delayInMinutes: ALLOW_DURATION_MIN
      });
      console.log(`Alarm set for tab ${tabId}, will fire in ${ALLOW_DURATION_MIN} minute(s)`);

      // Get the pending URL
      const result = await chrome.storage.local.get(`pending_${tabId}`);
      const pendingUrl = result[`pending_${tabId}`] || "https://twitter.com";

      // Clean up pending URL
      await chrome.storage.local.remove(`pending_${tabId}`);

      // Navigate to Twitter
      await chrome.tabs.update(tabId, { url: pendingUrl });

      sendResponse({ success: true });
    })();

    return true; // Keep message channel open for async response
  }

  if (message.type === "GET_REASON_LOG") {
    (async () => {
      const result = await chrome.storage.local.get("reason_log");
      sendResponse({ log: result.reason_log || [] });
    })();

    return true;
  }
});

// Handle alarm - auto-block tab when time expires
chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log(`Alarm fired: ${alarm.name}`);

  if (alarm.name.startsWith("expire_tab_")) {
    const tabId = parseInt(alarm.name.replace("expire_tab_", ""), 10);
    console.log(`Time's up for tab ${tabId}! Blocking...`);

    // Clear the stored allowance
    await chrome.storage.local.remove(`tab_${tabId}`);

    // Check if the tab still exists and is on Twitter
    try {
      const tab = await chrome.tabs.get(tabId);
      console.log(`Tab ${tabId} URL: ${tab.url}`);
      if (tab && isTwitterUrl(tab.url)) {
        console.log(`Blocking tab ${tabId}`);
        await blockTab(tabId);
      }
    } catch (e) {
      console.log(`Tab ${tabId} no longer exists`);
    }
  }
});

// Clean up storage and alarms when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.remove([`tab_${tabId}`, `pending_${tabId}`]);
  chrome.alarms.clear(`expire_tab_${tabId}`);
});


