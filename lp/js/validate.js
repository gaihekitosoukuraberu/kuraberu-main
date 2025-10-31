// 入力必須（blur時にエラー表示）
document.querySelectorAll(".km_valid_required").forEach(function (el) {
  el.addEventListener("blur", function () {
    if (el.value === "") {
      if (!el.parentNode.querySelector(".km_valid_error.error_required")) {
        const error = document.createElement("div");
        error.className = "km_valid_error error_required";
        error.textContent = "入力必須項目です";
        el.insertAdjacentElement("afterend", error);
        el.classList.add("bg_error");
      }
    } else {
      el.parentNode.querySelectorAll(".km_valid_error:not(.error_kana_h)").forEach(function (e) {
        e.remove();
      });
      el.classList.remove("bg_error");
    }
  });
});

// チェックボックス・ラジオ選択必須
document.querySelectorAll(".km_valid_required_check input").forEach(function (input) {
  input.addEventListener("change", function () {
    const parent = input.closest(".km_valid_required_check");
    const checked = parent.querySelectorAll("input:checked").length;

    const existingError = parent.nextElementSibling;
    if (checked === 0) {
      if (!existingError || !existingError.classList.contains("error_required_check")) {
        const error = document.createElement("div");
        error.className = "km_valid_error error_required_check";
        error.textContent = "選択必須項目です";
        parent.insertAdjacentElement("afterend", error);
      }
    } else {
      if (existingError && existingError.classList.contains("error_required_check")) {
        existingError.remove();
      }
    }
  });
});

// フォーム送信時のバリデーション
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".km_form").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      // 以前のエラーをすべてクリア
      form.querySelectorAll(".km_valid_error").forEach(function (el) {
        el.remove();
      });

      let hasError = false;

      // テキスト必須
      form.querySelectorAll(".km_valid_required").forEach(function (el) {
        if (el.value === "") {
          if (!el.parentNode.querySelector(".km_valid_error.error_required")) {
            const error = document.createElement("div");
            error.className = "km_valid_error error_required";
            error.textContent = "入力必須項目です";
            el.insertAdjacentElement("afterend", error);
            el.classList.add("bg_error");
          }
          hasError = true;
        }
      });

      // チェック必須
      form.querySelectorAll(".km_valid_required_check").forEach(function (group) {
        if (group.querySelectorAll("input:checked").length === 0) {
          if (!group.nextElementSibling || !group.nextElementSibling.classList.contains("error_required_check")) {
            const error = document.createElement("div");
            error.className = "km_valid_error error_required_check";
            error.textContent = "選択必須項目です";
            group.insertAdjacentElement("afterend", error);
          }
          hasError = true;
        }
      });

      if (hasError) {
        const firstError = form.querySelector(".km_valid_error");
        if (firstError) {
          window.scrollTo({
            top: firstError.parentNode.offsetTop,
            behavior: "smooth",
          });
        }
        e.preventDefault();
      }
    });
  });
});

// プレースホルダー処理
document.addEventListener("DOMContentLoaded", function () {
  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  const placeholderAttr = isMobile ? "data-placeholder_sp" : "data-placeholder_pc";

  document.querySelectorAll(".js-custom-placeholder").forEach(function (container) {
    const inputs = container.querySelectorAll(`[${placeholderAttr}]`);

    inputs.forEach(function (input) {
      const text = input.getAttribute(placeholderAttr).replace(/¥n/g, "<br>");
      const placeholderDiv = document.createElement("div");
      placeholderDiv.className = "placeholder";
      placeholderDiv.innerHTML = text;
      input.insertAdjacentElement("afterend", placeholderDiv);

      // 初期表示判定
      togglePlaceholder(input);

      input.addEventListener("focus", function () {
        input.nextElementSibling.style.display = "none";
      });

      input.addEventListener("blur", function () {
        togglePlaceholder(input);
      });
    });
  });

  function togglePlaceholder(input) {
    const placeholder = input.nextElementSibling;
    if (input.value === "") {
      placeholder.style.display = "";
    } else {
      placeholder.style.display = "none";
    }
  }
});
