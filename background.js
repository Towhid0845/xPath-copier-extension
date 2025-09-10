//v1.0.0
// chrome.runtime.onInstalled.addListener(() => {
//   chrome.contextMenus.create({
//     id: "copy-xpath",
//     title: "Copy XPath",
//     contexts: ["all"]
//   });
// });

// // ensure content.js is injected when tab updates
// chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
//   if (changeInfo.status === "complete" && /^https?:/.test(tab.url)) {
//     chrome.scripting.executeScript({
//       target: { tabId },
//       files: ["content.js"]
//     }).catch(err => console.warn("Already injected:", err));
//   }
// });

// chrome.contextMenus.onClicked.addListener((info, tab) => {
//   if (info.menuItemId === "copy-xpath") {
//     // Send message to content script to copy XPath
//     chrome.tabs.sendMessage(tab.id, {
//       action: "copyXPath"
//     });
//   }
// });



chrome.runtime.onInstalled.addListener(() => {
  // parent
  chrome.contextMenus.create({
    id: "copy-xpath",
    title: "Jobdesk Datafarm Spider Plugin",
    contexts: ["all"]
  });

  // children
  const fields = ["Job Title", "Job Link", "Job Location", "Company Name"];
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
