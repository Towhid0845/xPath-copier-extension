//v1.0.0
// if (!window.__xPathCopierInjected) {
//   window.__xPathCopierInjected = true;
//   let lastRightClickedElement = null;

//   // Capture the element that was right-clicked
//   document.addEventListener('contextmenu', (event) => {
//     lastRightClickedElement = event.target;
//   }, true);

//   // Listen for messages from background script
//   chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//     if (request.action === "copyXPath" && lastRightClickedElement) { //v1.1.0
//       const xpath = getXPath(lastRightClickedElement);
//       copyToClipboard(xpath);
//       showToast("XPath copied to clipboard!", xpath);
//     }
//     // return true;
//     // if (request.action === "copyXPath") { //v1.2.0
//     //   if (lastRightClickedElement && document.contains(lastRightClickedElement)) {
//     //     const xpath = getXPath(lastRightClickedElement);
//     //     copyToClipboard(xpath);
//     //     showToast("XPath copied to clipboard!", xpath);
//     //   } else {
//     //     showToast("Could not find element (DOM changed)");
//     //   }
//     // }
//   });

//   function getXPath(element) {
//     if (element.className && typeof element.className === "string") {
//       // take only the first class (for simplicity)
//       // const className = element.className.trim().split(/\s+/)[0];

//       // use full class string exactly as it appears
//       const className = element.className.trim();
//       if (className) {
//         return '//' + element.tagName.toLowerCase() + '[contains(@class, "' + className + '")]';
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
//           return getXPath(element.parentNode) + '/' + element.tagName.toLowerCase() + '[' + ix + ']';
//         }
//       }
//     }
//   }

//   function copyToClipboard(text) {
//     navigator.clipboard.writeText(text).catch(err => {
//       console.error('Failed to copy: ', err);
//     });
//   }

//   function showToast(message, xpath) {
//     const toast = document.createElement("div");
//     toast.style.cssText = `
//     position: fixed;
//     bottom: 20px;
//     right: 20px;
//     padding: 15px;
//     background: #4caf50;
//     color: white;
//     border-radius: 8px;
//     z-index: 999999;
//     box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
//     font-family: Arial, sans-serif;
//     max-width: 400px;
//     word-break: break-all;
//   `;

//     // Create message element
//     const messageEl = document.createElement("div");
//     messageEl.textContent = message;
//     messageEl.style.cssText = `
//     font-weight: bold;
//     margin-bottom: 8px;
//     font-size: 14px;
//   `;

//     // Create XPath element
//     const xpathEl = document.createElement("div");
//     xpathEl.textContent = xpath;
//     xpathEl.style.cssText = `
//     background: rgba(255, 255, 255, 0.2);
//     padding: 8px;
//     border-radius: 4px;
//     font-size: 12px;
//     font-family: 'Courier New', monospace;
//     overflow: hidden;
//     text-overflow: ellipsis;
//   `;

//     toast.appendChild(messageEl);
//     toast.appendChild(xpathEl);
//     document.body.appendChild(toast);

//     setTimeout(() => toast.remove(), 5000); // Show for 5 seconds instead of 3
//   }
// }


if (!window.__xPathCopierInjected) {
  window.__xPathCopierInjected = true;
  let lastRightClickedElement = null;

  // capture right-click target
  document.addEventListener('contextmenu', (event) => {
    lastRightClickedElement = event.target;
  }, true);

  // listen for background messages
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "copyXPath" && lastRightClickedElement) {
      const xpath = getXPath(lastRightClickedElement);

      // copy directly (no toast)
      copyToClipboard(`${xpath}`);
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
}
