const menuButton = document.querySelector(".menu-button");
const nav = document.querySelector(".site-nav");
const fixedCta = document.querySelector(".fixed-cta");

if (menuButton && nav) {
  menuButton.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      menuButton.setAttribute("aria-expanded", "false");
    });
  });
}

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const targetId = link.getAttribute("href");
    if (!targetId || targetId === "#") return;

    const target = document.querySelector(targetId);
    if (!target) return;

    event.preventDefault();
    const headerHeight = document.querySelector(".site-header")?.offsetHeight || 0;
    const top = target.getBoundingClientRect().top + window.scrollY - headerHeight - 8;

    window.scrollTo({
      top,
      behavior: "smooth",
    });
  });
});

if (fixedCta) {
  const updateFixedCta = () => {
    const pastHero = window.scrollY > 520;
    const nearBottom = window.innerHeight + window.scrollY > document.body.offsetHeight - 180;
    const shouldShow = pastHero && !nearBottom;
    fixedCta.style.opacity = shouldShow ? "1" : "0";
    fixedCta.style.pointerEvents = shouldShow ? "auto" : "none";
  };

  updateFixedCta();
  window.addEventListener("scroll", updateFixedCta, { passive: true });
}
