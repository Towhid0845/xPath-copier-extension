
chrome.runtime.onInstalled.addListener(() => {
  // parent
  chrome.contextMenus.create({
    id: "copy-xpath",
    title: "Jobdesk Datafarm Spider Plugin",
    contexts: ["all"]
  });

  // children
  const fields = ["Start URL", "Company Name", "Company Logo", "Job Title", "Job Location", "Job Content", "Source Country", "Lang Code", "Job Link", "Playwright Selector", "Playwright"];
  fields.forEach(field => {
    chrome.contextMenus.create({
      id: field.toLowerCase().replace(/\s+/g, "-"),
      parentId: "copy-xpath",
      title: field,
      contexts: ["all"]
    });
  });
});

// ensure content.js is injected
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && /^https?:/.test(tab.url)) {
    chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"]
    }).catch(err => console.warn("Already injected:", err));
  }
});

// handle clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  // send which child menu was clicked
  chrome.tabs.sendMessage(tab.id, {
    action: "copyXPath",
    field: info.menuItemId // e.g. "job-title"
  });
});
