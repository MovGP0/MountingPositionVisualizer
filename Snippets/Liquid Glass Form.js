document.addEventListener('DOMContentLoaded', function() {
  // Get all glass form elements
  const glassElements = document.querySelectorAll('.glass-form');
  const switchToRegister = document.querySelector('.switch-to-register');
  const switchToLogin = document.querySelector('.switch-to-login');
  const loginForm = document.querySelector('.form-container.login');
  const registerForm = document.querySelector('.form-container.register');
  
  // Add mousemove effect for each glass element
  glassElements.forEach(element => {
    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);
  });
  
  // Form switch event listeners
  if (switchToRegister && switchToLogin && loginForm && registerForm) {
    switchToRegister.addEventListener('click', (e) => {
      e.preventDefault();
      loginForm.style.opacity = '0';
      loginForm.style.transform = 'translateX(-20px)';
      
      setTimeout(() => {
        loginForm.classList.remove('active');
        registerForm.classList.add('active');
        
        setTimeout(() => {
          registerForm.style.opacity = '1';
          registerForm.style.transform = 'translateX(0)';
        }, 50);
      }, 300);
    });
    
    switchToLogin.addEventListener('click', (e) => {
      e.preventDefault();
      registerForm.style.opacity = '0';
      registerForm.style.transform = 'translateX(-20px)';
      
      setTimeout(() => {
        registerForm.classList.remove('active');
        loginForm.classList.add('active');
        
        setTimeout(() => {
          loginForm.style.opacity = '1';
          loginForm.style.transform = 'translateX(0)';
        }, 50);
      }, 300);
    });
  }
  
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
  
  // Form validation and submission handling
  const forms = document.querySelectorAll('.glass-form form');
  forms.forEach(form => {
    const inputs = form.querySelectorAll('input');
    
    // Add input validation styles
    inputs.forEach(input => {
      input.addEventListener('invalid', function() {
        this.classList.add('error');
      });
      
      input.addEventListener('input', function() {
        if (this.validity.valid) {
          this.classList.remove('error');
        }
      });
    });
    
    // Handle form submission
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      // Get form data
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());
      
      // Simple validation for password match in register form
      if (form.closest('.register')) {
        const password = data.password;
        const confirmPassword = data['confirm-password'];
        
        if (password !== confirmPassword) {
          alert('Passwords do not match!');
          return;
        }
      }
      
      // Here you would typically send the data to your server
      console.log('Form submitted:', data);
      
      // Show success state
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Success!';
      submitBtn.classList.add('success');
      
      setTimeout(() => {
        submitBtn.textContent = originalText;
        submitBtn.classList.remove('success');
        form.reset();
      }, 2000);
    });
  });

  // Initialize code blocks for the snippet preview
  initializeCodeBlocks();
});

// Function to initialize code blocks
function initializeCodeBlocks() {
  const htmlCode = document.getElementById('html-code');
  const cssCode = document.getElementById('css-code');
  const jsCode = document.getElementById('js-code');

  // Add copy functionality to code blocks
  document.querySelectorAll('.copy-button').forEach(button => {
    button.addEventListener('click', () => {
      const targetId = button.getAttribute('data-target');
      const codeBlock = document.getElementById(targetId);
      if (codeBlock) {
        navigator.clipboard.writeText(codeBlock.textContent).then(() => {
          button.innerHTML = ' Copied!';
          setTimeout(() => {
            button.innerHTML = ' Copy';
          }, 2000);
        });
      }
    });
  });
}