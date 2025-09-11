// document.addEventListener("DOMContentLoaded", async () => {
//   const formContainer = document.getElementById("formContainer");
//   const toggleBtn = document.getElementById("toggle");

//   // Load saved data
//   chrome.storage.local.get("xpaths", (data) => {
//     if (data.xpaths) {
//       for (const key in data.xpaths) {
//         const input = document.getElementById(key);
//         if (input) input.value = data.xpaths[key];
//       }
//     }
//   });

//   // Save edits immediately
//   document.querySelectorAll("input").forEach(input => {
//     input.addEventListener("input", () => {
//       chrome.storage.local.get("xpaths", (data) => {
//         const xpaths = data.xpaths || {};
//         xpaths[input.id] = input.value;
//         chrome.storage.local.set({ xpaths });
//       });
//     });
//   });

//   // Collapse/Expand
//   let collapsed = false;
//   toggleBtn.addEventListener("click", () => {
//     collapsed = !collapsed;
//     formContainer.className = collapsed ? "collapsed" : "";
//   });

//   // Send Button
//   document.getElementById("sendBtn").addEventListener("click", async () => {
//     const { xpaths } = await chrome.storage.local.get("xpaths");
//     alert("Form data:\n" + JSON.stringify(xpaths, null, 2));
//   });

//   // Clear Button
//   document.getElementById("clearBtn").addEventListener("click", async () => {
//     await chrome.storage.local.set({ xpaths: {} });
//     document.querySelectorAll("input").forEach(input => input.value = "");
//   });
// });


// v1.2.0
// document.addEventListener("DOMContentLoaded", () => {
//   const sidebar = document.getElementById("sidebar");
//   const toggleBtn = document.getElementById("toggleBtn");
//   const sendBtn = document.getElementById("sendBtn");
//   const form = document.getElementById("xpathForm");

//   // toggle sidebar collapse/expand
//   toggleBtn.addEventListener("click", () => {
//     sidebar.classList.toggle("minimized");
//     toggleBtn.textContent = sidebar.classList.contains("minimized") ? "+" : "–";
//   });

//   // load saved xpaths into form fields
//   chrome.storage.local.get("xpaths", (data) => {
//     const xpaths = data.xpaths || {};
//     Object.keys(xpaths).forEach(field => {
//       const input = document.getElementById(field);
//       if (input) input.value = xpaths[field];
//     });
//   });

//   // listen for storage updates (live sync when context menu clicked)
//   chrome.storage.onChanged.addListener((changes, area) => {
//     if (area === "local" && changes.xpaths) {
//       const newXpaths = changes.xpaths.newValue || {};
//       Object.keys(newXpaths).forEach(field => {
//         const input = document.getElementById(field);
//         if (input) input.value = newXpaths[field];
//       });
//     }
//   });

//   // keep edits persistent
//   form.addEventListener("input", (e) => {
//     const { id, value } = e.target;
//     chrome.storage.local.get("xpaths", (data) => {
//       const xpaths = data.xpaths || {};
//       xpaths[id] = value;
//       chrome.storage.local.set({ xpaths });
//     });
//   });

//   // handle send button
//   sendBtn.addEventListener("click", () => {
//     chrome.storage.local.get("xpaths", (data) => {
//       console.log("Sending data:", data.xpaths);
//       alert("Form data is ready to send! (check console)");
//       // In future: replace with API call
//     });
//   });
// });

//v1.3.0
// const listEl = document.getElementById("list");
// const toggleBtn = document.getElementById("toggleBtn");
// let minimized = false;

// // Load saved XPaths from local storage
// chrome.storage.local.get("xpaths", (data) => {
//   const xpaths = data.xpaths || [];
//   xpaths.forEach(addXPathToUI);
// });

// // Listen for new xpaths from content.js
// window.addEventListener("message", (event) => {
//   if (event.data.type === "NEW_XPATH") {
//     addXPath(event.data.xpath);
//   }
// });

// // Add xpath to UI + storage
// function addXPath(xpath) {
//   chrome.storage.local.get("xpaths", (data) => {
//     const xpaths = data.xpaths || [];
//     xpaths.push(xpath);
//     chrome.storage.local.set({ xpaths });
//     addXPathToUI(xpath);
//   });
// }

// function addXPathToUI(xpath) {
//   const div = document.createElement("div");
//   div.className = "xpath-item";
//   const input = document.createElement("input");
//   input.value = xpath;
//   input.addEventListener("change", () => {
//     updateXPath(input.value, xpath);
//   });
//   div.appendChild(input);
//   listEl.appendChild(div);
// }

// // Update XPath when edited
// function updateXPath(newVal, oldVal) {
//   chrome.storage.local.get("xpaths", (data) => {
//     let xpaths = data.xpaths || [];
//     const index = xpaths.indexOf(oldVal);
//     if (index !== -1) {
//       xpaths[index] = newVal;
//       chrome.storage.local.set({ xpaths });
//     }
//   });
// }

// // Minimize/Expand
// toggleBtn.addEventListener("click", () => {
//   minimized = !minimized;
//   listEl.style.display = minimized ? "none" : "block";
//   toggleBtn.textContent = minimized ? "Expand" : "Minimize";
// });
