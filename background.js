// Side Panel initialization
chrome.runtime.onInstalled.addListener(() => {
  // Set up side panel behavior
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch(err => console.log('Side panel not available:', err));
  
  // Create context menus
  createContextMenus();
});

// Create context menus
function createContextMenus() {
  // Remove existing menus first to avoid duplicates
  chrome.contextMenus.removeAll(() => {
    // Parent menu
    chrome.contextMenus.create({
      id: "copy-xpath",
      title: "Get XPath for",
      contexts: ["all"]
    });

    // Children menus
    const fields = ["Company Logo", "Job Link", "Job Title", "Job Location", "Job Content"];
    fields.forEach(field => {
      chrome.contextMenus.create({
        id: field.toLowerCase().replace(/\s+/g, "-"),
        parentId: "copy-xpath",
        title: field,
        contexts: ["all"]
      });
    });
  });
}

// Ensure content.js is injected
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && /^https?:/.test(tab.url)) {
    chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"]
    }).catch(err => console.warn("Already injected:", err));
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  // Check authentication first
  chrome.storage.local.get(['isAuthenticated'], (result) => {
    if (!result.isAuthenticated) {
      // Open side panel for authentication
      openSidePanelForAuth();
      return;
    }
    
    // User is authenticated - send XPath copy message
    chrome.tabs.sendMessage(tab.id, {
      action: "copyXPath",
      field: info.menuItemId 
    }, (response) => {
      // Handle response from content script
      if (chrome.runtime.lastError) {
        console.error('Error sending message to content script:', chrome.runtime.lastError);
        return;
      }
      
      if (response && response.success) {
        console.log('XPath copied successfully:', response.xpath);
      } else {
        console.warn('Failed to copy XPath:', response?.error);
      }
    });
  });
});

// Open side panel for authentication
function openSidePanelForAuth() {
  chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT })
    .then(() => {
      console.log('Side panel opened for authentication');
    })
    .catch(err => {
      console.log('Could not open side panel:', err);
      // Fallback: show notification
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0]?.id) {
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            function: showAuthNotification
          });
        }
      });
    });
}

// Handle messages from side panel and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message.action);
  switch (message.action) {

    case "openSidePanel":
      (async () => {
        try {
          const window = await chrome.windows.getCurrent();
          await chrome.sidePanel.open({ windowId: window.id });
          sendResponse({ success: true });
        } catch (err) {
          console.error('Failed to open side panel:', err);
          sendResponse({ success: false, error: err.message });
        }
      })();
      return true;
      
    case "closeSidePanel":
      (async () => {
        try {
          await chrome.sidePanel.close({ windowId: chrome.windows.WINDOW_ID_CURRENT });
          sendResponse({ success: true });
        } catch (err) {
          console.error('Failed to close side panel:', err);
          sendResponse({ success: false, error: err.message });
        }
      })();
      return true;
      
    case "checkAuthStatus":
      chrome.storage.local.get(['isAuthenticated'], (result) => {
        sendResponse({ isAuthenticated: result.isAuthenticated || false });
      });
      return true; // Keep channel open for async response
      
    case "updateXPathField":
      // Handle XPath field updates from content script
      console.log('Updating XPath field:', message);
      
      // Forward the message to the side panel if it's open
      chrome.runtime.sendMessage({
        action: "updateXPathField",
        field: message.field,
        value: message.value 
      }).catch(err => {
        console.log('Side panel not available to receive update:', err);
      });
      
      // Always send a response
      sendResponse({ success: true });
      return false;
    
    case "getSpiderList":
      handleGetSpiderList(message, sendResponse);
      return true;

    case "generateSpider":
      handleGenerateSpider(message, sendResponse);
      return true; // Keep channel open for async response
      
    case "publishSpider":
      handlePublishSpider(message, sendResponse);
      return true;

    default:
      console.warn('Unknown action received:', message.action);
      sendResponse({ success: false, error: 'Unknown action' });
      return false;
  }
});

