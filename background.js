chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "TABLE_LOADED") {
        console.log("Table loaded on", sender.tab.url);
    }
});