const state = {
  slides: [],
  current: 0,
  position: "bottom",
};

const STORAGE_VERSION = 5;

const els = {
  sourceText: document.querySelector("#sourceText"),
  generateBtn: document.querySelector("#generateBtn"),
  clearBtn: document.querySelector("#clearBtn"),
  maxChars: document.querySelector("#maxChars"),
  fontSize: document.querySelector("#fontSize"),
  lineHeight: document.querySelector("#lineHeight"),
  subtitleWidth: document.querySelector("#subtitleWidth"),
  shadowToggle: document.querySelector("#shadowToggle"),
  safeToggle: document.querySelector("#safeToggle"),
  stage: document.querySelector("#slideStage"),
  subtitle: document.querySelector("#subtitle"),
  pageInfo: document.querySelector("#pageInfo"),
  prevBtn: document.querySelector("#prevBtn"),
  nextBtn: document.querySelector("#nextBtn"),
  addSlideBtn: document.querySelector("#addSlideBtn"),
  deleteSlideBtn: document.querySelector("#deleteSlideBtn"),
  presentBtn: document.querySelector("#presentBtn"),
  slideList: document.querySelector("#slideList"),
  positionOptions: document.querySelectorAll(".position-option"),
};

const sampleText =
  "大家好，今天我想用一個很簡單的方式，練習把 AI 變成我的拍攝助理。\n\n我會先貼上講稿，讓它自動切成適合老師觀看的字幕頁。每一頁都可以再手動修改，拍攝時直接全螢幕播放就好。";

function splitToSlides(text, maxChars) {
  const normalized = text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!normalized) return [];

  const phraseChunks = normalized
    .split(/\n{2,}/)
    .flatMap((paragraph) => paragraph.split(/(?<=[，,、。！？!?；;：:])\s*/))
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const slides = [];
  let buffer = "";

  phraseChunks.forEach((chunk) => {
    if (chunk.length > maxChars) {
      if (buffer) {
        slides.push(buffer);
        buffer = "";
      }
      splitLongChunk(chunk, maxChars).forEach((part) => slides.push(part));
      return;
    }

    const next = buffer ? `${buffer}\n${chunk}` : chunk;
    if (next.replace(/\s/g, "").length > maxChars && buffer) {
      slides.push(buffer);
      buffer = chunk;
    } else {
      buffer = next;
    }
  });

  if (buffer) slides.push(buffer);
  return slides;
}

function splitLongChunk(chunk, maxChars) {
  const parts = [];
  let remaining = chunk.trim();

  while (remaining.length > maxChars) {
    let cut = Math.max(
      remaining.lastIndexOf("，", maxChars),
      remaining.lastIndexOf(",", maxChars),
      remaining.lastIndexOf("、", maxChars),
      remaining.lastIndexOf(" ", maxChars)
    );
    if (cut < Math.floor(maxChars * 0.55)) cut = maxChars;
    parts.push(remaining.slice(0, cut + 1).trim());
    remaining = remaining.slice(cut + 1).trim();
  }

  if (remaining) parts.push(remaining);
  return parts;
}

function render() {
  const currentText = state.slides[state.current] ?? "";
  els.subtitle.textContent = currentText;
  els.pageInfo.value = state.slides.length ? `${state.current + 1} / ${state.slides.length}` : "0 / 0";

  els.stage.className = `slide-stage position-${state.position}`;
  els.stage.classList.toggle("hide-safe", !els.safeToggle.checked);
  els.subtitle.classList.toggle("with-shadow", els.shadowToggle.checked);
  els.subtitle.style.fontSize = `${els.fontSize.value}px`;
  els.subtitle.style.lineHeight = Number(els.lineHeight.value) / 100;
  els.subtitle.style.width = `${els.subtitleWidth.value}%`;

  renderSlideList();
  saveState();
}

function renderSlideList() {
  els.slideList.replaceChildren();
  state.slides.forEach((slide, index) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.textContent = `${index + 1}. ${slide.replace(/\s+/g, " ").slice(0, 36) || "空白頁"}`;
    button.classList.toggle("active", index === state.current);
    button.addEventListener("click", () => {
      commitSubtitleEdit();
      state.current = index;
      render();
    });
    item.append(button);
    els.slideList.append(item);
  });
}