// Handle Publish Spider API requests
async function handlePublishSpider(message, sendResponse) {
  try {
    const { token, payload } = message;
    
    if (!token) {
      sendResponse({ success: false, error: "Authentication token not available" });
      return;
    }
    
    if (!payload) {
      sendResponse({ success: false, error: "No payload provided" });
      return;
    }
    
    // Validate required data
    if (!payload.SpiderCode || !payload.SpiderCode.trim()) {
      sendResponse({ success: false, error: "Spider code is empty or missing" });
      return;
    }

    if (!payload.ConfigJson || !payload.ConfigJson.trim()) {
      sendResponse({ success: false, error: "JSON configuration is empty or missing" });
      return;
    }

    // Validate JSON format
    try {
      const parsedConfig = typeof payload.ConfigJson === 'string'
        ? JSON.parse(payload.ConfigJson)
        : payload.ConfigJson;
      
      // Ensure it's properly stringified
      payload.ConfigJson = JSON.stringify(parsedConfig);
      console.log('✅ ConfigJson validated and stringified');
    } catch (e) {
      sendResponse({ success: false, error: 'Invalid JSON configuration: ' + e.message });
      return;
    }
    
    console.log("📤 Publishing Spider to API:", payload);
    
    const response = await fetch("https://data.jobdesk.com/api/AddNewCrawler", {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    console.log("✅ Spider Published Successfully:", result);
    sendResponse({ success: true, data: result });
    
  } catch (err) {
    console.error("❌ Publish Spider API Error:", err);
    sendResponse({ success: false, error: err.message || "Failed to publish spider" });
  }
}

// Handle generate spider API requests
async function handleGenerateSpider(message, sendResponse) {
  const data = message.payload || {};
  
  const payload = {
    start_url: data["start-url"] || "",
    source_key: data["source-key"] || "",
    company_name: data["company-name"] || "",
    company_logo: data["company-logo"] || "",
    job_title_xpath: data["job-title"] || "",
    job_location_xpath: data["job-location"] || "",
    job_content_xpath: data["job-content"] || "",
    source_country: data["source-country"] || "",
    lang_code: data["lang-code"] || "",
    job_link: data["job-link"] || "",
    playwright: data["playwright"] === true,
    playwright_selector: data["playwright-selector"] || ""
  };
  
  console.log("📤 Sending to API:", payload);
  
  // Check if all fields are empty
  const allEmpty = Object.values(payload).every(val => val === "" || val === false);
  if (allEmpty) {
    console.warn("🚫 Empty form, not sending to API");
    sendResponse({ success: false, error: "Form is empty. Please fill in fields before sending." });
    return;
  }

  try {
    const response = await fetch("https://spidergenerator.jobdesk.com/generate-spider", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log("✅ API Response:", result);
    sendResponse({ success: true, data: result });
  } catch (err) {
    console.error("❌ API Error:", err);
    sendResponse({ success: false, error: err.message || "API request failed" });
  }
}

// Handle Get Spider List API requests
async function handleGetSpiderList(message, sendResponse) {
  try {
    const token = message.token;
    
    if (!token) {
      sendResponse({ success: false, error: "No token provided" });
      return;
    }
    
    console.log("📤 Getting Spider List from API");
    
    const response = await fetch("https://data.jobdesk.com/api/GetSpiderListPlugin", {
      method: "GET",
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("✅ Spider List API Response:", data);
    sendResponse({ success: true, data: data });
    
  } catch (err) {
    console.error("❌ Spider List API Error:", err);
    sendResponse({ success: false, error: err.message || "Failed to load spider list" });
  }
}

// Fallback notification function
function showAuthNotification() {
  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ff4757;
    color: white;
    padding: 12px 16px;
    border-radius: 6px;
    z-index: 1000000;
    font-family: Arial, sans-serif;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `;
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <span>🔐</span>
      <span>Please authenticate in the side panel to use this feature</span>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 5000);
}

// Listen for tab changes to update context menus
chrome.tabs.onActivated.addListener(() => {
  // Recreate context menus when tab changes
  createContextMenus();
});

// Optional: Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
});