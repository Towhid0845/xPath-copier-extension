// Global state
let currentAuthState = 'login'; // login, forgot, verify, success
let isAuthenticated = false;
let currentSpiderCode = null;
let currentJsonConfig = null;

// Initialize the side panel
document.addEventListener('DOMContentLoaded', function() {
    initializePanel();
    loadAuthenticationState();
    initializeEventListeners();
    initializeEditorListeners();
    loadStoredCode();
});

// Initialize panel functionality
function initializePanel() {
    // Close panel button
    // document.getElementById('close-panel').addEventListener('click', function() {
    //     chrome.runtime.sendMessage({ action: "closeSidePanel" });
    // });

    // Check for Enter key in auth forms
    const authInputs = document.querySelectorAll('#auth-ui input');
    authInputs.forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleEnterKey();
            }
        });
    });
}

// Load authentication state from storage
function loadAuthenticationState() {
    chrome.storage.local.get(['isAuthenticated'], function(result) {
        isAuthenticated = result.isAuthenticated || false;
        
        if (isAuthenticated) {
            showXPathUI();
        } else {
            showAuthUI();
            showAuthForm('login');
        }
    });
}

function initializeEventListeners() {
    // Auth form buttons
    document.getElementById('login-btn')?.addEventListener('click', handleLogin);
    document.getElementById('forgot-btn')?.addEventListener('click', handleForgotPassword);
    document.getElementById('verify-btn')?.addEventListener('click', handleVerify);
    document.getElementById('resend-btn')?.addEventListener('click', resendCode);

    // Navigation links
    document.getElementById('show-forgot')?.addEventListener('click', () => showAuthForm('forgot'));
    document.getElementById('show-login')?.addEventListener('click', () => showAuthForm('login'));

    // Success button
    document.getElementById('success-btn')?.addEventListener('click', loadXPathUI);

    // XPath form buttons
    document.getElementById('generate-btn')?.addEventListener('click', sendXPaths);
    document.getElementById('clear-btn')?.addEventListener('click', clearFields);

    initializeOTPListeners();
    initializePlaywrightListeners();

    document.getElementById('edit-btn')?.addEventListener('click', showEditorUI);
}

function loadStoredCode() {
    chrome.storage.local.get(['lastSpiderCode', 'lastJsonConfig'], function(result) {
        if (result.lastSpiderCode && result.lastJsonConfig) {
            currentSpiderCode = result.lastSpiderCode;
            currentJsonConfig = result.lastJsonConfig;
            toggleEditButton(true);
        } else {
            // Ensure they're null if storage was cleared
            currentSpiderCode = null;
            currentJsonConfig = null;
            toggleEditButton(false);
        }
    });
}

function saveGeneratedCode(code, config) {
    if (code && config) {
        chrome.storage.local.set({
            lastSpiderCode: code,
            lastJsonConfig: config
        });
    } else {
        // Clear if null values are passed
        chrome.storage.local.set({
            lastSpiderCode: null,
            lastJsonConfig: null
        });
    }
}

function toggleEditButton(show) {
    const editBtn = document.getElementById('edit-btn');
    if (editBtn) {
        editBtn.style.display = show ? 'block' : 'none';
    }
}

function showEditorUI() {
    if (currentSpiderCode && currentJsonConfig) {
        showPythonCode(currentSpiderCode, currentJsonConfig);
    }
}

function initializePlaywrightListeners() {
    const playwrightRadios = document.querySelectorAll('input[name="playwright"]');
    playwrightRadios.forEach(radio => {
        radio.addEventListener('change', function(e) {
            togglePlaywrightSelector(e.target.value === 'true');
        });
    });
}

function togglePlaywrightSelector(show) {
    const container = document.getElementById('playwright-selector-container');
    if (container) {
        container.style.display = show ? 'block' : 'none';
    }
}

function initializeEditorListeners() {
    // Tab switching
    document.getElementById('tab-spider')?.addEventListener('click', switchToSpiderTab);
    document.getElementById('tab-json')?.addEventListener('click', switchToJsonTab);
    
    // Editor actions
    document.getElementById('copy-code-btn')?.addEventListener('click', copyEditorContent);
    document.getElementById('download-code-btn')?.addEventListener('click', downloadEditorContent);
    document.getElementById('back-to-form-btn')?.addEventListener('click', backToXPathForm);
}

