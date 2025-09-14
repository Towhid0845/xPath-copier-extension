
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


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "sendToAPI") {
    const data = message.payload || {};

    const payload = {
      start_url: data["start-url"] || "",
      company_name: data["company-name"] || "",
      company_logo: data["company-logo"] || "",
      job_title_xpath: data["job-title"] || "",
      job_location_xpath: data["job-location"] || "",
      job_content_xpath: data["job-content"] || "",
      source_country: data["source-country"] || "",
      lang_code: data["lang-code"] || "",
      job_link: data["job-link"] || "",
      playwright: data["playwright"] === "true" || false,
      playwright_selector: data["playwright-selector"] || ""
    };

    const isEmpty = Object.values(payload).every(
      (val) => val === "" || val === false
    );

    if (isEmpty) {
      console.warn("🚫 Empty form, not sending to API");
      sendResponse({ success: false, error: "Form is empty. Please fill in fields before sending." });
      return true; // keep channel open
    }

    fetch("http://45.63.119.16/generate-spider", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then((res) => res.json())
      .then((result) => {
        console.log("✅ API Response:", result);
        sendResponse({ success: true, data: result });
      })
      .catch((err) => {
        console.error("❌ API Error:", err);
        sendResponse({ success: false, error: err });
      });

    // Required for async sendResponse
    return true;
  }
});
