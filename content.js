// WikiKeyword Content Script
let popupElement = null;

// Clean up any existing popup
function removePopup() {
  if (popupElement && popupElement.parentNode) {
    popupElement.parentNode.removeChild(popupElement);
    popupElement = null;
  }
}

// Format large numbers with commas
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Get Wikipedia pageviews
async function getPageviews(term) {
  try {
    const formattedTerm = term.trim().replace(/\s+/g, '_');
    const endDate = new Date();
    const startDate = new Date('2015-07-01'); // Wikipedia API start date
    
    const end = endDate.toISOString().split('T')[0].replace(/-/g, '');
    const start = startDate.toISOString().split('T')[0].replace(/-/g, '');
    
    const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/${encodeURIComponent(formattedTerm)}/daily/${start}/${end}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        return { error: 'No Wikipedia page found' };
      }
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      return { error: 'No data available' };
    }
    
    const totalViews = data.items.reduce((sum, item) => sum + item.views, 0);
    
    return {
      totalViews,
      formattedTerm
    };
  } catch (err) {
    console.error('WikiKeyword Error:', err);
    return { error: 'Unable to fetch data' };
  }
}

// Create and show popup
async function showPopup(selectedText, x, y) {
  removePopup();
  
  // Create popup container
  popupElement = document.createElement('div');
  popupElement.className = 'wikikeyword-popup';
  popupElement.innerHTML = '<div class="wikikeyword-loading">Loading...</div>';
  
  // Position popup
  document.body.appendChild(popupElement);
  
  const rect = popupElement.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  let left = x + 10;
  let top = y + 10;
  
  // Adjust if popup goes off screen
  if (left + rect.width > viewportWidth) {
    left = x - rect.width - 10;
  }
  if (top + rect.height > viewportHeight) {
    top = y - rect.height - 10;
  }
  
  popupElement.style.left = left + window.scrollX + 'px';
  popupElement.style.top = top + window.scrollY + 'px';
  
  // Fetch data
  const result = await getPageviews(selectedText);
  
  if (result.error) {
    popupElement.innerHTML = `
      <div class="wikikeyword-content">
        <div class="wikikeyword-error">${result.error}</div>
      </div>
    `;
  } else {
    const wikiUrl = `https://pageviews.wmcloud.org/?project=en.wikipedia.org&pages=${encodeURIComponent(result.formattedTerm)}`;
    
    popupElement.innerHTML = `
      <div class="wikikeyword-content">
        <div class="wikikeyword-title">Wikipedia Pageviews</div>
        <div class="wikikeyword-term">"${selectedText}"</div>
        <div class="wikikeyword-views">
          <span class="wikikeyword-number">${formatNumber(result.totalViews)}</span>
          <span class="wikikeyword-label">all-time views</span>
        </div>
        <a href="${wikiUrl}" target="_blank" class="wikikeyword-arrow" title="View detailed statistics">
          →
        </a>
      </div>
    `;
    
    // Prevent link click from closing popup immediately
    const arrow = popupElement.querySelector('.wikikeyword-arrow');
    arrow.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }
}

// Handle text selection
document.addEventListener('mouseup', async (e) => {
  // Small delay to ensure selection is complete
  setTimeout(async () => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    // Only show popup if text is selected and not too long
    if (selectedText && selectedText.length > 0 && selectedText.length < 100) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      await showPopup(selectedText, rect.right, rect.bottom);
    } else {
      removePopup();
    }
  }, 10);
});

// Close popup when clicking outside
document.addEventListener('mousedown', (e) => {
  if (popupElement && !popupElement.contains(e.target)) {
    removePopup();
  }
});

// Close popup on scroll
document.addEventListener('scroll', () => {
  removePopup();
}, true);