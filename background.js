chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "copy-xpath",
    title: "Copy XPath",
    contexts: ["all"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "copy-xpath") {
    // Send message to content script to copy XPath
    chrome.tabs.sendMessage(tab.id, {
      action: "copyXPath"
    });
  }
});