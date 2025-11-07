// ハンバーガーメニュー
document.addEventListener("DOMContentLoaded", function () {
  let state = true;
  const hamburger = document.querySelector(".header__nav__hamburger");
  const globalMenu = document.querySelector(".header__nav__global");
  const menuLinks = globalMenu.querySelectorAll(".header__nav__global__lists li a");
  const fixedarea = document.querySelector(".fixed-area");

  // フェードイン
  function fadeIn(element, duration = 400) {
    element.style.opacity = 0;
    element.style.display = "block";
    let last = +new Date();
    let tick = function () {
      element.style.opacity = +element.style.opacity + (new Date() - last) / duration;
      last = +new Date();

      if (+element.style.opacity < 1) {
        requestAnimationFrame(tick);
      }
    };
    tick();
  }

  // フェードアウト
  function fadeOut(element, duration = 400) {
    element.style.opacity = 1;
    let last = +new Date();
    let tick = function () {
      element.style.opacity = +element.style.opacity - (new Date() - last) / duration;
      last = +new Date();

      if (+element.style.opacity > 0) {
        requestAnimationFrame(tick);
      } else {
        element.style.display = "none";
      }
    };
    tick();
  }

  hamburger.addEventListener("click", function () {
    if (state === true && hamburger.classList.contains("active")) {
      hamburger.classList.remove("active");
      globalMenu.classList.remove("active");
      fixedarea.classList.add("show");
    } else {
      hamburger.classList.add("active");
      globalMenu.classList.add("active");
      fixedarea.classList.remove("show");
      state = true;
      menuLinks.forEach((link) => {
        link.addEventListener(
          "click",
          function () {
            hamburger.classList.remove("active");
            globalMenu.classList.remove("active");
          },
          { once: true }
        );
      });
    }
  });
});

// スムーススクロール/アンカー着地点 変更
window.addEventListener("load", function () {
  const header = document.querySelector(".cmn-header");
  const links = document.querySelectorAll('a[href^="#"]');

  links.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();

      const href = this.getAttribute("href");
      const targetId = href === "#" || href === "" ? "html" : href;
      const target = document.querySelector(targetId);

      if (!target) return;

      const gap = header ? header.offsetHeight : 0;
      const targetPos = target.getBoundingClientRect().top + window.pageYOffset - gap;

      window.scrollTo({
        top: targetPos,
        behavior: "smooth",
      });
    });
  });
});

// 追従ボタン
document.addEventListener("DOMContentLoaded", function () {
  window.addEventListener("scroll", function () {
    const fixedArea = document.querySelector(".fixed-area");
    if (window.scrollY > 600) {
      fixedArea.classList.add("show");
    } else {
      fixedArea.classList.remove("show");
    }
  });
});

// アコーディオン
document.addEventListener("DOMContentLoaded", function () {
  const parents = document.querySelectorAll(".qa__lists .qa__lists__item__parent");

  parents.forEach(function (parent) {
    parent.addEventListener("click", function () {
      const ddElem = parent.nextElementSibling;
      const innerElem = ddElem.querySelector(".qa__lists__item__child .qa__lists__item__child__inner");

      if (ddElem.style.maxHeight) {
        ddElem.style.maxHeight = null;
      } else {
        ddElem.style.maxHeight = innerElem.scrollHeight + "px";
      }
      parent.classList.toggle("active");
    });
  });
});

// スライダー
const swiper = new Swiper(".swiper", {
  loop: true,
  effect: "fade",
  speed: 1500,
  autoplay: {
    delay: 3500,
  },
});

// モーダル
const mvImg = document.querySelector(".mv__before__img");
const modal = document.getElementById("modal");
const closeBtn = document.querySelector(".modal__close");

// モーダルを開く
mvImg.addEventListener("click", () => {
  modal.classList.add("show");
  document.body.classList.add("fixed"); // ← スクロール禁止！
});

// モーダルを閉じる
const closeModal = () => {
  modal.classList.remove("show");
  document.body.classList.remove("fixed"); // ← スクロール再開！
};

closeBtn.addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    closeModal();
  }
});
const modalButton = document.querySelector(".modal button"); // 対象ボタンを指定
modalButton.addEventListener("click", () => {
  document.body.classList.remove("fixed"); // ← fixed解除
});
