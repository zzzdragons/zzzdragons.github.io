const toggleButton = document.querySelector('.nav-toggle');
const nav = document.querySelector('#site-nav');

if (toggleButton && nav) {
  toggleButton.addEventListener('click', () => {
    const isOpen = nav.dataset.open === 'true';
    nav.dataset.open = String(!isOpen);
    toggleButton.setAttribute('aria-expanded', String(!isOpen));
  });
}