function initializeOTPListeners() {
    const otpContainer = document.getElementById('otp-container');
    if (otpContainer) {
        // Use event delegation for OTP inputs
        otpContainer.addEventListener('input', function(e) {
            if (e.target.classList.contains('otp-input')) {
                moveToNext(e.target);
            }
        });
        
        // Also add paste handling for better UX
        otpContainer.addEventListener('paste', function(e) {
            e.preventDefault();
            const pastedData = e.clipboardData.getData('text').replace(/\D/g, ''); // Numbers only
            const otpInputs = Array.from(otpContainer.querySelectorAll('.otp-input'));
            
            // Fill OTP inputs with pasted data
            for (let i = 0; i < Math.min(pastedData.length, otpInputs.length); i++) {
                otpInputs[i].value = pastedData[i];
                if (i < otpInputs.length - 1) {
                    otpInputs[i].nextElementSibling?.focus();
                }
            }
        });
    }
}

function switchToSpiderTab() {
    document.getElementById('tab-spider').style.background = '#4caf50';
    document.getElementById('tab-json').style.background = '#666';
    document.getElementById('python-content').style.display = 'block';
    document.getElementById('json-content').style.display = 'none';
    window.currentEditorTab = 'spider';
    window.currentEditorContent = document.getElementById('python-content').textContent;
}

function switchToJsonTab() {
    document.getElementById('tab-spider').style.background = '#666';
    document.getElementById('tab-json').style.background = '#4caf50';
    document.getElementById('python-content').style.display = 'none';
    document.getElementById('json-content').style.display = 'block';
    window.currentEditorTab = 'json';
    window.currentEditorContent = document.getElementById('json-content').textContent;
}

function copyEditorContent() {
    const content = window.currentEditorTab === 'spider' ? window.currentEditorContent : window.currentJsonContent;
        // ? document.getElementById('python-content').textContent
        // : document.getElementById('json-content').textContent;
    
    navigator.clipboard.writeText(content).then(() => {
        alert(`${window.currentEditorTab === 'spider' ? 'Code' : 'Config'} copied to clipboard!`);
    });
}

function downloadEditorContent() {
    const content = window.currentEditorTab === 'spider' ? window.currentEditorContent : window.currentJsonContent;
        // ? document.getElementById('python-content').textContent
        // : document.getElementById('json-content').textContent;
    
    const fileName = window.currentEditorTab === 'spider' ? 'spider.py' : 'config.json';
    const contentType = window.currentEditorTab === 'spider' ? 'text/python' : 'application/json';
    
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
}

function backToXPathForm() {
    document.getElementById('editor-ui').style.display = 'none';
    document.getElementById('xpath-ui').style.display = 'block';

    toggleEditButton(!!currentSpiderCode);
}

// Show appropriate UI based on auth state
function showAuthUI() {
    document.getElementById('auth-ui').style.display = 'block';
    document.getElementById('xpath-ui').style.display = 'none';
}

function showXPathUI() {
    document.getElementById('auth-ui').style.display = 'none';
    document.getElementById('xpath-ui').style.display = 'block';
    loadXPathData();
}

// Auth form navigation
function showAuthForm(formType) {
    currentAuthState = formType;
    
    // Hide all forms
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('forgot-form').style.display = 'none';
    document.getElementById('verify-form').style.display = 'none';
    document.getElementById('success-form').style.display = 'none';
    
    // Show selected form
    document.getElementById(`${formType}-form`).style.display = 'block';
    
    // Focus first input
    setTimeout(() => {
        const firstInput = document.querySelector(`#${formType}-form input`);
        if (firstInput) firstInput.focus();
    }, 100);
}

// Handle Enter key based on current form
function handleEnterKey() {
    switch (currentAuthState) {
        case 'login':
            handleLogin();
            break;
        case 'forgot':
            handleForgotPassword();
            break;
        case 'verify':
            handleVerify();
            break;
    }
}