function commitSubtitleEdit() {
  if (!state.slides.length) return;
  state.slides[state.current] = els.subtitle.textContent.trim();
}

function generateSlides() {
  const maxChars = Number(els.maxChars.value) || 36;
  state.slides = splitToSlides(els.sourceText.value, maxChars);
  if (!state.slides.length) state.slides = ["點這裡修改字幕"];
  state.current = 0;
  render();
}

function moveSlide(direction) {
  commitSubtitleEdit();
  if (!state.slides.length) return;
  state.current = Math.min(Math.max(state.current + direction, 0), state.slides.length - 1);
  render();
}

function addSlide() {
  commitSubtitleEdit();
  const insertAt = Math.min(state.current + 1, state.slides.length);
  state.slides.splice(insertAt, 0, "新的字幕頁");
  state.current = insertAt;
  render();
  els.subtitle.focus();
}

function deleteSlide() {
  if (!state.slides.length) return;
  state.slides.splice(state.current, 1);
  state.current = Math.max(0, Math.min(state.current, state.slides.length - 1));
  render();
}

function saveState() {
  const payload = {
    version: STORAGE_VERSION,
    slides: state.slides,
    current: state.current,
    position: state.position,
    sourceText: els.sourceText.value,
    settings: {
      maxChars: els.maxChars.value,
      fontSize: els.fontSize.value,
      lineHeight: els.lineHeight.value,
      subtitleWidth: els.subtitleWidth.value,
      shadow: els.shadowToggle.checked,
      safe: els.safeToggle.checked,
    },
  };
  localStorage.setItem("subtitleDeckState", JSON.stringify(payload));
}

function loadState() {
  const saved = JSON.parse(localStorage.getItem("subtitleDeckState") || "null");
  if (!saved || saved.version !== STORAGE_VERSION) {
    els.sourceText.value = sampleText;
    state.slides = splitToSlides(sampleText, Number(els.maxChars.value));
    return;
  }

  state.slides = Array.isArray(saved.slides) ? saved.slides : [];
  state.current = saved.current || 0;
  state.position = saved.position || "bottom";
  els.sourceText.value = saved.sourceText || "";

  if (saved.settings) {
    els.maxChars.value = saved.settings.maxChars ?? els.maxChars.value;
    els.fontSize.value = saved.settings.fontSize ?? els.fontSize.value;
    els.lineHeight.value = saved.settings.lineHeight ?? els.lineHeight.value;
    els.subtitleWidth.value = saved.settings.subtitleWidth ?? els.subtitleWidth.value;
    els.shadowToggle.checked = saved.settings.shadow ?? true;
    els.safeToggle.checked = saved.settings.safe ?? true;
  }
}

function setPosition(position) {
  state.position = position;
  els.positionOptions.forEach((button) => {
    button.classList.toggle("active", button.dataset.position === position);
  });
  render();
}

els.generateBtn.addEventListener("click", generateSlides);
els.clearBtn.addEventListener("click", () => {
  els.sourceText.value = "";
  state.slides = [];
  state.current = 0;
  render();
});

els.prevBtn.addEventListener("click", () => moveSlide(-1));
els.nextBtn.addEventListener("click", () => moveSlide(1));
els.addSlideBtn.addEventListener("click", addSlide);
els.deleteSlideBtn.addEventListener("click", deleteSlide);
els.subtitle.addEventListener("input", () => {
  commitSubtitleEdit();
  renderSlideList();
  saveState();
});

[els.fontSize, els.lineHeight, els.subtitleWidth, els.maxChars, els.shadowToggle, els.safeToggle].forEach((control) => {
  control.addEventListener("input", render);
  control.addEventListener("change", render);
});

els.positionOptions.forEach((button) => {
  button.addEventListener("click", () => setPosition(button.dataset.position));
});

els.presentBtn.addEventListener("click", async () => {
  commitSubtitleEdit();
  document.body.classList.add("presenting");
  await document.documentElement.requestFullscreen?.();
  render();
});

document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement) document.body.classList.remove("presenting");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") moveSlide(-1);
  if (event.key === "ArrowRight") moveSlide(1);
});

loadState();
setPosition(state.position);
render();
