document.addEventListener("DOMContentLoaded", () => {
  const breakPoint = 768;

  function setGroupDelay() {
    const windowWidth = window.innerWidth;
    document.querySelectorAll(".set_delay_time_group").forEach((group) => {
      const columnPC = group.getAttribute("data-column-pc");
      const columnSP = group.getAttribute("data-column-sp");
      const delayTimeStep = parseFloat(group.getAttribute("data-steptime")) || 0.1;

      let setColumn = null;
      if (columnPC && windowWidth >= breakPoint) {
        setColumn = parseInt(columnPC) - 1;
      } else if (columnSP && windowWidth < breakPoint) {
        setColumn = parseInt(columnSP) - 1;
      }

      let i = 0;
      group.querySelectorAll(".set_delay_anim").forEach((el) => {
        el.style.transitionDelay = "";
        if (setColumn !== null) {
          if (i !== 0) {
            el.style.transitionDelay = i * delayTimeStep + "s";
          }
          i = i >= setColumn ? 0 : i + 1;
        }
      });
    });
  }

  function showOnLoad() {
    let i = 0;
    document.querySelectorAll(".set_delay_anim").forEach((el) => {
      const targetPos = el.getBoundingClientRect().top + window.scrollY;
      const scrollPos = window.scrollY;
      const windowHeight = window.innerHeight;
      const showArea = scrollPos + windowHeight;

      // 個別ディレイ
      const delayAttr = el.getAttribute("data-delaytime");
      if (delayAttr) {
        el.style.transitionDelay = delayAttr + "s";
      }

      // 表示範囲内にあるか
      if (targetPos <= showArea) {
        const parent = el.closest(".set_delay_time_group");
        if (parent) {
          const delayTimeStep = parseFloat(parent.getAttribute("data-steptime")) || 0.1;
          if (i !== 0) {
            el.style.transitionDelay = i * delayTimeStep + "s";
          }
          i++;
        }

        setTimeout(() => el.classList.add("show"), 150);
      }
    });
  }

  function showOnScroll() {
    document.querySelectorAll(".set_delay_anim").forEach((el) => {
      const targetPos = el.getBoundingClientRect().top + window.scrollY;
      const scrollPos = window.scrollY;
      const windowHeight = window.innerHeight;
      const showArea = targetPos - windowHeight + windowHeight / 4;

      if (scrollPos > showArea) {
        setTimeout(() => el.classList.add("show"), 150);
      }
    });
  }

  // イベント設定
  window.addEventListener("load", () => {
    setGroupDelay();
    showOnLoad();
  });

  window.addEventListener("resize", () => {
    setGroupDelay();
  });

  window.addEventListener("scroll", () => {
    showOnScroll();
  });
});
