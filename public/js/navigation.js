document.addEventListener('DOMContentLoaded', () => {
  const mainContainer = document.querySelector('main.container');

  function updateActiveNav() {
    const navLinks = document.querySelectorAll('.nav-link');
    const currentPath = window.location.pathname;
    navLinks.forEach(link => {
      if (link.getAttribute('href') === currentPath) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  function loadPage(url) {
    fetch(url, {
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
    .then(response => {
      if (response.ok) {
        return response.text();
      }
      throw new Error('Network response was not ok.');
    })
    .then(html => {
      // Parse the returned HTML and extract the main content
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const newMain = doc.querySelector('main.container');
      if (newMain && mainContainer) {
        mainContainer.innerHTML = newMain.innerHTML;
        document.title = doc.title;
        window.history.pushState(null, '', url);
        updateActiveNav();
      }
    })
    .catch(error => {
      console.error('Failed to load page:', error);
      window.location.href = url; // fallback to full reload
    });
  }

  document.body.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link && link.href && link.origin === window.location.origin) {
      e.preventDefault();
      loadPage(link.href);
    }
  });

  window.addEventListener('popstate', () => {
    loadPage(window.location.href);
  });

  updateActiveNav();
});
