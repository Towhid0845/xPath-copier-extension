
// if (!window.__xPathCopierInjected) {
//   window.__xPathCopierInjected = true;
//   let lastRightClickedElement = null;

//   // capture right-click target
//   document.addEventListener('contextmenu', (event) => {
//     lastRightClickedElement = event.target;
//   }, true);

//   // build sidebar
//   createSidebar();

//   // listen for background messages
//   chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//     if (request.action === "copyXPath" && lastRightClickedElement) {
//       const xpath = getXPath(lastRightClickedElement);

//       // map field id (e.g. job-title) to input field
//       const fieldId = request.field;
//       const input = document.querySelector(`#xpath-${fieldId}`);
//       if (input) {
//         input.value = xpath;
//       }

//       // still copy to clipboard
//       copyToClipboard(xpath);
//     }
//   });

//   function getXPath(element) {
//     if (element.className && typeof element.className === "string") {
//       const className = element.className.trim();
//       if (className) {
//         return '//' + element.tagName.toLowerCase() +
//           '[contains(@class, "' + className + '")]';
//       }
//     }
//     if (element.id) {
//       return '//*[@id="' + element.id + '"]';
//     }
//     if (element === document.body) {
//       return '/html/body';
//     }

//     let ix = 0;
//     let siblings = element.parentNode ? element.parentNode.childNodes : [];
//     for (let i = 0; i < siblings.length; i++) {
//       let sibling = siblings[i];
//       if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
//         ix++;
//         if (sibling === element) {
//           return getXPath(element.parentNode) + '/' +
//             element.tagName.toLowerCase() + '[' + ix + ']';
//         }
//       }
//     }
//   }

//   function copyToClipboard(text) {
//     navigator.clipboard.writeText(text).catch(err => {
//       console.error('Failed to copy: ', err);
//     });
//   }

//   function createSidebar() {
//     const sidebar = document.createElement("div");
//     sidebar.id = "xpath-sidebar";
//     sidebar.style.cssText = `
//       position: fixed;
//       top: 0;
//       right: 0;
//       width: 300px;
//       height: 100%;
//       background: #fff;
//       border-left: 2px solid #ccc;
//       box-shadow: -2px 0 8px rgba(0,0,0,0.2);
//       z-index: 999999;
//       padding: 10px;
//       font-family: Arial, sans-serif;
//       overflow-y: auto;
//     `;

//     sidebar.innerHTML = `
//       <h3 style="margin-top:0;">XPath Collector</h3>
//       <label>Job Title</label>
//       <input id="xpath-job-title" type="text" style="width:100%;margin-bottom:10px;" readonly>

//       <label>Job Link</label>
//       <input id="xpath-job-link" type="text" style="width:100%;margin-bottom:10px;" readonly>

//       <label>Job Location</label>
//       <input id="xpath-job-location" type="text" style="width:100%;margin-bottom:10px;" readonly>

//       <label>Company Name</label>
//       <input id="xpath-company-name" type="text" style="width:100%;margin-bottom:10px;" readonly>

//       <button id="send-xpaths" style="width:100%;padding:8px;background:#4caf50;color:white;border:none;border-radius:4px;cursor:pointer;">
//         Send
//       </button>
//     `;

//     document.body.appendChild(sidebar);

//     // handle send click
//     document.getElementById("send-xpaths").addEventListener("click", () => {
//       const data = {
//         jobTitle: document.getElementById("xpath-job-title").value,
//         jobLink: document.getElementById("xpath-job-link").value,
//         jobLocation: document.getElementById("xpath-job-location").value,
//         companyName: document.getElementById("xpath-company-name").value,
//       };
//       console.log("Collected XPaths:", data);

//       // 🚀 Future: send to API here
//       // fetch("https://your-api-endpoint.com/save", { method:"POST", body: JSON.stringify(data) })
//     });
//   }
// }


