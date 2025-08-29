document.addEventListener('DOMContentLoaded', function() {
  // Get all glass elements
  const glassElements = document.querySelectorAll('.glass-sidebar');
  
  // Add mousemove effect for each glass element
  glassElements.forEach(element => {
    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);
  });
  
  // Handle mouse movement over glass elements
  function handleMouseMove(e) {
    const rect = this.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Update filter turbulence based on mouse position
    const filter = this.querySelector('filter feDisplacementMap');
    if (filter) {
      const scaleX = (x / rect.width) * 100;
      const scaleY = (y / rect.height) * 100;
      filter.setAttribute('scale', Math.min(scaleX, scaleY));
    }
    
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
    const filter = this.querySelector('filter feDisplacementMap');
    if (filter) {
      filter.setAttribute('scale', '77');
    }
    
    const specular = this.querySelector('.glass-specular');
    if (specular) {
      specular.style.background = 'none';
    }
  }

  // Add nav item click handler
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      navItems.forEach(navItem => navItem.classList.remove('active'));
      this.classList.add('active');
    });
  });
});