// OTP input navigation
function moveToNext(input) {
    if (input.value.length === 1) {
        const next = input.nextElementSibling;
        if (next && next.classList.contains('otp-input')) {
            next.focus();
        }
    }

    // Auto-submit if all fields are filled
    const otpInputs = document.querySelectorAll('.otp-input');
    const allFilled = Array.from(otpInputs).every(input => input.value.length === 1);
    if (allFilled) {
        document.getElementById('verify-btn')?.focus();
    }
}

// Auth handlers
function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    alert('login clicked');
    console.log(email, password);
    
    if (!email || !password) {
        alert('Please fill in all fields');
        return;
    }
    
    // Simulate API call - replace with actual authentication
    simulateAPICall('login', { email, password })
        .then(() => showAuthForm('verify'))
        .catch(error => alert(error));
}

function handleForgotPassword() {
    const email = document.getElementById('reset-email').value;
    
    if (!email) {
        alert('Please enter your email address');
        return;
    }
    
    simulateAPICall('forgotPassword', { email })
        .then(() => alert('Password reset link sent to your email'))
        .catch(error => alert(error));
}

function handleVerify() {
    const otpInputs = document.querySelectorAll('.otp-input');
    const otpCode = Array.from(otpInputs).map(input => input.value).join('');
    
    if (otpCode.length !== 6) {
        alert('Please enter the full 6-digit code');
        return;
    }
    
    simulateAPICall('verify2FA', { code: otpCode })
        .then(() => {
            // Set authenticated state
            chrome.storage.local.set({ isAuthenticated: true });
            isAuthenticated = true;
            showAuthForm('success');
        })
        .catch(error => alert(error));
}

function resendCode() {
    simulateAPICall('resendCode')
        .then(() => alert('Verification code resent to your email'))
        .catch(error => alert(error));
}

function loadXPathUI() {
    showXPathUI();
}

// XPath form functionality
function loadXPathData() {
    chrome.storage.local.get(['xpathData'], function(result) {
        const data = result.xpathData || {};
        
        // Populate form fields
        document.getElementById('xpath-start-url').value = data['start-url'] || '';
        document.getElementById('xpath-company-name').value = data['company-name'] || '';
        document.getElementById('xpath-company-logo').value = data['company-logo'] || '';
        document.getElementById('xpath-source-country').value = data['source-country'] || '';
        document.getElementById('xpath-lang-code').value = data['lang-code'] || '';
        document.getElementById('xpath-job-link').value = data['job-link'] || '';
        document.getElementById('xpath-job-title').value = data['job-title'] || '';
        document.getElementById('xpath-job-location').value = data['job-location'] || '';
        document.getElementById('xpath-job-content').value = data['job-content'] || '';
        
        // Set playwright radio
        const playwrightValue = data['playwright'] === true ? 'true' : 'false';
        document.querySelector(`input[name="playwright"][value="${playwrightValue}"]`).checked = true;
        togglePlaywrightSelector(data['playwright'] === true);
    });
}

function sendXPaths() {
    const formData = {
        'start-url': document.getElementById('xpath-start-url').value,
        'company-name': document.getElementById('xpath-company-name').value,
        'company-logo': document.getElementById('xpath-company-logo').value,
        'source-country': document.getElementById('xpath-source-country').value,
        'lang-code': document.getElementById('xpath-lang-code').value,
        'job-link': document.getElementById('xpath-job-link').value,
        'job-title': document.getElementById('xpath-job-title').value,
        'job-location': document.getElementById('xpath-job-location').value,
        'job-content': document.getElementById('xpath-job-content').value,
        'playwright': document.querySelector('input[name="playwright"]:checked').value === 'true',
        'playwright-selector': document.getElementById('xpath-playwright-selector').value,
    };
    
    // Save to storage
    chrome.storage.local.set({ xpathData: formData });
    
    // Send to background for API call
    chrome.runtime.sendMessage({
        action: "sendToAPI",
        payload: formData
    }, function(response) {
        if (response.success) {
            currentSpiderCode = response.data.spider_code;
            currentJsonConfig = response.data.config;
            toggleEditButton(true);
            // alert('Spider generated successfully!');
            saveGeneratedCode(currentSpiderCode, currentJsonConfig);
            showPythonCode(response.data.spider_code, response.data.config);
            // clearFields();
        } else {
            alert('Error: ' + response.error);
            toggleEditButton(false);
        }
    });
}

