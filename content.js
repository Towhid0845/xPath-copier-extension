if (!window.__xPathCopierInjected) {
  window.__xPathCopierInjected = true;
  let lastRightClickedElement = null;
  // createOpenButton();

  // Capture right-click target
  document.addEventListener('contextmenu', (event) => {
    lastRightClickedElement = event.target;
  }, true);

  // Listen for background messages
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "copyXPath" && lastRightClickedElement) {
      const xpath = getXPath(lastRightClickedElement);
      chrome.runtime.sendMessage({
        action: "updateXPathField",
        field: request.field,
        value: xpath
      });

      // Copy to clipboard
      copyToClipboard(xpath);
      showQuickNotification(`XPath copied for ${request.field}`);
    }
    return true;
  });

  // function createOpenButton() {
  //   const openButton = document.createElement("div");
  //   openButton.id = "xpath-open-button";
  //   openButton.style.cssText = `
  //     position: fixed;
  //     top: 10%;
  //     right: 10px;
  //     width: 50px;
  //     height: 50px;
  //     background: #fff;
  //     border: 2px solid #ccc;
  //     border-radius: 25px;
  //     box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  //     z-index: 999999;
  //     display: flex;
  //     justify-content: center;
  //     align-items: center;
  //     cursor: pointer;
  //   `;

  //   openButton.innerHTML = `
  //     <img src="${chrome.runtime.getURL('logo.svg')}" alt="Open" style="width: 25px; height: 25px;">
  //   `;

  //   openButton.addEventListener("click", () => {
  //     chrome.runtime.sendMessage({ action: "openSidePanel" },
  //       (response) => {
  //         if (!response) {
  //           console.error('No response from background script');
  //           showQuickNotification('Failed to open panel. No response.');
  //         } else if (!response.success) {
  //           console.error('Failed to open side panel:', response.error);
  //           showQuickNotification('Failed to open panel: ' + response.error);
  //         } else {
  //           console.log('Side panel opened successfully');
  //         }
  //       }
  //     );
  //   });
  //   document.body.appendChild(openButton);
  // }

  function showQuickNotification(message) {
    // Simple notification for XPath copy feedback
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #4caf50;
      color: white;
      padding: 10px 15px;
      border-radius: 6px;
      z-index: 999999;
      font-family: Arial, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 2000);
  }

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

}
