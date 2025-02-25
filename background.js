// Listen for messages from other parts of the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'sendUrlsToServer') {
    // Query the active tab in the current window
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) return;

      // Execute a script in the context of the active tab to extract URLs and query
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: extractUrlsAndQueryFromPage,
      })
      .then((result) => {
        if (result && result[0].result) {
          const { urls, searchQuery } = result[0].result;
          
          // Send the extracted data to the server for summarization
          fetch('http://127.0.0.1:5000/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ urls: urls, searchQuery: searchQuery })
          })
          .then(response => response.json())
          .then(data => {
            console.log("Scraped Text:", data);
            // Send the summary back to the popup (side panel)
            sendResponse({ summary: data.summary });
          })
          .catch(error => {
            console.error("Error sending URLs:", error);
            sendResponse({ summary: 'Error fetching summary.' });
          });
        }
      })
      .catch(error => {
        console.error("Error executing script:", error);
        sendResponse({ summary: 'Error extracting URLs.' });
      });

      // Return true to indicate asynchronous response handling
      return true;
    });
  }
});

// Function to extract URLs and the search query from the page
function extractUrlsAndQueryFromPage() {
  let urls = [];
  const searchResults = document.querySelectorAll('.g a');
  const peopleAlsoAsk = document.querySelectorAll('.related-question-pair, .wQiwMc');

  // Collect parent elements for People Also Ask sections to exclude them
  let paaElements = new Set();
  peopleAlsoAsk.forEach(paa => {
    paaElements.add(paa.closest('.g'));
  });

  // Extract the search query from the current URL using a regex match for "?q="
  const currentUrl = window.location.href;
  const searchQueryMatch = currentUrl.match(/[?&]q=([^&]*)/);
  const searchQuery = searchQueryMatch ? decodeURIComponent(searchQueryMatch[1].replace(/\+/g, ' ')) : '';

  // Loop through search result links
  for (let i = 0; i < searchResults.length; i++) {
    const parent = searchResults[i].closest('.g');
    // Skip results that are in People Also Ask
    if (parent && paaElements.has(parent)) continue;

    const url = searchResults[i].href;
    // Exclude URLs that are search links or contain unwanted text
    if (url && !url.includes('/search?') && !url.includes('google.com') && !url.includes('#')) {
      urls.push(url);
    }
    // Limit to 8 URLs
    if (urls.length === 10) break;
  }
  return { urls, searchQuery };
}
