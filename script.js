// ==============================
// AI業務改善アドバイザー site script
// ==============================

// ページ読み込み後に実行
document.addEventListener("DOMContentLoaded", () => {
  initSmoothScroll();
  initHeaderScroll();
  initScrollAnimation();
  initActiveNav();
  initFixedCta();
});

// スムーズスクロール
function initSmoothScroll() {
  const links = document.querySelectorAll('a[href^="#"]');

  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      const targetId = link.getAttribute("href");

      if (!targetId || targetId === "#") return;

      const target = document.querySelector(targetId);

      if (!target) return;

      event.preventDefault();

      const header = document.querySelector("header");
      const headerHeight = header ? header.offsetHeight : 0;
      const targetPosition =
        target.getBoundingClientRect().top + window.pageYOffset - headerHeight;

      window.scrollTo({
        top: targetPosition,
        behavior: "smooth",
      });
    });
  });
}

// スクロール時にヘッダーの見た目を少し変更
function initHeaderScroll() {
  const header = document.querySelector("header");

  if (!header) return;

  const updateHeader = () => {
    if (window.scrollY > 40) {
      header.style.background = "rgba(8, 11, 20, 0.94)";
      header.style.boxShadow = "0 10px 30px rgba(0, 0, 0, 0.22)";
    } else {
      header.style.background = "rgba(8, 11, 20, 0.78)";
      header.style.boxShadow = "none";
    }
  };

  updateHeader();
  window.addEventListener("scroll", updateHeader);
}

// スクロール時にカードや見出しをふわっと表示
function initScrollAnimation() {
  const targets = document.querySelectorAll(
    ".section-title, .section-desc, .about-item, .service-card, .problem-item, .case-card, .area-box, .contact-box"
  );

  if (!targets.length) return;

  targets.forEach((target) => {
    target.style.opacity = "0";
    target.style.transform = "translateY(24px)";
    target.style.transition = "opacity 0.7s ease, transform 0.7s ease";
  });

  const observer = new IntersectionObserver(
    (entries, observerInstance) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = "1";
          entry.target.style.transform = "translateY(0)";
          observerInstance.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.12,
    }
  );

  targets.forEach((target) => observer.observe(target));
}

// 現在見ているセクションに合わせてナビの色を変更
function initActiveNav() {
  const navLinks = document.querySelectorAll(".nav a");
  const sections = document.querySelectorAll("section[id]");

  if (!navLinks.length || !sections.length) return;

  const updateActiveNav = () => {
    let currentId = "";

    sections.forEach((section) => {
      const sectionTop = section.offsetTop - 120;
      const sectionHeight = section.offsetHeight;

      if (
        window.scrollY >= sectionTop &&
        window.scrollY < sectionTop + sectionHeight
      ) {
        currentId = section.getAttribute("id");
      }
    });

    navLinks.forEach((link) => {
      const href = link.getAttribute("href");

      if (href === `#${currentId}`) {
        link.style.color = "#6ee7ff";
        link.style.fontWeight = "700";
      } else {
        link.style.color = "#d6def8";
        link.style.fontWeight = "400";
      }
    });
  };

  updateActiveNav();
  window.addEventListener("scroll", updateActiveNav);
}

// 一番下付近では固定CTAを少し控えめにする
function initFixedCta() {
  const fixedCta = document.querySelector(".fixed-cta");

  if (!fixedCta) return;

  const updateFixedCta = () => {
    const scrollBottom =
      window.innerHeight + window.scrollY >= document.body.offsetHeight - 120;

    if (scrollBottom) {
      fixedCta.style.opacity = "0.35";
      fixedCta.style.pointerEvents = "none";
    } else {
      fixedCta.style.opacity = "1";
      fixedCta.style.pointerEvents = "auto";
    }
  };

  updateFixedCta();
  window.addEventListener("scroll", updateFixedCta);
}
