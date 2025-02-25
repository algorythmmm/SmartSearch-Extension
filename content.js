window.addEventListener('load', () => {
  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'injectSidePanelAndGetSummary') {
      injectSidePanelAndGetSummary();
    }
  });

  function injectSidePanelAndGetSummary() {
    // If the side panel already exists, do nothing
    if (document.getElementById('sidePanel')) return;

    // Create the side panel container
    const sidePanel = document.createElement('div');
    sidePanel.id = 'sidePanel';
    sidePanel.style.position = 'fixed';
    sidePanel.style.top = '0';
    sidePanel.style.right = '0';
    sidePanel.style.width = '350px';
    sidePanel.style.height = '100%';
    sidePanel.style.backgroundColor = '#000';
    sidePanel.style.boxShadow = '-2px 0 10px rgba(0, 0, 0, 0.7)';
    sidePanel.style.padding = '20px';
    sidePanel.style.zIndex = '9999';
    sidePanel.style.overflowY = 'auto';
    sidePanel.style.color = '#fff';
    sidePanel.style.fontFamily = 'Roboto, sans-serif';
    sidePanel.style.borderTopLeftRadius = '12px';
    sidePanel.style.borderBottomLeftRadius = '12px';

    // Header container with image and title
    const headerContainer = document.createElement('div');
    headerContainer.style.display = 'flex';
    headerContainer.style.alignItems = 'center';
    headerContainer.style.justifyContent = 'center';
    
    const maxAiImage = document.createElement('img');
    maxAiImage.src = chrome.runtime.getURL('maxai.png');
    maxAiImage.style.width = '48px';
    maxAiImage.style.height = '48px';
    
    const header = document.createElement('h2');
    header.innerText = 'AI Summary';
    header.style.textAlign = 'center';
    header.style.color = '#ffcc00';
    header.style.fontSize = '24px';
    
    headerContainer.appendChild(maxAiImage);
    headerContainer.appendChild(header);
    sidePanel.appendChild(headerContainer);

    // Create content area container
    const contentDiv = document.createElement('div');
    contentDiv.id = 'content';
    contentDiv.style.marginTop = '20px';

    // Query Card: Displays the search query
    const queryCard = document.createElement('div');
    queryCard.classList.add('queryCard');
    queryCard.style.backgroundColor = '#333';
    queryCard.style.padding = '15px';
    queryCard.style.borderRadius = '10px';
    queryCard.style.marginBottom = '20px';
    queryCard.style.border = '1px solid #555';

    const queryTitle = document.createElement('h4');
    queryTitle.style.color = '#ffcc00';
    queryCard.appendChild(queryTitle);

    const queryText = document.createElement('p');
    queryText.id = 'queryText';
    queryText.style.color = '#fff';
    queryText.style.fontSize = '18px';  
    queryText.style.fontWeight = 'bold';
    queryCard.appendChild(queryText);

    contentDiv.appendChild(queryCard);

    // Summary Card: Displays the summary, sources and a spinner while loading
    const summaryCard = document.createElement('div');
    summaryCard.classList.add('summaryCard');
    summaryCard.style.backgroundColor = '#333';
    summaryCard.style.padding = '5px 10px 10px 10px'; // Reduce top padding only
    summaryCard.style.borderRadius = '10px';
    summaryCard.style.marginBottom = '20px';
    summaryCard.style.border = '1px solid #555';
    summaryCard.style.display = 'flex';
    summaryCard.style.flexDirection = 'column';  // Ensuring child elements are stacked

    // Container for the summary title and spinner
    const summaryTitleContainer = document.createElement('div');
    summaryTitleContainer.style.display = 'flex';
    summaryTitleContainer.style.alignItems = 'center';

    const spinner = document.createElement('span');
    spinner.classList.add('spinner');
    spinner.style.display = 'inline-block';
    spinner.style.width = '16px';
    spinner.style.height = '16px';
    spinner.style.marginRight = '8px';
    spinner.style.border = '2px solid #ffcc00';
    spinner.style.borderTop = '2px solid transparent';
    spinner.style.borderRadius = '50%';
    spinner.style.animation = 'spin 1s linear infinite';

    const summaryTitle = document.createElement('h4');
    summaryTitle.innerText = 'Generating...';
    summaryTitle.style.color = '#ffcc00';
    summaryTitle.style.fontSize = '20px';
    summaryTitle.id = 'summaryTitle';

    summaryTitleContainer.appendChild(spinner);
    summaryTitleContainer.appendChild(summaryTitle);
    summaryCard.appendChild(summaryTitleContainer);

    // Placeholder for sources wrapper:
    const sourcesWrapper = document.createElement('div');
    sourcesWrapper.id = 'sourcesWrapper';
    sourcesWrapper.style.marginTop = '-10px'; 

    // Placeholder for final answer title and text:
    const finalAnswerTitle = document.createElement('h4');
    finalAnswerTitle.style.color = '#ffcc00';
    finalAnswerTitle.style.fontSize = '20px';
    finalAnswerTitle.style.marginTop = '10px';

    const summaryText = document.createElement('p');
    summaryText.id = 'summaryText';
    summaryText.style.color = '#fff';

    summaryCard.appendChild(sourcesWrapper);
    summaryCard.appendChild(finalAnswerTitle);
    summaryCard.appendChild(summaryText);

    contentDiv.appendChild(summaryCard);
    sidePanel.appendChild(contentDiv);
    document.body.appendChild(sidePanel);

    // Add CSS animation for spinner
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);

    // Extract search query and display it immediately
    const { urls, searchQuery } = extractUrlsAndQueryFromPage();
    document.getElementById('queryText').innerText = searchQuery;

    // Fetch summary from the server
    fetch('http://127.0.0.1:5000/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls, searchQuery })
    })
    .then(response => response.json())
    .then(data => {
      // Remove spinner and clear summary title text
      spinner.remove();
      summaryTitle.innerText = '';

      // Replace spinner with the "web symbol" and "Sources" text
      const webImage = document.createElement('span');
      webImage.innerText = '🌐︎'; 
      webImage.style.fontSize = '28px'; 
      webImage.style.marginRight = '8px';

      const sourcesHeadingText = document.createElement('h4');
      sourcesHeadingText.innerText = 'Sources';
      sourcesHeadingText.style.color = '#ffcc00';
      sourcesHeadingText.style.fontSize = '20px';

      summaryTitleContainer.appendChild(webImage);
      summaryTitleContainer.appendChild(sourcesHeadingText);

      const sourcesContainer = document.createElement('div');
      sourcesContainer.style.display = 'flex';
      sourcesContainer.style.flexWrap = 'wrap';  
      sourcesWrapper.appendChild(sourcesContainer);

      if (data.valid_urls && Array.isArray(data.valid_urls)) {
        data.valid_urls.forEach(url => {
          const sourceChip = document.createElement('div');
          sourceChip.style.backgroundColor = '#1E90FF';  // New background color (blue)
          sourceChip.style.color = '#fff';  // Text color (white)
          sourceChip.style.borderRadius = '8px';
          sourceChip.style.padding = '4px 6px';  // Reduced padding
          sourceChip.style.margin = '4px';      
          sourceChip.style.flex = '0 1 calc(45% - 12px)';
          sourceChip.style.border = '1px solid #555';
          sourceChip.style.display = 'inline-block';
          sourceChip.style.overflow = 'hidden';
          sourceChip.style.textOverflow = 'ellipsis';
          sourceChip.style.whiteSpace = 'nowrap';
          sourceChip.style.maxWidth = '45%';
        
          const sourceLink = document.createElement('a');
          sourceLink.href = url;
          sourceLink.target = '_blank';
          sourceLink.style.color = '#fff';  // Link color (white)
          sourceLink.style.textDecoration = 'none';
          sourceLink.style.display = 'block';
          sourceLink.style.overflow = 'hidden';
          sourceLink.style.textOverflow = 'ellipsis';
          sourceLink.style.whiteSpace = 'nowrap';
          sourceLink.style.maxWidth = '100%';
          sourceLink.style.fontSize = '14px'; // Smaller font size for compactness
        
          sourceLink.innerText = extractDomainFromUrl(url);
          sourceChip.appendChild(sourceLink);
          sourcesContainer.appendChild(sourceChip); 
        });
      }

      // Add 💡 to the left side of the final answer text
      finalAnswerTitle.innerText = '💡 Answer:';
      summaryText.innerText = data.summary;
    })
    .catch(error => {
      console.error('Error fetching data:', error);
      summaryTitle.innerText = 'Error:';
      summaryText.innerText = 'Failed to generate summary.';
      spinner.remove();
    });
  }

  function extractUrlsAndQueryFromPage() {
    const urls = [];
    const searchResults = document.querySelectorAll('.g a');
    const peopleAlsoAsk = document.querySelectorAll('.related-question-pair, .wQiwMc');
    
    let paaElements = new Set();
    peopleAlsoAsk.forEach(paa => {
      paaElements.add(paa.closest('.g'));
    });

    const currentUrl = window.location.href;
    const searchQueryMatch = currentUrl.match(/[?&]q=([^&]*)/);
    const searchQuery = searchQueryMatch ? decodeURIComponent(searchQueryMatch[1].replace(/\+/g, ' ')) : '';

    for (let i = 0; i < searchResults.length; i++) {
      const parent = searchResults[i].closest('.g');
      if (parent && paaElements.has(parent)) continue;
      const url = searchResults[i].href;
      if (url && !url.includes('/search?') && !url.includes('google.com') && !url.includes('#')) {
        urls.push(url);
      }
      if (urls.length === 10) break;
    }
    return { urls, searchQuery };
  }

  function extractDomainFromUrl(url) {
    try {
      const { hostname } = new URL(url);
      return hostname.replace(/^www\./, '');
    } catch (error) {
      return url;
    }
  }
});
