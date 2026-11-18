(() => {
  'use strict';

  const { pages, sections } = window.lectureOne;
  const $ = id => document.getElementById(id);
  const app = $('app');
  const stage = $('stage');
  const stageImage = $('slide-image');
  const stageStatus = $('stage-status');
  const stepList = $('step-list');
  const menu = $('menu-dialog');
  const textDialog = $('text-dialog');
  const zoomDialog = $('zoom-dialog');
  const stepPositions = pages.map(() => 0);
  const menuButtons = [];
  const dialogs = [menu, textDialog, zoomDialog];
  let page = pageFromHash();
  let drawnStepPage = -1;
  let stepButtons = [];
  let frameVersion = 0;
  let playVersion = 0;
  let timer;
  let playing = false;
  let zoom = 1;

  function pageFromHash() {
    const requested = /^#page-(\d+)$/.exec(location.hash);
    const i = requested ? Number(requested[1]) - 1 : 0;
    return i >= 0 && i < pages.length ? i : 0;
  }

  const slide = () => pages[page];
  const position = () => stepPositions[page];
  const lastStep = () => slide().frames.length - 1;
  const frame = () => slide().frames[position()];
  const asset = entry => `assets/lecture-1/${entry.image}`;
  const ordinal = n => String(n).padStart(2, '0');

  function makeButton(number, label) {
    const button = document.createElement('button');
    button.type = 'button';
    const count = document.createElement('span');
    count.className = 'ordinal';
    count.textContent = number;
    const title = document.createElement('span');
    title.textContent = label;
    button.append(count, title);
    return button;
  }

  for (const [index, [first, heading]] of sections.entries()) {
    const section = document.createElement('section');
    const title = document.createElement('h3');
    title.textContent = heading;
    const items = document.createElement('div');
    items.className = 'menu-pages';
    const end = sections[index + 1]?.[0] ?? pages.length + 1;
    for (let n = first; n < end; n++) {
      const entry = pages[n - 1];
      const button = makeButton(ordinal(n), entry.title);
      button.dataset.page = n;
      if (entry.frames.length > 1) {
        const tag = document.createElement('small');
        tag.textContent = '作图';
        button.append(tag);
      }
      button.addEventListener('click', () => {
        menu.close();
        go(n - 1);
      });
      menuButtons.push(button);
      items.append(button);
    }
    section.append(title, items);
    $('menu-list').append(section);
  }

  function buildStepList() {
    if (drawnStepPage === page) return;
    drawnStepPage = page;
    stepButtons = [];
    stepList.replaceChildren();
    stepList.scrollTop = 0;
    if (!lastStep()) return;
    for (const [index, entry] of slide().frames.entries()) {
      const item = document.createElement('li');
      const button = makeButton(index ? ordinal(index) : '起点', entry.caption);
      button.dataset.step = index;
      button.addEventListener('click', () => setStep(index));
      stepButtons.push(button);
      item.append(button);
      stepList.append(item);
    }
  }

  function updateStepList() {
    for (const [index, button] of stepButtons.entries()) {
      if (index === position()) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    }
    const active = stepButtons[position()];
    if (!active) return;
    const target = active.getBoundingClientRect();
    const container = stepList.getBoundingClientRect();
    if (target.top < container.top) stepList.scrollTop -= container.top - target.top + 3;
    if (target.bottom > container.bottom) stepList.scrollTop += target.bottom - container.bottom + 3;
  }

  function setPlayLabel() {
    const button = $('play');
    button.textContent = playing ? '暂停' : '自动演示';
    button.setAttribute('aria-pressed', String(playing));
    button.disabled = !playing && position() === lastStep();
  }

  function prefetch() {
    const candidates = lastStep()
      ? [slide().frames[position() + 1], slide().frames[position() - 1]]
      : [pages[page + 1]?.frames[0], pages[page - 1]?.frames[0]];
    for (const candidate of candidates) {
      if (!candidate) continue;
      const image = new Image();
      image.fetchPriority = 'low';
      image.src = asset(candidate);
    }
  }

  async function drawFrame() {
    const version = ++frameVersion;
    const current = frame();
    const url = asset(current);
    const title = `第 ${page + 1} 页，${slide().title}${current.caption ? '，' + current.caption : ''}`;
    stageStatus.hidden = true;
    if (stageImage.getAttribute('src') === url && stageImage.complete && stageImage.naturalWidth > 0) {
      stage.removeAttribute('aria-busy');
      return true;
    }
    stage.setAttribute('aria-busy', 'true');
    const ready = new Image();
    ready.src = url;
    try {
      await ready.decode();
      if (version !== frameVersion) return false;
      stageImage.src = url;
      stageImage.alt = title;
      stage.removeAttribute('aria-busy');
      prefetch();
      return true;
    } catch {
      if (version !== frameVersion) return false;
      stageImage.removeAttribute('src');
      stageImage.alt = title;
      stage.removeAttribute('aria-busy');
      stageStatus.textContent = '画面加载失败，点击此处重试。';
      stageStatus.hidden = false;
      return false;
    }
  }

  function render() {
    const interactive = lastStep() > 0;
    app.classList.toggle('with-steps', interactive);
    $('step-panel').hidden = !interactive;
    $('step-controls').hidden = !interactive;
    $('page-title').textContent = slide().title;
    $('page-count').value = `${page + 1} / ${pages.length}`;
    $('page-note').textContent = slide().note ?? '';
    $('page-note').hidden = !slide().note;
    $('prev-page').disabled = page === 0;
    $('next-page').disabled = page === pages.length - 1;
    $('prev-step').disabled = position() === 0;
    $('restart').disabled = position() === 0;
    $('finish').disabled = position() === lastStep();
    $('next-step').disabled = position() === lastStep() && page === pages.length - 1;
    $('next-step').textContent = position() === lastStep() ? '下一页 →' : '下一步 →';
    $('step-count').value = `${position()} / ${lastStep()} 步`;
    $('step-caption').textContent = frame().caption ?? '';
    setPlayLabel();
    buildStepList();
    updateStepList();
    return drawFrame();
  }

  function stop() {
    clearTimeout(timer);
    playVersion++;
    playing = false;
    setPlayLabel();
  }

  function go(index, keepHash = false) {
    if (index < 0 || index >= pages.length) return;
    stop();
    page = index;
    if (!keepHash) history.replaceState(null, '', `#page-${page + 1}`);
    render();
  }

  function setStep(index) {
    if (index < 0 || index > lastStep()) return;
    stop();
    stepPositions[page] = index;
    render();
  }

  function forward() {
    if (position() < lastStep()) setStep(position() + 1);
    else go(page + 1);
  }

  function back() {
    if (position() > 0) setStep(position() - 1);
    else go(page - 1);
  }

  async function playTick(version) {
    if (version !== playVersion || !playing) return;
    stepPositions[page]++;
    const ready = await render();
    if (version !== playVersion) return;
    if (!ready || position() === lastStep()) {
      stop();
      return;
    }
    timer = setTimeout(() => playTick(version), 2300);
  }

  $('menu').addEventListener('click', () => {
    stop();
    menuButtons.forEach((button, i) => {
      if (i === page) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    menu.showModal();
    menuButtons[page].focus({ preventScroll: true });
    menuButtons[page].scrollIntoView({ block: 'nearest' });
  });
  $('show-text').addEventListener('click', () => {
    stop();
    $('text-heading').textContent = `第 ${page + 1} 页 · ${slide().title}`;
    const text = frame().text;
    const lines = text.length ? text : ['本步以图形为主，点击课件画面可放大。'];
    const content = lines.map(line => {
      const paragraph = document.createElement('p');
      paragraph.textContent = line;
      return paragraph;
    });
    $('text-content').replaceChildren(...content);
    textDialog.showModal();
    $('text-content').scrollTop = 0;
  });

  function updateZoom(reset = false) {
    const scroll = $('zoom-scroll');
    const fitWidth = Math.min(scroll.clientWidth, scroll.clientHeight * 4 / 3);
    $('zoom-image').style.width = `${Math.floor(fitWidth * zoom)}px`;
    $('zoom-value').value = `${Math.round(zoom * 100)}%`;
    $('zoom-out').disabled = zoom === 1;
    $('zoom-in').disabled = zoom === 3;
    if (reset) scroll.scrollTo(0, 0);
  }

  function openZoom() {
    stop();
    if (!stageStatus.hidden) {
      drawFrame();
      return;
    }
    $('zoom-image').src = asset(frame());
    $('zoom-image').alt = `第 ${page + 1} 页，${slide().title}`;
    $('zoom-heading').textContent = `第 ${page + 1} 页`;
    zoom = 1;
    zoomDialog.showModal();
    updateZoom(true);
  }

  async function fullscreen() {
    if (!document.fullscreenEnabled) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await app.requestFullscreen();
    } catch {
      $('fullscreen').textContent = '浏览器全屏';
    }
  }

  stage.addEventListener('click', openZoom);
  $('zoom').addEventListener('click', openZoom);
  $('zoom-fit').addEventListener('click', () => { zoom = 1; updateZoom(true); });
  $('zoom-in').addEventListener('click', () => { zoom = Math.min(3, zoom + .25); updateZoom(); });
  $('zoom-out').addEventListener('click', () => { zoom = Math.max(1, zoom - .25); updateZoom(); });
  $('fullscreen').hidden = !document.fullscreenEnabled;
  $('fullscreen').addEventListener('click', fullscreen);
  document.addEventListener('fullscreenchange', () => {
    $('fullscreen').textContent = document.fullscreenElement ? '退出全屏' : '全屏';
    if (zoomDialog.open) updateZoom();
  });
  window.addEventListener('resize', () => { if (zoomDialog.open) updateZoom(); });
  for (const button of document.querySelectorAll('[data-close]')) {
    button.addEventListener('click', () => button.closest('dialog').close());
  }
  $('prev-page').addEventListener('click', () => go(page - 1));
  $('next-page').addEventListener('click', () => go(page + 1));
  $('prev-step').addEventListener('click', () => setStep(position() - 1));
  $('next-step').addEventListener('click', forward);
  $('restart').addEventListener('click', () => setStep(0));
  $('finish').addEventListener('click', () => setStep(lastStep()));
  $('play').addEventListener('click', () => {
    if (playing) stop();
    else if (position() < lastStep()) {
      playing = true;
      setPlayLabel();
      playTick(++playVersion);
    }
  });
  window.addEventListener('hashchange', () => go(pageFromHash(), true));
  document.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || dialogs.some(dialog => dialog.open)) return;
    if (event.key === ' ' && event.target.closest('button, a, input, select, textarea')) return;
    const actions = {
      ArrowRight: forward, ArrowLeft: back, ' ': forward,
      PageDown: () => go(page + 1), PageUp: () => go(page - 1),
      Home: () => go(0), End: () => go(pages.length - 1),
    };
    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  });

  render();
})();
