document.getElementById('getSummaryButton').addEventListener('click', () => {
  // Close the popup window immediately when the button is clicked
  window.close();

  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const tab = tabs[0];
    // Send message to content script to inject the side panel and fetch the summary
    chrome.tabs.sendMessage(tab.id, { action: "injectSidePanelAndGetSummary" });
  });
});
