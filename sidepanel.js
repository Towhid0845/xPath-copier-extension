// Global state
let currentAuthState = 'login'; // login, forgot, verify, success
let isAuthenticated = false;
let currentSpiderCode = null;
let currentJsonConfig = null;

// Initialize the side panel
document.addEventListener('DOMContentLoaded', function () {
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
        input.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                handleEnterKey();
            }
        });
    });
}

// Load authentication state from storage
function loadAuthenticationState() {
    chrome.storage.local.get(['isAuthenticated'], function (result) {
        isAuthenticated = result.isAuthenticated || false;

        if (isAuthenticated) {
            showWebsitesUI();
            // showXPathUI();
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
    // document.getElementById('success-btn')?.addEventListener('click', loadXPathUI);
    document.getElementById('success-btn')?.addEventListener('click', showWebsitesUI);

    // XPath form buttons
    document.getElementById('generate-btn')?.addEventListener('click', sendXPaths);
    document.getElementById('clear-btn')?.addEventListener('click', clearFields);

    initializeOTPListeners();
    initializePlaywrightListeners();

    document.getElementById('edit-btn')?.addEventListener('click', showEditorUI);
    document.getElementById('custom-xpath-btn')?.addEventListener('click', showCustomXPathUI);
}

function showCustomXPathUI() {

    // Clear any existing form data
    // clearFields();

    // Show XPath UI directly
    showXPathUI();

    // Show instruction message
    // showQuickNotification('Enter website details manually for custom XPath collection', 'info');

}

function loadStoredCode() {
    chrome.storage.local.get(['lastSpiderCode', 'lastJsonConfig'], function (result) {
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
        radio.addEventListener('change', function (e) {
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
    document.getElementById('back-to-list-btn')?.addEventListener('click', backToSpiderList);
    document.getElementById('publish-btn')?.addEventListener('click', async function () {
        // Validate that we have code to publish
        const spiderCode = document.getElementById('python-content').value;
        const jsonConfig = document.getElementById('json-content').value;

        if (!spiderCode.trim() || !jsonConfig.trim()) {
            showQuickNotification('Cannot publish: Spider code or configuration is empty', 'error');
            return;
        }

        // Show custom confirmation dialog
        const confirmed = await showPublishConfirmation();

        if (!confirmed) {
            console.log('Publish cancelled by user');
            showQuickNotification('Publish cancelled', 'info');
            return;
        }

        // Show loading state
        this.innerHTML = 'Publishing...';
        this.disabled = true;

        try {
            const result = await publishSpider();

            if (result.success) {
                // Optional: Clear form or show success message
                // console.log('Spider published successfully!');
                clearFields();
                showWebsitesUI();

                // Optional: Redirect or show success UI
                showQuickNotification('Spider published successfully!', 'success');
            } else {
                console.error('Publish failed:', result.error);
            }
        }
        catch (error) {
            showQuickNotification('Publish error: ' + error.message, 'error');
        } finally {
            // Reset button state
            this.innerHTML = 'Publish';
            this.disabled = false;
        }
    });
}

function initializeOTPListeners() {
    const otpContainer = document.getElementById('otp-container');
    if (otpContainer) {
        // Use event delegation for OTP inputs
        otpContainer.addEventListener('input', function (e) {
            if (e.target.classList.contains('otp-input')) {
                moveToNext(e.target);
            }
        });

        // Also add paste handling for better UX
        otpContainer.addEventListener('paste', function (e) {
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
        // alert(`${window.currentEditorTab === 'spider' ? 'Code' : 'Config'} copied to clipboard!`);
        showQuickNotification('Code copied to clipboard!', 'success');
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

function backToSpiderList() {
    document.getElementById('websites-ui').style.display = 'block';
    document.getElementById('xpath-ui').style.display = 'none';
    document.getElementById('editor-ui').style.display = 'none';

    // toggleEditButton(!!currentSpiderCode);
}

// Show appropriate UI based on auth state
function showAuthUI() {
    document.getElementById('auth-ui').style.display = 'block';
    document.getElementById('websites-ui').style.display = 'none';
    document.getElementById('xpath-ui').style.display = 'none';
}

// website list UI start
let websitesData = [];
let websiteId = null;
let currentFilter = 'all';

// Initialize websites UI
async function initializeWebsitesUI() {
    // loadWebsitesData();
    await loadWebsitesFromAPI();
    setupWebsitesEventListeners();
    renderWebsitesList();
}


// Setup event listeners
function setupWebsitesEventListeners() {
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.filter;
            filterWebsites(currentFilter);
        });
    });

    // Search functionality
    // document.getElementById('website-search').addEventListener('input', (e) => {
    //     searchWebsites(e.target.value);
    // });

    // Website item clicks
    document.addEventListener('click', (e) => {
        if (e.target.closest('.website-item')) {
            const websiteItem = e.target.closest('.website-item');
            // console.log('Selected item:', websiteItem);
            websiteId = websiteItem.dataset.id;
            // console.log('Selected company:', websiteId);
            selectWebsite(websiteId);
        }
    });
}

// Render websites list
function renderWebsitesList(filteredData = websitesData) {
    const listContainer = document.getElementById('websites-list');

    if (filteredData.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">🔍</span>
                <p>No companies found matching your criteria.</p>
            </div>
        `;
        // updateStatistics();
        return;
    }
    console.log('company list:', filteredData);
    listContainer.innerHTML = filteredData.map(website => `
        <tr class="website-item" data-id="${website.companyName}">
            <th class="body-item" style="padding-left: 25px;"><span class="iso2-code">${website.countryCode}</span></th>
            <th class="body-item"><span class="company-name">${website.companyName}</span></th>
            <th class="body-item" style="padding-right: 25px;"><span class="domain-name">${website.sourceKey}</span></th>
        </tr>
    `).join('');

    // updateStatistics();
}

// Filter websites
function filterWebsites(filterType) {
    let filteredData = websitesData;

    switch (filterType) {
        case 'no-spider':
            filteredData = websitesData.filter(w => (w.hasNoSpider == true) === 'no-spider');
            break;
        case 'broken-spider':
            filteredData = websitesData.filter(w => w.status === 'broken-spider');
            break;
        case 'all':
        default:
            filteredData = websitesData;
    }

    renderWebsitesList(filteredData);
}

// Search websites
function searchWebsites(query) {
    if (!query) {
        filterWebsites(currentFilter);
        return;
    }

    const filteredData = websitesData.filter(website =>
        website.company.toLowerCase().includes(query.toLowerCase()) ||
        website.domain.toLowerCase().includes(query.toLowerCase()) ||
        website.iso2.toLowerCase().includes(query.toLowerCase())
    );

    renderWebsitesList(filteredData);
}

// Select website (navigate to XPath form)
function selectWebsite(websiteId) {
    const website = websitesData.find(w => w.companyName == websiteId);
    if (website) {
        // Remove selection from all items
        document.querySelectorAll('.website-item').forEach(item => {
            item.classList.remove('selected');
        });

        // Add selection to clicked item
        const selectedItem = document.querySelector(`.website-item[data-id="${websiteId}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
        }

        // Open website in new tab
        if (website.startUrl) {
            try {
                // Ensure the URL has a protocol
                let url = website.startUrl;
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    url = 'https://' + url;
                }

                window.open(url, 'noopener,noreferrer');
                console.log('Opened website:', url);
            } catch (error) {
                console.error('Failed to open website:', error);
                // Fallback: try without protocol validation
                window.open(website.startUrl, '_blank', 'noopener,noreferrer');
            }
        } else {
            console.warn('No startUrl found for website:', website);
        }


        setTimeout(() => {
            showXPathUI();

            // Wait for UI to be fully rendered
            setTimeout(() => {
                // Debug: Check if elements exist
                const startUrlInput = document.getElementById('xpath-start-url');
                const sourceKeyInput = document.getElementById('xpath-source-key');
                const companyNameInput = document.getElementById('xpath-company-name');
                const countryCodeInput = document.getElementById('xpath-source-country');

                if (startUrlInput && companyNameInput) {
                    startUrlInput.value = website.startUrl;
                    sourceKeyInput.value = website.sourceKey;
                    companyNameInput.value = website.companyName;
                    countryCodeInput.value = website.countryCode.toLowerCase();
                    console.log('Values set successfully');

                    // Force UI update (if needed)
                    startUrlInput.dispatchEvent(new Event('input', { bubbles: true }));
                    sourceKeyInput.dispatchEvent(new Event('input', { bubbles: true }));
                    companyNameInput.dispatchEvent(new Event('input', { bubbles: true }));
                    countryCodeInput.dispatchEvent(new Event('input', { bubbles: true }));
                } else {
                    console.error('Input elements not found!');
                }

                // showQuickNotification(`Selected ${website.companyName} for spider creation`, 'info');
            }, 100); // Small delay to ensure UI is ready

        }, 300);
    }
}

// Update statistics
function updateStatistics() {
    const total = websitesData.length;
    const noSpider = websitesData.filter(w => w.status === 'no-spider').length;
    const brokenSpider = websitesData.filter(w => w.status === 'broken-spider').length;

    document.getElementById('total-websites').textContent = total;
    document.getElementById('no-spider-count').textContent = noSpider;
    document.getElementById('broken-spider-count').textContent = brokenSpider;
}

// Show websites UI (call this when authentication is successful)
function showWebsitesUI() {
    document.getElementById('auth-ui').style.display = 'none';
    document.getElementById('websites-ui').style.display = 'block';
    document.getElementById('xpath-ui').style.display = 'none';
    initializeWebsitesUI();
}

// Function to load data from API (for future use)
async function loadWebsitesFromAPI() {
    try {
        // Show loading state
        document.getElementById('websites-list').innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading websites...</p>
            </div>
        `;

        const token = '215c566011a84286a440e42bb40d762347d4ab2be3334a438f9f6c2041cd57c35ca5fb28ce874110aa6873398b2d9f1c';
        const API_URL = 'https://data.jobdesk.com/api/GetSpiderListPlugin';
        const response = await fetch(API_URL, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        // console.log('company list from API:', data);

        websitesData = data; // Assuming API returns array of websites
        renderWebsitesList();

    } catch (error) {
        console.error('Failed to load websites:', error);
        document.getElementById('websites-list').innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">❌</span>
            </div>
        `;
        // loadWebsitesData(); // Fallback to static data
        // renderWebsitesList();
    }
}
//website list UI end


async function publishSpider() {
    const website = websitesData.find(w => w.companyName == websiteId);
    console.log('Publishing spider for:', website);
    console.log('for country:', document.getElementById('xpath-source-country').value);

    // if(website) return;

    try {
        // Get the authentication token
        const token = "215c566011a84286a440e42bb40d762347d4ab2be3334a438f9f6c2041cd57c35ca5fb28ce874110aa6873398b2d9f1c";
        if (!token) {
            throw new Error('Authentication token not available');
        }

        // Get current spider code and config
        const spiderCode = document.getElementById('python-content').value;
        const jsonConfig = document.getElementById('json-content').value;

        // Validate data
        if (!spiderCode || !jsonConfig) {
            throw new Error('Spider code or configuration is missing');
        }

        // Prepare the payload
        const payload = {
            CountryCode: document.getElementById('xpath-source-country').value,
            CompanyName: document.getElementById('xpath-company-name').value,
            SourceKey: document.getElementById('xpath-source-key').value,
            ConfigJson: jsonConfig,
            SpiderCode: spiderCode,
            IsPublished: website.isPublished || false,
            CurrentRunningStatus: 1,
            LastRunStarted: new Date().toISOString(),
            LastRunCompleted: new Date().toISOString(),
            LastRunTotalJobs: 0,
            LastRunSuccessful: true,
            HasNoJoblistingPage: false,
            IsJobportal: website.isJobportal || false,
            Created: new Date().toISOString(),
            LastUpdated: new Date().toISOString(),
            CreatedBy: "extension",
            UpdatedBy: "extension",
            Type: "crawler",
            LastUploaded: new Date().toISOString()
        };

        console.log('Sending payload:', payload);

        const response = await fetch('https://data.jobdesk.com/api/AddNewCrawler', {
            method: 'POST',
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
        console.log('✅ Spider published successfully:', result);
        return { success: true, data: result };

    } catch (error) {
        console.error('❌ Failed to publish spider:', error);
        return { success: false, error: error.message };
    }
}

// Custom confirmation function
function showPublishConfirmation() {
    return new Promise((resolve) => {
        const modal = document.getElementById('publish-confirm-modal');
        const confirmBtn = document.getElementById('confirm-publish-ok');
        const cancelBtn = document.getElementById('confirm-publish-cancel');

        // Show modal
        modal.style.display = 'flex';

        // Remove previous event listeners
        confirmBtn.replaceWith(confirmBtn.cloneNode(true));
        cancelBtn.replaceWith(cancelBtn.cloneNode(true));

        // Get new references
        const newConfirmBtn = document.getElementById('confirm-publish-ok');
        const newCancelBtn = document.getElementById('confirm-publish-cancel');

        // Confirm button handler
        newConfirmBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            // document.getElementById('editor-ui').style.display = 'none';
            resolve(true);
        });

        // Cancel button handler
        newCancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            resolve(false);
        });

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
                resolve(false);
            }
        });

        // Close with Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                modal.style.display = 'none';
                resolve(false);
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    });
}

function showXPathUI() {
    document.getElementById('xpath-ui').style.display = 'block';
    document.getElementById('auth-ui').style.display = 'none';
    document.getElementById('websites-ui').style.display = 'none';
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
    // showQuickNotification('Authentication successful!', 'success');
    showXPathUI();
}

// XPath form functionality
function loadXPathData() {
    chrome.storage.local.get(['xpathData'], function (result) {
        const data = result.xpathData || {};

        // Populate form fields
        document.getElementById('xpath-start-url').value = data['start-url'] || '';
        document.getElementById('xpath-source-key').value = data['source-key'] || '';
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
        'source-key': document.getElementById('xpath-source-key').value,
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
    }, function (response) {
        if (response.success) {
            showQuickNotification('Spider generated successfully!', 'success');
            currentSpiderCode = response.data.spider_code;
            currentJsonConfig = response.data.config;
            toggleEditButton(true);
            // alert('Spider generated successfully!');
            saveGeneratedCode(currentSpiderCode, currentJsonConfig);
            showPythonCode(response.data.spider_code, response.data.config);

            // clearFields();
        } else {
            showQuickNotification('Error: ' + response.error, 'error');
            toggleEditButton(false);
        }
    });
}

function clearFields() {
    // showQuickNotification('Clearing all fields...', 'info');
    // Clear all form fields
    document.getElementById('xpath-start-url').value = '';
    document.getElementById('xpath-source-key').value = '';
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
    chrome.storage.local.set({
        xpathData: {},
        lastSpiderCode: null,
        lastJsonConfig: null
    });
    // showNotification('All fields and data cleared successfully!', null, 'success');
    // setTimeout(() => {
    //     showQuickNotification('All data cleared successfully!', 'success');
    // }, 500);
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
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
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
        chrome.storage.local.get(['xpathData'], function (result) {
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

function showPythonCode(code, jsonConfig) {
    // Hide other UIs and show editor
    document.getElementById('auth-ui').style.display = 'none';
    document.getElementById('xpath-ui').style.display = 'none';
    document.getElementById('websites-ui').style.display = 'none';
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

function showQuickNotification(message, type = 'success') {
    const notification = document.createElement("div");
    const bgColor = type === 'success' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : type === 'error' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';

    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 12px 16px;
        border-radius: 6px;
        z-index: 10000;
        font-family: Arial, sans-serif;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
    `;

    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <span>${type === 'success' ? '☑️' : type === 'error' ? '❌' : '💡'}</span>
            <span>${message}</span>
        </div>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);

    // Click to dismiss immediately
    notification.addEventListener('click', () => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    });
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

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