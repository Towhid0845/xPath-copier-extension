
if (!window.__xPathCopierInjected) {
  window.__xPathCopierInjected = true;
  let lastRightClickedElement = null;
  let isSidebarExpanded = false;

  // Load saved data from storage
  chrome.storage.local.get(['xpathData', 'sidebarState'], (result) => {
    const savedData = result.xpathData || {};
    const sidebarState = result.sidebarState !== undefined ? result.sidebarState : false;
    isSidebarExpanded = sidebarState;

    createSidebar();
    createOpenButton();
    populateFields(savedData);

    // Initially show/hide based on saved state
    // if (!isSidebarExpanded) {
    //   closeSidebar();
    // }

    if (isSidebarExpanded) {
      openSidebar();
    } else {
      closeSidebar();
    }
  });

  // Capture right-click target
  document.addEventListener('contextmenu', (event) => {
    lastRightClickedElement = event.target;
  }, true);

  // Listen for background messages
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "copyXPath" && lastRightClickedElement) {
      const xpath = getXPath(lastRightClickedElement);

      // Map field id to input field
      const fieldId = request.field;
      const input = document.querySelector(`#xpath-${fieldId}`);
      if (input) {
        input.value = xpath;
        saveToStorage(fieldId, xpath);
      }

      // Copy to clipboard
      copyToClipboard(xpath);
    }
    return true;
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
    top: 48%;
    right: -350px;
    width: 350px;
    height: auto;
    max-height: 80vh;
    background: #fff;
    border: 2px solid #ccc;
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    z-index: 999999;
    padding: 15px;
    font-family: Arial, sans-serif;
    overflow-y: auto;
    overflow-x: hidden;
    transition: all 0.5s ease;
    transform: translateY(-48%);
  `;
    //start url -> company name -> logo -> source country -> lang code -> job link -> job title -> location -> content -> playwright -> selector
    // <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
    //   <h3 style="margin:0; font-size: 24px; font-weight: bold;">XPath Collector</h3>
    //   <button id="close-sidebar" style="background: none; border: none; cursor: pointer; font-size: 20px; width: 30px; height:30px; padding: 0">
    //     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    //       <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
    //     </svg>
    //   </button>
    // </div>
    sidebar.innerHTML = `
      <div style="position: sticky; top: 0; background: #fff; padding: 0; z-index: 10;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin:0; font-size: 24px; font-weight: bold;">XPath Collector</h3>
          <button id="close-sidebar" style="background: none; border: none; cursor: pointer; font-size: 20px; width: 30px; height:30px; padding: 0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <hr style="margin: 10px 0 20px -15px; width: 350px">
      </div>
      <div id="sidebar-content" style="height: calc(100% - 60px); overflow-y: auto; padding-right: 5px;">
        <div style="margin-bottom: 8px;">
          <label style="display: block; font-weight: bold; margin-bottom: 2px; font-size: 13px; line-height: 20px">Start URL</label>
          <input id="xpath-start-url" type="text" style="width:100%; height: 29px; font-size: 15px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
        </div>

        <div style="margin-bottom: 8px;">
          <label style="display: block; font-weight: bold; margin-bottom: 2px; font-size: 13px; line-height: 20px">Company Name</label>
          <input id="xpath-company-name" type="text" style="width:100%; height: 29px; font-size: 15px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
        </div>
      
        <div style="margin-bottom: 8px;">
          <label style="display: block; font-weight: bold; margin-bottom: 2px; font-size: 13px; line-height: 20px">Company Logo</label>
          <input id="xpath-company-logo" type="text" style="width:100%; height: 29px; font-size: 15px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
        </div>

        <div style="margin-bottom: 8px;">
          <label style="display: block; font-weight: bold; margin-bottom: 2px; font-size: 13px; line-height: 20px">Source Country</label>
          <input id="xpath-source-country" type="text" style="width:100%; height: 29px; font-size: 15px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
        </div>

        <div style="margin-bottom: 8px;">
          <label style="display: block; font-weight: bold; margin-bottom: 2px; font-size: 13px; line-height: 20px">Lang Code</label>
          <input id="xpath-lang-code" type="text" style="width:100%; height: 29px; font-size: 15px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
        </div>
      
        <div style="margin-bottom: 8px;">
          <label style="display: block; font-weight: bold; margin-bottom: 2px; font-size: 13px; line-height: 20px">Job Link</label>
          <input id="xpath-job-link" type="text" style="width:100%; height: 29px; font-size: 15px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
        </div>

        <div style="margin-bottom: 8px;">
          <label style="display: block; font-weight: bold; margin-bottom: 2px; font-size: 13px; line-height: 20px">Job Title</label>
          <input id="xpath-job-title" type="text" style="width:100%; height: 29px; font-size: 15px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
        </div>

        <div style="margin-bottom: 8px;">
          <label style="display: block; font-weight: bold; margin-bottom: 2px; font-size: 13px; line-height: 20px">Job Location</label>
          <input id="xpath-job-location" type="text" style="width:100%; height: 29px; font-size: 15px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
        </div>

        <div style="margin-bottom: 8px;">
          <label style="display: block; font-weight: bold; margin-bottom: 2px; font-size: 13px; line-height: 20px">Job Content</label>
          <input id="xpath-job-content" type="text" style="width:100%; height: 29px; font-size: 15px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
        </div>

        <div style="margin-bottom: 8px;">
          <label style="display: block; font-weight: bold; margin-bottom: 2px; font-size: 13px; line-height: 20px">Playwright</label>
          <input id="xpath-playwright" type="text" style="width:100%; height: 29px; font-size: 15px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
        </div>

        <div style="margin-bottom: 8px;">
          <label style="display: block; font-weight: bold; margin-bottom: 2px; font-size: 13px; line-height: 20px">Playwright Selector</label>
          <input id="xpath-playwright-selector" type="text" style="width:100%; height: 29px; font-size: 15px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
        </div>

        <div style="display: flex; justify-content: center; gap: 10px;margin-top: 24px;">
          <button id="send-xpaths" style="width:fit-content; font-size:16px; padding:4px 25px; background:#4caf50; color:white; border:none; border-radius:25px; cursor:pointer;">
            Generate Spider
          </button>
          
          <button id="clear-fields" style="width:fit-content; font-size:16px; padding:4px 25px; background:#f44336; color:white; border:none; border-radius:25px; cursor:pointer;">
            Clear All
          </button>
        </div>
      </div>
      `;

    document.body.appendChild(sidebar);

    // Add event listeners
    document.getElementById("close-sidebar").addEventListener("click", closeSidebar);

    const inputs = sidebar.querySelectorAll('input');
    inputs.forEach(input => {
      input.addEventListener('input', (e) => {
        const fieldId = e.target.id.replace('xpath-', '');
        saveToStorage(fieldId, e.target.value);
      });
    });

    document.getElementById("send-xpaths").addEventListener("click", sendXPaths);
    document.getElementById("clear-fields").addEventListener("click", clearFields);
  }

  function createOpenButton() {
    const openButton = document.createElement("div");
    openButton.id = "xpath-open-button";
    openButton.style.cssText = `
      position: fixed;
      top: 10%;
      right: 10px;
      width: 50px;
      height: 50px;
      background: #fff;
      border: 2px solid #ccc;
      border-radius: 25px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      z-index: 999999;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      transition: right 0.5s ease;
      transform: translateY(-50%);
    `;

    openButton.innerHTML = `
      <img src="${chrome.runtime.getURL('logo.svg')}" alt="Open" style="width: 25px; height: 25px;">
    `;

    document.body.appendChild(openButton);
    openButton.addEventListener("click", openSidebar);
  }

  function closeSidebar() {
    isSidebarExpanded = !isSidebarExpanded;

    const sidebar = document.getElementById("xpath-sidebar");
    const openButton = document.getElementById("xpath-open-button");
    // Slide sidebar out to the right
    sidebar.style.right = '-350px';

    // Show open button after a delay
    setTimeout(() => {
      openButton.style.display = 'flex';
      openButton.style.right = '10px';
    }, 300);

    isSidebarExpanded = false;
    chrome.storage.local.set({ sidebarState: false });
  }

  function openSidebar() {
    const sidebar = document.getElementById("xpath-sidebar");
    const openButton = document.getElementById("xpath-open-button");

    // Hide open button immediately
    openButton.style.right = '-60px';
    openButton.style.display = 'none';

    // Slide sidebar in from the right
    sidebar.style.right = '10px';

    isSidebarExpanded = true;
    chrome.storage.local.set({ sidebarState: true });
  }

  function populateFields(data) {
    if (!isSidebarExpanded) return;

    setTimeout(() => {
      Object.keys(data).forEach(field => {
        const input = document.querySelector(`#xpath-${field}`);
        if (input) {
          input.value = data[field] || '';
        }
      });
    }, 100);
  }

  function saveToStorage(field, value) {
    chrome.storage.local.get(['xpathData'], (result) => {
      const xpathData = result.xpathData || {};
      xpathData[field] = value;
      chrome.storage.local.set({ xpathData });
    });
  }

  function sendXPaths() {
    // v.1
    // chrome.storage.local.get(null, (data) => {
    //   const xpathData = data || {};

    //   // Map storage keys (kebab-case) → API keys (snake_case)
    //   const payload = {
    //     start_url: xpathData["start-url"] || "",
    //     company_name: xpathData["company-name"] || "",
    //     company_logo: xpathData["company-logo"] || "",
    //     job_title_xpath: xpathData["job-title"] || "",
    //     job_location_xpath: xpathData["job-location"] || "",
    //     job_content_xpath: xpathData["job-content"] || "",
    //     source_country: xpathData["source-country"] || "",
    //     lang_code: xpathData["lang-code"] || "",
    //     job_link: xpathData["job-link"] || "",
    //     playwright: xpathData["playwright"] === "true" || false, // stored as string? → convert to boolean
    //     playwright_selector: xpathData["playwright-selector"] || ""
    //   };

    //   console.log("🚀 Sending payload:", payload);

    //   fetch("http://45.63.119.16/generate-spider", {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify(payload)
    //   })
    //     .then((res) => res.json())
    //     .then((result) => {
    //       console.log("✅ API Response:", result);
    //       alert("Spider generated successfully!");
    //       clearFields(); // optional → reset after send
    //     })
    //     .catch((err) => {
    //       console.error("❌ API Error:", err);
    //       alert("Failed to generate spider. Check console.");
    //     });
    // });

    //v.2 - via background.js
    chrome.storage.local.get(null, (data) => {
      // chrome.runtime.sendMessage({
      //   action: "sendToAPI",
      //   payload: data
      // });
      chrome.runtime.sendMessage(
        { action: "sendToAPI", payload: data },
        (response) => {
          if (!response.success) {
            alert(response.error || "Failed to send data");
          } else {
            alert("Spider generated successfully!");
            clearFields();
          }
        }
      );
    });
  }

  function clearFields() {
    console.log("Clearing fields...");
    const fields = ['start-url', 'company-name', 'company-logo', 'job-title',
      'job-location', 'job-content', 'source-country', 'lang-code',
      'job-link', 'playwright-selector', 'playwright'];
    fields.forEach(field => {
      const input = document.querySelector(`#xpath-${field}`);
      if (input) {
        input.value = '';
      }
      // saveToStorage(field, '');
      chrome.storage.local.set({ xpathData: {} });
    });
  }
}