const MIN_CHARS = 5;

const textarea = document.getElementById("reason");
const counter = document.getElementById("counter");
const submitBtn = document.getElementById("submit");

// Get tab ID from URL params
const urlParams = new URLSearchParams(window.location.search);
const tabId = parseInt(urlParams.get("tabId"), 10);

function countNonWhitespace(str) {
    return str.replace(/\s/g, "").length;
}

function updateCounter() {
    const count = countNonWhitespace(textarea.value);
    const isValid = count >= MIN_CHARS;

    counter.textContent = `${count} / ${MIN_CHARS} characters`;
    counter.classList.toggle("valid", isValid);
    submitBtn.disabled = !isValid;
}

textarea.addEventListener("input", updateCounter);

submitBtn.addEventListener("click", () => {
    const count = countNonWhitespace(textarea.value);

    if (count < MIN_CHARS) return;

    submitBtn.disabled = true;
    submitBtn.textContent = "...";

    chrome.runtime.sendMessage(
        { type: "ALLOW_ACCESS", tabId: tabId, reason: textarea.value.trim() },
        (response) => {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
                submitBtn.textContent = "Error";
                submitBtn.disabled = false;
            }
        }
    );
});

// Handle Enter key (Ctrl+Enter or Cmd+Enter to submit)
textarea.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        if (!submitBtn.disabled) {
            submitBtn.click();
        }
    }
});

// History functionality
const historyToggle = document.getElementById("historyToggle");
const historyList = document.getElementById("historyList");

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // Today
    if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
        return "Today at " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    // Yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.getDate() === yesterday.getDate()) {
        return "Yesterday at " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    // Older
    return date.toLocaleDateString([], { month: "short", day: "numeric" }) +
        " at " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function renderHistory(log) {
    if (!log || log.length === 0) {
        historyList.innerHTML = '<p class="history-empty">No past reasons yet</p>';
        return;
    }

    historyList.innerHTML = log.map(entry => `
        <div class="history-item">
            <div class="history-reason">${escapeHtml(entry.reason)}</div>
            <div class="history-time">${formatTime(entry.timestamp)}</div>
        </div>
    `).join("");
}

historyToggle.addEventListener("click", () => {
    const isOpen = historyToggle.classList.toggle("open");
    historyList.classList.toggle("visible", isOpen);

    if (isOpen) {
        chrome.runtime.sendMessage({ type: "GET_REASON_LOG" }, (response) => {
            if (response && response.log) {
                renderHistory(response.log);
            }
        });
    }
});

// Initial state
updateCounter();

