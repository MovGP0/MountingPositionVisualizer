document.addEventListener('DOMContentLoaded', function() {
  // Get all glass search elements
  const glassElements = document.querySelectorAll('.glass-search');
  const searchInput = document.querySelector('.search-input');
  const searchClear = document.querySelector('.search-clear');
  const searchSuggestions = document.querySelector('.search-suggestions');
  
  // Add mousemove effect for each glass element
  glassElements.forEach(element => {
    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);
  });
  
  // Search input interactions
  if (searchInput && searchSuggestions) {
    searchInput.addEventListener('focus', () => {
      searchSuggestions.classList.add('active');
    });
    
    searchInput.addEventListener('blur', (e) => {
      // Only hide suggestions if we're not clicking inside them
      if (!e.relatedTarget || !e.relatedTarget.closest('.search-suggestions')) {
        setTimeout(() => {
          searchSuggestions.classList.remove('active');
        }, 200);
      }
    });
    
    searchInput.addEventListener('input', (e) => {
      const hasValue = e.target.value.length > 0;
      if (hasValue) {
        searchSuggestions.classList.add('active');
      }
    });
  }
  
  // Clear button functionality
  if (searchClear && searchInput) {
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      searchInput.focus();
      searchSuggestions.classList.remove('active');
    });
  }
  
  // Handle suggestion clicks
  const suggestions = document.querySelectorAll('.suggestion-group li');
  suggestions.forEach(suggestion => {
    suggestion.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = suggestion.textContent;
        searchSuggestions.classList.remove('active');
        searchInput.focus();
      }
    });
  });
  
  // Handle mouse movement over glass elements
  function handleMouseMove(e) {
    const rect = this.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Add highlight effect
    const specular = this.querySelector('.glass-specular');
    if (specular) {
      specular.style.background = `radial-gradient(
        circle at ${x}px ${y}px,
        rgba(255,255,255,0.15) 0%,
        rgba(255,255,255,0.05) 30%,
        rgba(255,255,255,0) 60%
      )`;
    }
  }
  
  // Reset effects when mouse leaves
  function handleMouseLeave() {
    const filter = document.querySelector('#glass-distortion feDisplacementMap');
    if (filter) {
      filter.setAttribute('scale', '77');
    }
    
    const specular = this.querySelector('.glass-specular');
    if (specular) {
      specular.style.background = 'none';
    }
  }
});