function clearFields() {
    // Clear all form fields
    document.getElementById('xpath-start-url').value = '';
    document.getElementById('xpath-company-name').value = '';
    document.getElementById('xpath-company-logo').value = '';
    document.getElementById('xpath-source-country').value = '';
    document.getElementById('xpath-lang-code').value = '';
    document.getElementById('xpath-job-link').value = '';
    document.getElementById('xpath-job-title').value = '';
    document.getElementById('xpath-job-location').value = '';
    document.getElementById('xpath-job-content').value = '';
    document.getElementById('xpath-playwright-selector').value = '';
    document.querySelector('input[name="playwright"][value="false"]').checked = true;
    togglePlaywrightSelector(false);

    currentSpiderCode = null;
    currentJsonConfig = null;
    toggleEditButton(false);
    
    // Clear storage
    chrome.storage.local.set({ xpathData: {}, 
        lastSpiderCode: null,
        lastJsonConfig: null 
    });
    showNotification('All fields and data cleared successfully!', null, 'success');
}

// Logout functionality
function logout() {
    chrome.storage.local.set({ isAuthenticated: false });
    isAuthenticated = false;
    showAuthUI();
    showAuthForm('login');
}

// Simulate API calls - Replace with actual API integration
function simulateAPICall(endpoint, data) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // Simulate successful response
            if (Math.random() > 0.1) { // 90% success rate for demo
                resolve({ success: true });
            } else {
                reject('API request failed. Please try again.');
            }
        }, 1000);
    });
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    switch (request.action) {
        case "updateXPathField":
            updateXPathField(request.field, request.value);
            sendResponse({ success: true });
            break;
        case "checkAuthStatus":
            sendResponse({ isAuthenticated: isAuthenticated });
            break;
    }
    return true;
});

function updateXPathField(field, value) {
    const input = document.getElementById(`xpath-${field}`);
    if (input) {
        input.value = value;
        // Auto-save to storage
        chrome.storage.local.get(['xpathData'], function(result) {
            const data = result.xpathData || {};
            data[field] = value;
            chrome.storage.local.set({ xpathData: data });
        });
    }
}

// Add logout button to header (optional)
function addLogoutButton() {
    const header = document.querySelector('.header');
    if (header && isAuthenticated) {
        const logoutBtn = document.createElement('button');
        logoutBtn.textContent = 'Logout';
        logoutBtn.className = 'btn btn-secondary';
        logoutBtn.style.marginLeft = '10px';
        logoutBtn.onclick = logout;
        header.appendChild(logoutBtn);
    }
}

// Add to sidepanel.js
// function showPythonCode(code, jsonConfig) {
//     // Create code editor in the side panel instead of webpage
//     const sidePanel = document.getElementById('xpath-ui');
    
//     // Clear existing content and show code editor
//     sidePanel.innerHTML = `
//         <div style="padding: 20px;">
//             <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
//                 <h3>Generated Spider Code</h3>
//                 <button onclick="loadXPathUI()" style="background: #6c757d; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer;">
//                     ← Back to Form
//                 </button>
//             </div>
            
//             <div style="display: flex; gap: 10px; margin-bottom: 15px;">
//                 <button id="tab-spider" class="tab-button active" style="background: #4caf50; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer;">
//                     Spider Code
//                 </button>
//                 <button id="tab-json" class="tab-button" style="background: #666; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer;">
//                     JSON Config
//                 </button>
//             </div>
            
//             <div style="background: #2d2d2d; border-radius: 8px; overflow: hidden;">
//                 <pre id="python-content" style="margin: 0; padding: 20px; color: #d4d4d4; font-size: 13px; line-height: 1.5; white-space: pre-wrap; display: block; max-height: 60vh; overflow: auto; font-family: 'Monaco', 'Menlo', monospace;">${escapeHtml(code)}</pre>
//                 <pre id="json-content" style="margin: 0; padding: 20px; color: #d4d4d4; font-size: 13px; line-height: 1.5; white-space: pre-wrap; display: none; max-height: 60vh; overflow: auto; font-family: 'Monaco', 'Menlo', monospace;">${escapeHtml(JSON.stringify(jsonConfig, null, 2))}</pre>
//             </div>
            
