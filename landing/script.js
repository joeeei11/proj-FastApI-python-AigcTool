const reveals = document.querySelectorAll(".reveal");

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.16,
    rootMargin: "0px 0px -8% 0px",
  }
);

reveals.forEach((element, index) => {
  element.style.transitionDelay = `${Math.min(index * 55, 280)}ms`;
  observer.observe(element);
});

const ambientLeft = document.querySelector(".ambient-left");
const ambientRight = document.querySelector(".ambient-right");
const siteHeader = document.querySelector(".site-header");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const toggleHeaderState = () => {
  siteHeader.classList.toggle("is-scrolled", window.scrollY > 24);
};

toggleHeaderState();
window.addEventListener("scroll", toggleHeaderState, { passive: true });

if (!reduceMotion.matches) {
  window.addEventListener(
    "pointermove",
    (event) => {
      const { innerWidth, innerHeight } = window;
      const x = (event.clientX / innerWidth - 0.5) * 20;
      const y = (event.clientY / innerHeight - 0.5) * 20;

      ambientLeft.style.transform = `translate(calc(-18% + ${x * -0.7}px), calc(-10% + ${y * -0.5}px))`;
      ambientRight.style.transform = `translate(calc(28% + ${x * 0.9}px), calc(-4% + ${y * 0.7}px))`;
    },
    { passive: true }
  );
}
