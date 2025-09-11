
if (!window.__xPathCopierInjected) {
  window.__xPathCopierInjected = true;
  let lastRightClickedElement = null;

  // capture right-click target
  document.addEventListener('contextmenu', (event) => {
    lastRightClickedElement = event.target;
  }, true);

  // build sidebar
  createSidebar();

  // listen for background messages
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "copyXPath" && lastRightClickedElement) {
      const xpath = getXPath(lastRightClickedElement);

      // map field id (e.g. job-title) to input field
      const fieldId = request.field;
      const input = document.querySelector(`#xpath-${fieldId}`);
      if (input) {
        input.value = xpath;
      }

      // still copy to clipboard
      copyToClipboard(xpath);
    }
  });

  function getXPath(element) {
    if (element.className && typeof element.className === "string") {
      const className = element.className.trim();
      if (className) {
        return '//' + element.tagName.toLowerCase() +
          '[contains(@class, "' + className + '")]';
      }
    }
    if (element.id) {
      return '//*[@id="' + element.id + '"]';
    }
    if (element === document.body) {
      return '/html/body';
    }

    let ix = 0;
    let siblings = element.parentNode ? element.parentNode.childNodes : [];
    for (let i = 0; i < siblings.length; i++) {
      let sibling = siblings[i];
      if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
        ix++;
        if (sibling === element) {
          return getXPath(element.parentNode) + '/' +
            element.tagName.toLowerCase() + '[' + ix + ']';
        }
      }
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(err => {
      console.error('Failed to copy: ', err);
    });
  }

  function createSidebar() {
    const sidebar = document.createElement("div");
    sidebar.id = "xpath-sidebar";
    sidebar.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      width: 300px;
      height: 100%;
      background: #fff;
      border-left: 2px solid #ccc;
      box-shadow: -2px 0 8px rgba(0,0,0,0.2);
      z-index: 999999;
      padding: 10px;
      font-family: Arial, sans-serif;
      overflow-y: auto;
    `;

    sidebar.innerHTML = `
      <h3 style="margin-top:0;">XPath Collector</h3>
      <label>Job Title</label>
      <input id="xpath-job-title" type="text" style="width:100%;margin-bottom:10px;" readonly>

      <label>Job Link</label>
      <input id="xpath-job-link" type="text" style="width:100%;margin-bottom:10px;" readonly>

      <label>Job Location</label>
      <input id="xpath-job-location" type="text" style="width:100%;margin-bottom:10px;" readonly>

      <label>Company Name</label>
      <input id="xpath-company-name" type="text" style="width:100%;margin-bottom:10px;" readonly>

      <button id="send-xpaths" style="width:100%;padding:8px;background:#4caf50;color:white;border:none;border-radius:4px;cursor:pointer;">
        Send
      </button>
    `;

    document.body.appendChild(sidebar);

    // handle send click
    document.getElementById("send-xpaths").addEventListener("click", () => {
      const data = {
        jobTitle: document.getElementById("xpath-job-title").value,
        jobLink: document.getElementById("xpath-job-link").value,
        jobLocation: document.getElementById("xpath-job-location").value,
        companyName: document.getElementById("xpath-company-name").value,
      };
      console.log("Collected XPaths:", data);

      // 🚀 Future: send to API here
      // fetch("https://your-api-endpoint.com/save", { method:"POST", body: JSON.stringify(data) })
    });
  }
}