//             <div style="display: flex; gap: 10px; margin-top: 15px;">
//                 <button onclick="copyCode()" style="background: #4caf50; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; flex: 1;">
//                     Copy Code
//                 </button>
//                 <button onclick="downloadCode()" style="background: #2196f3; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; flex: 1;">
//                     Download
//                 </button>
//             </div>
//         </div>
//     `;

//     // Add tab functionality
//     let currentTab = 'spider';
//     let currentContent = code;

//     document.getElementById('tab-spider').addEventListener('click', () => {
//         if (currentTab !== 'spider') {
//             currentTab = 'spider';
//             currentContent = code;
//             document.getElementById('tab-spider').style.background = '#4caf50';
//             document.getElementById('tab-json').style.background = '#666';
//             document.getElementById('python-content').style.display = 'block';
//             document.getElementById('json-content').style.display = 'none';
//         }
//     });

//     document.getElementById('tab-json').addEventListener('click', () => {
//         if (currentTab !== 'json') {
//             currentTab = 'json';
//             currentContent = JSON.stringify(jsonConfig, null, 2);
//             document.getElementById('tab-spider').style.background = '#666';
//             document.getElementById('tab-json').style.background = '#4caf50';
//             document.getElementById('python-content').style.display = 'none';
//             document.getElementById('json-content').style.display = 'block';
//         }
//     });

//     // Add helper functions
//     window.copyCode = function() {
//         navigator.clipboard.writeText(currentContent).then(() => {
//             alert(`${currentTab === 'spider' ? 'Code' : 'Config'} copied to clipboard!`);
//         });
//     };

//     window.downloadCode = function() {
//         const fileName = currentTab === 'spider' ? 'spider.py' : 'config.json';
//         const contentType = currentTab === 'spider' ? 'text/python' : 'application/json';
//         const blob = new Blob([currentContent], { type: contentType });
//         const url = URL.createObjectURL(blob);
//         const a = document.createElement('a');
//         a.href = url;
//         a.download = fileName;
//         a.click();
//         URL.revokeObjectURL(url);
//     };
// }

function showPythonCode(code, jsonConfig) {
    // Hide other UIs and show editor
    document.getElementById('auth-ui').style.display = 'none';
    document.getElementById('xpath-ui').style.display = 'none';
    document.getElementById('editor-ui').style.display = 'block';
    
    // Set code content
    document.getElementById('python-content').textContent = code;
    document.getElementById('json-content').textContent = JSON.stringify(jsonConfig, null, 2);
    
    // Reset tabs to spider view
    document.getElementById('tab-spider').style.background = '#4caf50';
    document.getElementById('tab-json').style.background = '#666';
    document.getElementById('python-content').style.display = 'block';
    document.getElementById('json-content').style.display = 'none';
    
    // Store current content for copy/download
    window.currentEditorContent = code;
    window.currentEditorTab = 'spider';
    window.currentJsonContent = JSON.stringify(jsonConfig, null, 2);
}

// Add escapeHtml function to sidepanel.js
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Storage management (if needed in side panel)
function saveToStorage(field, value) {
    chrome.storage.local.get(['xpathData'], (result) => {
        const xpathData = result.xpathData || {};
        xpathData[field] = value;
        chrome.storage.local.set({ xpathData });
    });
}

// UI management (in side panel)
function togglePlaywrightSelector(show) {
    const container = document.getElementById("playwright-selector-container");
    if (container) {
        container.style.display = show ? 'block' : 'none';
    }
}

// Export functions for global access (if needed)
window.showAuthForm = showAuthForm;
window.handleLogin = handleLogin;
window.handleForgotPassword = handleForgotPassword;
window.handleVerify = handleVerify;
window.resendCode = resendCode;
window.loadXPathUI = loadXPathUI;
window.sendXPaths = sendXPaths;
window.clearFields = clearFields;
window.moveToNext = moveToNext;