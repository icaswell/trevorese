// Tab Navigation with Single View and Browser History Support

class TabNavigator {
    constructor() {
        this.isSingleView = false;
        this.currentTab = null;
        this.originalTabsContainer = null;
        this.originalTabContents = null;
        
        this.init();
    }
    
    init() {
        // Store original state
        this.originalTabsContainer = document.querySelector('.tabs');
        this.originalTabContents = document.querySelectorAll('.tab-content');
        
        // Check if we're in single view mode on page load
        this.checkInitialState();
        
        // Add event listeners for tab clicks
        this.addTabClickListeners();
        
        // Listen for browser back/forward buttons
        window.addEventListener('popstate', (event) => {
            this.handlePopState(event);
        });
    }
    
    checkInitialState() {
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get('tab');
        
        if (tabParam) {
            this.enterSingleView(tabParam);
        }
    }
    
    addTabClickListeners() {
        // Use event delegation to handle tab clicks
        document.addEventListener('click', (event) => {
            const tab = event.target.closest('.tab');
            if (!tab) return;
            
            event.preventDefault();
            event.stopPropagation();
            
            const tabId = tab.dataset.tab;
            
            // Check if Ctrl/Cmd key is pressed for new window behavior
            if (event.ctrlKey || event.metaKey) {
                // Open in new tab/window
                const url = new URL(window.location);
                url.searchParams.set('tab', tabId);
                window.open(url.toString(), '_blank');
                return;
            }
            
            // Check if we're already in single view mode
            if (this.isSingleView) {
                // If clicking the same tab, do nothing
                if (this.currentTab === tabId) {
                    return;
                }
                // If clicking a different tab, switch to it
                this.enterSingleView(tabId);
            } else {
                // In multi-tab view, enter single view mode
                this.enterSingleView(tabId);
            }
        });
    }
    
    enterSingleView(tabId) {
        this.isSingleView = true;
        this.currentTab = tabId;
        
        // Update URL without reloading the page
        const url = new URL(window.location);
        url.searchParams.set('tab', tabId);
        window.history.pushState({ tab: tabId }, '', url.toString());
        
        // Hide all tabs except the selected one
        this.hideOtherTabs(tabId);
        
        // Show only the selected tab content
        this.showSingleTabContent(tabId);
        
        // Handle special tab functionality
        this.handleSpecialTabFunctionality(tabId);
        
        // Add back button
        this.addBackButton();
    }
    
    hideOtherTabs(selectedTabId) {
        // Hide the tabs container
        if (this.originalTabsContainer) {
            this.originalTabsContainer.style.display = 'none';
        }
        
        // Hide all tab contents except the selected one
        this.originalTabContents.forEach(content => {
            if (content.id !== selectedTabId) {
                content.style.display = 'none';
            }
        });
    }
    
    showSingleTabContent(tabId) {
        // Show the selected tab content
        const selectedContent = document.getElementById(tabId);
        if (selectedContent) {
            selectedContent.style.display = 'flex';
            selectedContent.classList.add('active');
            
            // Add single-view class for styling
            selectedContent.classList.add('single-view');
        }
    }
    
    addBackButton() {
        // Remove existing back button if any
        const existingBackButton = document.querySelector('.back-to-tabs');
        if (existingBackButton) {
            existingBackButton.remove();
        }
        
        // Create back button
        const backButton = document.createElement('button');
        backButton.className = 'back-to-tabs';
        backButton.innerHTML = '← Back to all tabs';
        backButton.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            z-index: 1000;
            padding: 10px 15px;
            background-color: #009c36;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-family: var(--main-font);
            font-size: 14px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;
        
        backButton.addEventListener('click', () => {
            this.exitSingleView();
        });
        
        document.body.appendChild(backButton);
    }
    
    exitSingleView() {
        this.isSingleView = false;
        this.currentTab = null;
        
        // Update URL to remove tab parameter
        const url = new URL(window.location);
        url.searchParams.delete('tab');
        window.history.pushState({}, '', url.toString());
        
        // Show all tabs again
        if (this.originalTabsContainer) {
            this.originalTabsContainer.style.display = 'flex';
        }
        
        // Reset all tab contents
        this.originalTabContents.forEach(content => {
            content.style.display = 'none';
            content.classList.remove('single-view');
        });
        
        // Show the default active tab (about) and activate it
        const aboutContent = document.getElementById('about');
        const aboutTab = document.querySelector('.tab[data-tab="about"]');
        if (aboutContent) {
            aboutContent.style.display = 'flex';
            aboutContent.classList.add('active');
        }
        if (aboutTab) {
            aboutTab.classList.add('active');
        }
        
        // Remove back button
        const backButton = document.querySelector('.back-to-tabs');
        if (backButton) {
            backButton.remove();
        }
    }
    
    handlePopState(event) {
        if (event.state && event.state.tab) {
            // User navigated to a specific tab
            this.enterSingleView(event.state.tab);
        } else {
            // User navigated back to the main view
            this.exitSingleView();
        }
    }
    
    handleSpecialTabFunctionality(tabId) {
        // Load periodic table content if this tab is clicked and not already loaded
        if (tabId === 'periodic-table') {
            if (typeof periodicTableLoaded !== 'undefined' && !periodicTableLoaded) {
                if (typeof loadPeriodicTable === 'function') {
                    loadPeriodicTable();
                }
            }
            // Add click listeners to gloss spans in the periodic table
            setTimeout(() => {
                if (typeof addClickListenersToDoc === 'function') {
                    addClickListenersToDoc(document);
                }
            }, 500);
        }
        
        // Handle other special tabs that need initialization
        if (tabId === 'stories' && typeof loadStories === 'function') {
            loadStories();
        }
        
        if (tabId === 'todo' && typeof loadTodoData === 'function') {
            loadTodoData();
        }
        
        if (tabId === 'tests' && typeof runTests === 'function') {
            runTests();
        }
    }
}

// Initialize the tab navigator when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.tabNavigator = new TabNavigator();
}); 