//v1.2.0
if (!window.__xPathCopierInjected) {
  window.__xPathCopierInjected = true;
  let lastRightClickedElement = null;
  let isSidebarExpanded = true;

  // Load saved data from storage
  chrome.storage.local.get(['xpathData', 'sidebarState'], (result) => {
    const savedData = result.xpathData || {};
    const sidebarState = result.sidebarState !== undefined ? result.sidebarState : true;
    isSidebarExpanded = sidebarState;

    createSidebar();
    populateFields(savedData);
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
    right: 10px;
    width: ${isSidebarExpanded ? '300px' : '40px'};
    height: ${isSidebarExpanded ? 'auto' : '40px'};
    background: #fff;
    border: 2px solid #ccc;
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    z-index: 999999;
    padding: 15px;
    font-family: Arial, sans-serif;
    overflow-y: none;
    transition: all 0.3s ease;
    transform: translateY(-50%);
    resize: none;
    min-width: unset;
    min-height: unset;
    max-height: unset;
  `;

    sidebar.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3 style="margin:0; display: ${isSidebarExpanded ? 'block' : 'none'}; font-size: 24px; font-weight: bold;">XPath Collector</h3>
        <button id="toggle-sidebar" style="background: none; border: none; cursor: pointer; font-size: 20px; width: 35px; height:35px; padding: 0">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block;">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 12H5m14 0-4 4m4-4-4-4"/>
          </svg>
        </button>
      </div>
      
      <div id="sidebar-content" style="display: ${isSidebarExpanded ? 'block' : 'none'}">
        <div style="margin-bottom: 8px;">
          <label style="display: block; font-weight: bold; margin-bottom: 2px; font-size: 13px; line-height: 20px">Start URL</label>
          <input id="xpath-start-url" type="text" style="width:100%; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
        </div>

        <div style="margin-bottom: 8px;">
          <label style="display: block; font-weight: bold; margin-bottom: 2px; font-size: 13px; line-height: 20px">Company Name</label>
          <input id="xpath-company-name" type="text" style="width:100%; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
        </div>

        <div style="margin-bottom: 8px;">
          <label style="display: block; font-weight: bold; margin-bottom: 2px; font-size: 13px; line-height: 20px">Company Logo</label>
          <input id="xpath-company-logo" type="text" style="width:100%; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
        </div>

        <div style="margin-bottom: 8px;">
          <label style="display: block; font-weight: bold; margin-bottom: 2px; font-size: 13px; line-height: 20px">Job Title</label>
          <input id="xpath-job-title" type="text" style="width:100%; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
        </div>

        <div style="margin-bottom: 8px;">
          <label style="display: block; font-weight: bold; margin-bottom: 2px; font-size: 13px; line-height: 20px">Job Location</label>
          <input id="xpath-job-location" type="text" style="width:100%; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
        </div>

        <div style="margin-bottom: 8px;">
          <label style="display: block; font-weight: bold; margin-bottom: 2px; font-size: 13px; line-height: 20px">Job Content</label>
          <input id="xpath-job-content" type="text" style="width:100%; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
        </div>

        <div style="margin-bottom: 8px;">
          <label style="display: block; font-weight: bold; margin-bottom: 2px; font-size: 13px; line-height: 20px">Source Country</label>
          <input id="xpath-source-country" type="text" style="width:100%; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
        </div>

        <div style="margin-bottom: 8px;">
          <label style="display: block; font-weight: bold; margin-bottom: 2px; font-size: 13px; line-height: 20px">Lang Code</label>
          <input id="xpath-lang-code" type="text" style="width:100%; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
        </div>

        <div style="margin-bottom: 8px;">
          <label style="display: block; font-weight: bold; margin-bottom: 2px; font-size: 13px; line-height: 20px">Job Link</label>
          <input id="xpath-job-link" type="text" style="width:100%; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
        </div>

        <div style="margin-bottom: 8px;">
          <label style="display: block; font-weight: bold; margin-bottom: 2px; font-size: 13px; line-height: 20px">Playwright Selector</label>
          <input id="xpath-playwright-selector" type="text" style="width:100%; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
        </div>

        <div style="margin-bottom: 15px;">
          <label style="display: block; font-weight: bold; margin-bottom: 2px; font-size: 14px; line-height: 20px">Playwright</label>
          <input id="xpath-playwright" type="text" style="width:100%; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
        </div>

        <button id="send-xpaths" style="width:100%; padding:8px; background:#4caf50; color:white; border:none; border-radius:4px; cursor:pointer;">
          Send
        </button>
        
        <button id="clear-fields" style="width:100%; padding:8px; background:#f44336; color:white; border:none; border-radius:4px; cursor:pointer; margin-top:8px;">
          Clear All
        </button>
      </div>
    `;

    document.body.appendChild(sidebar);

    // Add event listeners
    document.getElementById("toggle-sidebar").addEventListener("click", toggleSidebar);

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

  function toggleSidebar() {
    isSidebarExpanded = !isSidebarExpanded;

    const sidebar = document.getElementById("xpath-sidebar");
    const content = document.getElementById("sidebar-content");
    const toggleBtn = document.getElementById("toggle-sidebar");
    const title = sidebar.querySelector('h3');

    sidebar.style.width = isSidebarExpanded ? '300px' : '40px';
    sidebar.style.height = isSidebarExpanded ? 'auto' : '40px';
    sidebar.style.resize = isSidebarExpanded ? 'none' : 'none';
    sidebar.style.top = isSidebarExpanded ? '48%' : '10%';
    content.style.display = isSidebarExpanded ? 'block' : 'none';
    title.style.display = isSidebarExpanded ? 'block' : 'none';
    toggleBtn.innerHTML = isSidebarExpanded ?
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block;"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 12H5m14 0-4 4m4-4-4-4"/></svg>' :
      '<img src="' + chrome.runtime.getURL('logo.svg') + '" alt="Logo" style="width: 35px; height: 35px; display: block;">';
    // Save sidebar state
    chrome.storage.local.set({ sidebarState: isSidebarExpanded });
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
    const data = {
      jobTitle: document.getElementById("xpath-job-title")?.value || '',
      jobLink: document.getElementById("xpath-job-link")?.value || '',
      jobLocation: document.getElementById("xpath-job-location")?.value || '',
      companyName: document.getElementById("xpath-company-name")?.value || '',
    };
    console.log("Collected XPaths:", data);
    // Future: send to API
  }

  function clearFields() {
    const fields = ['job-title', 'job-link', 'job-location', 'company-name'];
    fields.forEach(field => {
      const input = document.querySelector(`#xpath-${field}`);
      if (input) {
        input.value = '';
      }
      saveToStorage(field, '');
    });
  }
}