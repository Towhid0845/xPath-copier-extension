if (!window.__xPathCopierInjected) {
  window.__xPathCopierInjected = true;
  let lastRightClickedElement = null;
  let isSidebarExpanded = false;
  let currentSpiderCode = null;
  let currentJsonConfig = null;
  let isAuthenticated = false;
  let authUI = null;

  // Check authentication state first
  chrome.storage.local.get(['isAuthenticated'], (result) => {
    isAuthenticated = result.isAuthenticated || false;

    if (isAuthenticated) {
      // User is authenticated - load the normal sidebar
      loadSidebar();
    } else {
      // User not authenticated - show auth UI
      showAuthUI();
    }
  });

  // Create toggle button (always visible)
  createOpenButton();

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
    openButton.addEventListener("click", toggleUI);
  }

  function toggleUI() {
    if (isAuthenticated) {
      // Toggle sidebar if authenticated
      if (isSidebarExpanded) {
        closeSidebar();
      } else {
        openSidebar();
      }
    } else {
      // Toggle auth UI if not authenticated
      if (authUI && authUI.style.right === '20px') {
        closeAuthUI();
      } else {
        showAuthUI();
      }
    }
  }

  function showAuthUI() {
    // Remove existing auth UI if any
    if (authUI) {
      authUI.remove();
    }
    // const authOverlay = document.createElement("div");
    // authOverlay.id = "xpath-auth-overlay";
    // authOverlay.style.cssText = `
    authUI = document.createElement("div");
    authUI.id = "xpath-auth-overlay";
    authUI.style.cssText = `
          position: fixed;
          top: 50%;
          right: -350px;
          width: 350px;
          background: #fff;
          border: 2px solid #ccc;
          border-radius: 10px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          z-index: 999999;
          padding: 20px;
          font-family: Arial, sans-serif;
          transform: translateY(-50%);
          transition: right 0.5s ease;
        `;

    authUI.innerHTML = `
          <div style="text-align: center; margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px 0; color: #333; font-size: 18px;">🔐 Authentication Required</h3>
            <p style="color: #666; margin: 0; font-size: 16px;">Please authenticate to use the Jobdesk Spider plugin</p>
          </div>
          
          <div id="auth-tabs">
            <!-- Login Form -->
            <div id="login-form">
              <input type="email" id="auth-email" placeholder="Email Address" style="width: 100%; padding: 10px; margin: 5px 0; border: 1px solid #ddd; border-radius: 5px;">
              <input type="password" id="auth-password" placeholder="Password" style="width: 100%; padding: 10px; margin: 5px 0; border: 1px solid #ddd; border-radius: 5px;">
              <button id="auth-login-btn" style="width:fit-content; font-size:16px; padding:5px 70px; background:#4caf50; color:white; border:none; border-radius:25px; cursor:pointer; line-height: 24px; margin: 24px auto 24px 60px;">Login</button>
              <div style="text-align: center; font-size: 12px;">
                <a href="#" id="register-link" style="color: #2196f3; text-decoration: none;">Create Account</a> • 
                <a href="#" id="forgot-link" style="color: #2196f3; text-decoration: none;">Forgot Password?</a>
              </div>
            </div>

            <!-- 2FA Verification -->
            <div id="verify-form" style="display: none;">
              <p style="text-align: center; color: #666;">Enter verification code sent to your email</p>
              <div style="display: flex; gap: 5px; justify-content: center; margin: 15px 0;">
                ${Array(6).fill().map(() => '<input type="text" maxlength="1" style="width: 35px; height: 35px; text-align: center; border: 1px solid #ddd; border-radius: 5px;">').join('')}
              </div>
              <button id="auth-verify-btn" style="width:fit-content; font-size:16px; padding:5px 70px; background:#2196f3; color:white; border:none; border-radius:25px; cursor:pointer; line-height: 24px; margin: 24px auto 24px 60px;">Verify</button>
              <div style="text-align: center; font-size: 12px; margin-top: 10px;">
                <a href="#" id="auth-resend" style="color: #2196f3; text-decoration: none;">Resend Code</a> • 
                <a href="#" id="back-to-login" style="color: #2196f3; text-decoration: none;">Back to Login</a>
              </div>
            </div>

            <!-- Success Message -->
            <div id="auth-success" style="display: none; text-align: center;">
              <div style="font-size: 48px; margin: 10px 0;">✅</div>
              <h4 style="margin: 10px 0; color: #333; font-size: 18px;">Authentication Successful!</h4>
              <button id="auth-continue" style="width:fit-content; font-size:16px; padding:5px 70px; background:#4caf50; color:white; border:none; border-radius:25px; cursor:pointer; line-height: 24px; margin: 24px auto 24px 60px;">Continue</button>
            </div>
          </div>
        `;

    document.body.appendChild(authUI);
    // Hide open button when auth UI is shown
    // const openButton = document.getElementById("xpath-open-button");
    // if (openButton) {
    //   openButton.style.right = '-60px';
    // }
    setTimeout(() => {
      authUI.style.right = '20px';
    }, 10);

    document.getElementById('auth-login-btn').addEventListener('click', handleLogin);
    document.getElementById('auth-verify-btn').addEventListener('click', handleVerify);
    document.getElementById('auth-continue').addEventListener('click', closeAuthAndLoadSidebar);
    document.getElementById('auth-resend').addEventListener('click', resendAuthCode);
    document.getElementById('back-to-login').addEventListener('click', () => showAuthTab('login'));
    document.getElementById('register-link').addEventListener('click', () => showAuthTab('register'));
    document.getElementById('forgot-link').addEventListener('click', () => showAuthTab('forgot'));

  }

  function loadSidebar() {
    // Your existing sidebar creation code here
    // createSidebar();
    // createOpenButton();
    if (!document.getElementById("xpath-sidebar")) {
      createSidebar();
    }

    chrome.storage.local.get(['xpathData', 'sidebarState'], (result) => {
      const savedData = result.xpathData || {};
      const sidebarState = result.sidebarState !== undefined ? result.sidebarState : false;
      isSidebarExpanded = sidebarState;

      if (isSidebarExpanded) {
        openSidebar();
      } else {
        closeSidebar();
      }
      populateFields(savedData);
    });
  }

  function handleLogin() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    if (!email || !password) {
      alert('Please fill in all fields');
      return;
    }

    // Simulate login and show 2FA
    showAuthTab('verify');
  };

  function handleVerify() {
    // Simulate successful verification
    showAuthTab('success');
  };

  function closeAuthAndLoadSidebar() {
    // Set authenticated state
    chrome.storage.local.set({ isAuthenticated: true });
    isAuthenticated = true;

    // Remove auth UI
    // document.getElementById('xpath-auth-overlay').remove();
    closeAuthUI();

    // Load actual sidebar
    setTimeout(() => {
      loadSidebar();
      setTimeout(() => {
        openSidebar();
      }, 100);
    }, 500);
    // openSidebar();
  };

  function closeAuthUI() {
    if (authUI) {
      authUI.style.right = '-350px';
      // authUI.style.display = 'none';

      setTimeout(() => {
        if (authUI && authUI.parentNode) {
          authUI.parentNode.removeChild(authUI);
          authUI = null;
        }
      }, 500);
    }

    const openButton = document.getElementById("xpath-open-button");
    if (openButton) {
      openButton.style.right = '10px';
    }
  }

  function resendAuthCode() {
    alert('Verification code resent to your email');
  };

  function showAuthTab(tab) {
    document.getElementById('login-form').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('verify-form').style.display = tab === 'verify' ? 'block' : 'none';
    document.getElementById('auth-success').style.display = tab === 'success' ? 'block' : 'none';
  };

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
    if (document.getElementById("xpath-sidebar")) {
      return;
    }
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
          font-family: Arial, sans-serif;
          overflow: hidden;
          transition: all 0.5s ease;
          transform: translateY(-48%);
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        `;

    sidebar.innerHTML = `
          <div style="position: sticky; top: 0; background: #fff; padding: 10px 15px; z-index: 10;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h3 style="margin:0; font-size: 20px; font-weight: bold; color: #000">XPath Collector</h3>
                <button id="view-code-btn" style="display: none; background: #2196f3; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;">
                  View Code
                </button>
              <button id="close-sidebar" style="background: none; border: none; cursor: pointer; font-size: 20px; width: 30px; height:30px; padding: 0; color: #000">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" color: #000; xmlns="http://www.w3.org/2000/svg">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
          <hr style="margin: 0; padding: 0;">
          <div id="sidebar-content" style="height: calc(100% - 60px); overflow-y: auto; padding: 15px;  flex: 1;">
    
            <div style="margin-bottom: 8px;">
              <label style="display: block; color: #000; font-weight: bold; margin-bottom: 2px; font-size: 13px; line-height: 20px">Start URL</label>
              <input id="xpath-start-url" type="text" style="width:100%; height: 29px; font-size: 15px; box-sizing: border-box; margin-bottom: 0; background-color: #fff; color: #000; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
            </div>
    
            <div style="margin-bottom: 8px;">
              <label style="display: block; color: #000; font-weight: bold; margin-bottom: 2px; font-size: 13px; line-height: 20px">Company Name</label>
              <input id="xpath-company-name" type="text" style="width:100%; height: 29px; font-size: 15px; box-sizing: border-box; margin-bottom: 0; background-color: #fff; color: #000; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
            </div>
          
            <div style="margin-bottom: 8px;">
              <label style="display: block; color: #000; font-weight: bold; margin-bottom: 2px; font-size: 13px; line-height: 20px">Company Logo</label>
              <input id="xpath-company-logo" type="text" style="width:100%; height: 29px; font-size: 15px; box-sizing: border-box; margin-bottom: 0; background-color: #fff; color: #000; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
            </div>
    
            <div style="margin-bottom: 8px;">
              <label style="display: block; color: #000; font-weight: bold; margin-bottom: 2px; font-size: 13px; line-height: 20px">Source Country</label>
              <input id="xpath-source-country" type="text" style="width:100%; height: 29px; font-size: 15px; box-sizing: border-box; margin-bottom: 0; background-color: #fff; color: #000; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
            </div>
    
            <div style="margin-bottom: 8px;">
              <label style="display: block; color: #000; font-weight: bold; margin-bottom: 2px; font-size: 13px; line-height: 20px">Lang Code</label>
              <input id="xpath-lang-code" type="text" style="width:100%; height: 29px; font-size: 15px; box-sizing: border-box; margin-bottom: 0; background-color: #fff; color: #000; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
            </div>
          
            <div style="margin-bottom: 8px;">
              <label style="display: block; color: #000; font-weight: bold; margin-bottom: 2px; font-size: 13px; line-height: 20px">Job Link</label>
              <input id="xpath-job-link" type="text" style="width:100%; height: 29px; font-size: 15px; box-sizing: border-box; margin-bottom: 0; background-color: #fff; color: #000; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
            </div>
    
            <div style="margin-bottom: 8px;">
              <label style="display: block; color: #000; font-weight: bold; margin-bottom: 2px; font-size: 13px; line-height: 20px">Job Title</label>
              <input id="xpath-job-title" type="text" style="width:100%; height: 29px; font-size: 15px; box-sizing: border-box; margin-bottom: 0; background-color: #fff; color: #000; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
            </div>
    
            <div style="margin-bottom: 8px;">
              <label style="display: block; color: #000; font-weight: bold; margin-bottom: 2px; font-size: 13px; line-height: 20px">Job Location</label>
              <input id="xpath-job-location" type="text" style="width:100%; height: 29px; font-size: 15px; box-sizing: border-box; margin-bottom: 0; background-color: #fff; color: #000; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
            </div>
    
            <div style="margin-bottom: 8px;">
              <label style="display: block; color: #000; font-weight: bold; margin-bottom: 2px; font-size: 13px; line-height: 20px">Job Content</label>
              <input id="xpath-job-content" type="text" style="width:100%; height: 29px; font-size: 15px; box-sizing: border-box; margin-bottom: 0; background-color: #fff; color: #000; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
            </div>
    
            <div style="margin-bottom: 8px;">
              <label style="display: block; color: #000; font-weight: bold; margin-bottom: 2px; font-size: 13px; line-height: 20px">Playwright</label>
              <div style="display: flex; gap: 15px; align-items: center;">
                <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;">
                  <input type="radio" name="playwright" value="true" style="margin: 0;">
                  <span style="font-size: 13px;">Yes</span>
                </label>
                <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;">
                  <input type="radio" name="playwright" value="false" style="margin: 0;" checked>
                  <span style="font-size: 13px;">No</span>
                </label>
              </div>
            </div>
            
            <div id="playwright-selector-container" style="margin-bottom: 8px; display: none;">
              <label style="display: block; color: #000; font-weight: bold; margin-bottom: 2px; font-size: 13px; line-height: 20px">Playwright Selector</label>
              <input id="xpath-playwright-selector" type="text" style="width:100%; height: 29px; font-size: 15px; box-sizing: border-box; margin-bottom: 0; background-color: #fff; color: #000; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
            </div>
            
            <div style="display: flex; justify-content: center; gap: 10px;margin-top: 24px;">
              <button id="send-xpaths" style="width:fit-content; font-size:16px; padding:4px 25px; background:#4caf50; color:white; border:none; border-radius:25px; cursor:pointer; line-height: 24px;">
              Generate Spider
              </button>
              
              <button id="clear-fields" style="width:fit-content; font-size:16px; padding:4px 25px; background:#f44336; color:white; border:none; border-radius:25px; cursor:pointer; line-height: 24px;">
              Clear All
              </button>
            </div>
          </div>
        `;

    document.body.appendChild(sidebar);

    // Add event listeners
    document.getElementById("close-sidebar").addEventListener("click", closeSidebar);
    document.getElementById("send-xpaths").addEventListener("click", sendXPaths);
    document.getElementById("clear-fields").addEventListener("click", clearFields);

    // Radio button change handler
    const radioButtons = sidebar.querySelectorAll('input[name="playwright"]');
    radioButtons.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const fieldId = e.target.name;
        const value = e.target.value === 'true';
        saveToStorage(fieldId, value);
        togglePlaywrightSelector(value);
      });
    })

    const inputs = sidebar.querySelectorAll('input[type="text"]');
    inputs.forEach(input => {
      input.addEventListener('input', (e) => {
        const fieldId = e.target.id.replace('xpath-', '');
        saveToStorage(fieldId, e.target.value);
      });
    });

    document.getElementById("view-code-btn").addEventListener("click", () => {
      if (currentSpiderCode || currentJsonConfig) {
        showPythonCode(currentSpiderCode, currentJsonConfig);
      }
    });
  }

  function toggleViewCodeButton(show) {
    const viewCodeBtn = document.getElementById('view-code-btn');
    if (viewCodeBtn) {
      viewCodeBtn.style.display = show ? 'block' : 'none';
      console.log("View Code button visibility:", show);

    }
  }

  function togglePlaywrightSelector(show) {
    const container = document.getElementById("playwright-selector-container");
    if (container) {
      container.style.display = show ? 'block' : 'none';
    }
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
        if (field === 'playwright') {
          // Set radio button
          const value = data[field] ? 'true' : 'false';
          const radio = document.querySelector(`input[name="playwright"][value="${value}"]`);
          if (radio) {
            radio.checked = true;
            togglePlaywrightSelector(data[field]);
          }
        } else {

          const input = document.querySelector(`#xpath-${field}`);
          if (input) {
            input.value = data[field] || '';
          }
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
    chrome.storage.local.get(null, (data) => {
      if (data.playwright !== undefined) {
        data.playwright = data.playwright === true || data.playwright === 'true';
      }
      console.log("Sending data to background:", data);
      chrome.runtime.sendMessage(
        { action: "sendToAPI", payload: data },
        (response) => {
          if (!response.success) {
            alert(response.error || "Failed to send data");
          } else {
            alert("Spider generated successfully!");
            console.log("response: ", response.data.spider_code);
            // showPythonCode(response.data.spider_code);
            showPythonCode(response.data.spider_code, response.data.config);
            toggleViewCodeButton(true);
            // clearFields();
          }
        }
      );
    });
  }

  function showPythonCode(code, jsonConfig) {
    currentSpiderCode = code;
    currentJsonConfig = jsonConfig;

    // Remove existing code editor if any
    const existingEditor = document.getElementById('python-code-editor');
    if (existingEditor) {
      existingEditor.remove();
    }

    // Create code editor container
    const codeEditor = document.createElement('div');
    codeEditor.id = 'python-code-editor';
    codeEditor.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 80%;
            height: 80%;
            background: #2d2d2d;
            border: 2px solid #444;
            border-radius: 10px;
            z-index: 1000000;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            display: flex;
            flex-direction: column;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        `;

    // Create header with tabs and close button
    codeEditor.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: #333; border-bottom: 1px solid #444;">
                <div style="display: flex; gap: 10px;">
                    <button id="tab-spider" class="tab-button active" style="background: #4caf50; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-size: 14px;">
                        Spider Code
                    </button>
                    <button id="tab-json" class="tab-button" style="background: #666; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-size: 14px;">
                        JSON Config
                    </button>
                </div>
                <button id="close-code-editor" style="background: #ff4757; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-size: 14px;">
                    Close
                </button>
            </div>
            
            <div id="tab-content" style="flex: 1; overflow: auto; background: #1e1e1e;">
                <pre id="python-content" style="margin: 0; padding: 20px; color: #d4d4d4; font-size: 14px; line-height: 1.5; white-space: pre-wrap; display: block;">${escapeHtml(code)}</pre>
                <pre id="json-content" style="margin: 0; padding: 20px; color: #d4d4d4; font-size: 14px; line-height: 1.5; white-space: pre-wrap; display: none;">${escapeHtml(JSON.stringify(jsonConfig, null, 2))}</pre>
            </div>
            
            <div style="padding: 15px; background: #333; border-top: 1px solid #444; display: flex; gap: 10px;">
                <button id="copy-code" style="background: #4caf50; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-size: 14px;">
                    Copy Code
                </button>
                <button id="download-code" style="background: #2196f3; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-size: 14px;">
                    Download
                </button>
            </div>
        `;

    document.body.appendChild(codeEditor);

    // Tab functionality
    const tabSpider = document.getElementById('tab-spider');
    const tabJson = document.getElementById('tab-json');
    const pythonContent = document.getElementById('python-content');
    const jsonContent = document.getElementById('json-content');
    const copyButton = document.getElementById('copy-code');
    const downloadButton = document.getElementById('download-code');

    let currentTab = 'spider';
    let currentContent = code;

    tabSpider.addEventListener('click', () => {
      if (currentTab !== 'spider') {
        currentTab = 'spider';
        currentContent = code;
        tabSpider.style.background = '#4caf50';
        tabJson.style.background = '#666';
        pythonContent.style.display = 'block';
        jsonContent.style.display = 'none';
      }
    });

    tabJson.addEventListener('click', () => {
      if (currentTab !== 'json') {
        currentTab = 'json';
        currentContent = JSON.stringify(jsonConfig, null, 2);
        tabSpider.style.background = '#666';
        tabJson.style.background = '#4caf50';
        pythonContent.style.display = 'none';
        jsonContent.style.display = 'block';
      }
    });

    // Add event listeners
    document.getElementById('close-code-editor').addEventListener('click', () => {
      codeEditor.remove();
    });

    copyButton.addEventListener('click', () => {
      navigator.clipboard.writeText(currentContent).then(() => {
        alert(`${currentTab === 'spider' ? 'Code' : 'Config'} copied to clipboard!`);
      }).catch(err => {
        console.error('Failed to copy:', err);
      });
    });

    downloadButton.addEventListener('click', () => {
      const fileName = currentTab === 'spider' ? 'spider.py' : 'config.json';
      const contentType = currentTab === 'spider' ? 'text/python' : 'application/json';
      downloadFile(currentContent, fileName, contentType);
    });
  }

  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function downloadFile(content, fileName, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  function clearFields() {
    console.log("Clearing fields...");
    const fields = ['start-url', 'company-name', 'company-logo', 'job-title',
      'job-location', 'job-content', 'source-country', 'lang-code',
      'job-link', 'playwright-selector', 'playwright'];
    fields.forEach(field => {
      if (field === 'playwright') {
        // Reset radio buttons
        const falseRadio = document.querySelector('input[name="playwright"][value="false"]');
        if (falseRadio) {
          falseRadio.checked = true;
        }
        togglePlaywrightSelector(false);
        saveToStorage(field, false);
      } else {
        const input = document.querySelector(`#xpath-${field}`);
        if (input) {
          input.value = '';
        }
        // saveToStorage(field, '');
        // chrome.storage.local.set({ xpathData: {} });
        chrome.storage.local.clear(() => {
          console.log("All storage cleared");
        });
      }
    });
    currentSpiderCode = null;
    currentJsonConfig = null;
    toggleViewCodeButton(false);
  }

}
