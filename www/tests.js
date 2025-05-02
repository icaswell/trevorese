'use strict';

/**
 * Runs tests on global variables and displays the results
 */
function runGlobalTests() {
    console.log('Running global tests...');
    const testContainer = document.getElementById('globals-tests');
    const loadingElement = document.getElementById('loading-tests');
    const testsContent = document.getElementById('tests-content');
    
    if (!testContainer) {
        console.error('Test container not found');
        return;
    }
    
    // Check if dictionary data is loaded
    if (!window.trevorese_dictionary) {
        console.log('Dictionary not loaded yet, waiting...');
        setTimeout(runGlobalTests, 500); // Try again in 500ms
        return;
    }
    
    // Define the tests to run
    const tests = [
        { query: "window.trevorese_dictionary.vocabs['big-plant-place']", accessor: () => window.trevorese_dictionary.vocabs['big-plant-place'] },
        { query: "window.surface_to_gloss['dapwalu']", accessor: () => window.surface_to_gloss['dapwalu'] },
        { query: "window.compounds['big-plant-place']", accessor: () => window.compounds['big-plant-place'] },
        { query: "window.english_to_gloss['forest']", accessor: () => window.english_to_gloss['forest'] },
        { query: "window.gloss_to_surface['big-plant-place']", accessor: () => window.gloss_to_surface['big-plant-place'] },
        { query: "window.gloss_to_surface_hypertrevorese['big-plant-place']", accessor: () => window.gloss_to_surface_hypertrevorese['big-plant-place'] },
        { query: "window.gloss_to_supergloss['big-plant-place']", accessor: () => window.gloss_to_supergloss['big-plant-place'] },
        { query: "window.gloss_to_supercompound['big-plant-place']", accessor: () => window.gloss_to_supercompound['big-plant-place'] }
    ];
    
    // Clear previous results
    testContainer.innerHTML = '';
    
    // Run each test and display results
    tests.forEach(test => {
        const testElement = document.createElement('div');
        testElement.className = 'test-item';
        
        // Create query display
        const queryElement = document.createElement('div');
        queryElement.className = 'test-query';
        queryElement.textContent = test.query;
        testElement.appendChild(queryElement);
        
        // Create result display
        const resultElement = document.createElement('div');
        resultElement.className = 'test-result';
        
        try {
            const result = test.accessor();
            if (result === undefined) {
                resultElement.textContent = 'undefined';
                resultElement.classList.add('test-undefined');
            } else if (result === null) {
                resultElement.textContent = 'null';
                resultElement.classList.add('test-null');
            } else {
                // Format object results as JSON
                if (typeof result === 'object') {
                    const formattedResult = JSON.stringify(result, null, 2);
                    const pre = document.createElement('pre');
                    pre.textContent = formattedResult;
                    resultElement.appendChild(pre);
                } else {
                    resultElement.textContent = String(result);
                }
                resultElement.classList.add('test-success');
            }
        } catch (error) {
            resultElement.textContent = `Error: ${error.message}`;
            resultElement.classList.add('test-error');
        }
        
        testElement.appendChild(resultElement);
        testContainer.appendChild(testElement);
    });
    
    // Hide loading message and show test results
    if (loadingElement) loadingElement.style.display = 'none';
    if (testsContent) testsContent.style.display = 'block';
    
    console.log('Global tests completed');
}

// Initialize tests when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the tests tab
    const testsTab = document.querySelector('.tab[data-tab="tests"]');
    if (testsTab) {
        // Run tests when the tests tab is clicked
        testsTab.addEventListener('click', function() {
            runGlobalTests();
        });
        
        // Also run tests if the tests tab is active by default
        if (testsTab.classList.contains('active')) {
            runGlobalTests();
        }
    }
});
