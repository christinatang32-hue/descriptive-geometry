(() => {
  'use strict';

  const { axes, build, styles, joints, span, subtract, dot, cross, unit } = window.SteelTruss;
  const $ = id => document.getElementById(id);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const canvas = $('model');
  const overlay = $('overlay');
  const ctx = overlay.getContext('2d');
  const gl = canvas.getContext('webgl', { antialias: true, alpha: true });
  const layerKeys = Object.keys(styles);
  const layerInputs = $$('[data-layer]');
  const svgNS = 'http://www.w3.org/2000/svg';

  const drawings = {
    sheet: ['钢结构图 07 · 整张原图', '布局 1'],
    scheme: ['屋架简图', '1:100 · 轴线与尺寸'],
    elevation: ['屋架立面图', '1:20 · 双角钢与构件编号'],
    support: ['① 支座节点详图', '1:5 · 正视与侧视'],
    midspan: ['② 跨中节点详图', '1:5 · 正视与侧视'],
  };
  const drawingKeys = Object.keys(drawings);
  const drawingSrc = id => `assets/steel-truss/${id}.png`;
  const steps = [
    {
      tab: '屋架简图', title: '沿轴线读跨度和高度', drawing: 'scheme',
      text: '先看屋架的外形和杆系。水平下弦与两段斜上弦围成双坡轮廓，腹杆把轮廓分成一系列三角形。',
      points: ['总跨 18,000 mm。下弦端部斜腹杆交点距端轴线 150 mm。', '端高 1,990 mm。由端部到跨中，上弦每水平前进 1,500 mm 升高 150 mm。'],
    },
    {
      tab: '上弦与下弦', title: '从轴线读到双角钢', drawing: 'elevation',
      layers: ['top', 'bottom'], selected: 'top-left',
      text: '原立面以 1 标上弦、以 2 标下弦。旋转模型，观察同一根杆件怎样由中面两侧的角钢组成。',
      points: ['在简图中定位轴线，再在立面中找轴线两侧的构件轮廓。', '切到俯视，比较两片角钢在屋架厚度方向的位置。'],
    },
    {
      tab: '斜腹杆与竖杆', title: '顺着三角形找腹杆', drawing: 'elevation',
      layers: ['top', 'bottom', 'diagonal', 'vertical'], selected: 'diagonal-0',
      text: '从左支座向跨中读，斜腹杆交替上升和下降。部分节点还设有连接上下弦的竖杆。',
      points: ['在立面上找 4 号斜腹杆，再沿它追到端部下弦与上弦节点。', '对比端部 3 号竖杆、跨中 13 号竖杆，观察杆件与节点板接触的位置。'],
    },
    {
      tab: '① 支座', title: '对照正视与侧视读支座', drawing: 'support',
      scene: 'support', selected: 'support-base',
      text: '① 号详图放大了端部下弦、斜腹杆和竖杆交会处。先找 18 号底板，再看 17 号节点板如何位于两片角钢之间。',
      points: ['18 号底板厚 20 mm，两侧孔中心到中线各 160 mm。', '切换端视或拖动拆分滑杆，对照 21 号垫板与 31 号侧连接板的孔位。'],
    },
    {
      tab: '② 跨中', title: '辨认跨中下弦接头', drawing: 'midspan',
      scene: 'midspan', selected: 'midspan-splice',
      text: '② 号详图位于屋架底部跨中。找出两段下弦之间的接头，再观察 15 号拼接件、28 号节点板与 35 号侧连接板。',
      points: ['原图用 5 mm 标出下弦端部接缝，用 185 和 205 mm 标出接头一侧的板件边缘位置。', '转到端视，观察节点板、两片角钢与两侧连接板如何分布。'],
    },
    {
      tab: '整架核对', title: '在三个比例之间定位', drawing: 'sheet',
      text: '在 1:100 简图找位置、在 1:20 立面找编号、在 1:5 详图核对厚度方向。点选立面联动图上的 ①、②，复述两个节点各连接哪些构件。',
      points: ['说明 ① 底板与 ② 下弦拼接件分别对应原图中的哪个编号。', '在原详图找焊缝符号和引线，判断符号指向哪两件构件。'],
    },
  ];
  const scenes = {
    all: { title: '整榀屋架', pivot: [9000, 0, 1170], width: 18800, height: 3950, depth: 650, iso: [-.34, .24] },
    support: { title: '① 支座节点', pivot: [225, 0, 182], width: 830, height: 870, depth: 600, iso: [-.52, .22] },
    midspan: { title: '② 跨中节点', pivot: [9000, 0, 265], width: 1120, height: 650, depth: 576, iso: [-.47, .24] },
  };
  const state = {
    step: 0, scene: 'all', layers: new Set(layerKeys), selected: null, guides: true, explode: 0,
    view: 'iso', yaw: 0, pitch: 0, pan: [0, 0], zoom: 1, auto: false,
  };
  let parts = [];
  let frame;
  let drawPending = false;
  let autoFrame;
  let drag;

  function compile(type, code) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, code);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }

  function setupRenderer() {
    if (!gl) return null;
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, `
      attribute vec3 position;
      attribute vec3 normal;
      attribute vec3 color;
      uniform vec3 center, right, up, toward;
      uniform vec2 screenScale, pan;
      uniform float depthRange;
      varying vec3 shade;
      void main() {
        vec3 p = position - center;
        vec2 projected = vec2(dot(p, right), dot(p, up)) * screenScale + pan;
        gl_Position = vec4(projected, -dot(p, toward) / depthRange, 1.0);
        float lit = 0.54 + 0.27 * abs(dot(normal, normalize(vec3(-0.38, -0.63, 0.69))))
                         + 0.19 * abs(dot(normal, toward));
        shade = color * lit;
      }
    `));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, `
      precision mediump float;
      varying vec3 shade;
      void main() { gl_FragColor = vec4(shade, 1.0); }
    `));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    const fields = ['position', 'normal', 'color'];
    fields.forEach((name, index) => {
      const slot = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(slot);
      gl.vertexAttribPointer(slot, 3, gl.FLOAT, false, 36, index * 12);
    });
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);
    const uniforms = ['center', 'right', 'up', 'toward', 'screenScale', 'pan', 'depthRange'];
    return Object.fromEntries(uniforms.map(name => [name, gl.getUniformLocation(program, name)]));
  }

  let uniforms;
  try {
    uniforms = setupRenderer();
  } catch (error) {
    console.error('钢屋架模型初始化失败', error);
  }
  $('render-error').hidden = Boolean(uniforms);

  const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const colors = Object.fromEntries(layerKeys.map(key => [key, rgb(styles[key].color)]));
  const selectedColor = rgb('#fff4ba');

  function uploadGeometry() {
    if (!uniforms) return;
    const data = [];
    for (const part of parts) {
      if (!state.layers.has(part.layer)) continue;
      const highlight = state.selected === part.id;
      const color = highlight ? selectedColor : colors[part.layer];
      const dim = state.selected && !highlight ? .55 : 1;
      const [r, g, b] = color.map(channel => channel * dim);
      for (const { points, normal } of part.triangles) {
        for (const p of points) data.push(...p, ...normal, r, g, b);
      }
    }
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_DRAW);
    return data.length / 9;
  }

  let vertices = 0;
  function rebuild() {
    parts = build(state.scene, state.explode);
    vertices = uploadGeometry() ?? 0;
    requestRender();
  }

  function makeFrame() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const { yaw, pitch, zoom, scene } = state;
    const { pivot, width, height, depth } = scenes[scene];
    const right = [Math.cos(yaw), Math.sin(yaw), 0];
    const toward = [Math.sin(yaw) * Math.cos(pitch), -Math.cos(yaw) * Math.cos(pitch), Math.sin(pitch)];
    const up = unit(cross(toward, right));
    // A single fit scale per preset keeps dragging from changing the apparent size.
    const aspectWidth = state.view === 'end' ? depth + 180 : width;
    const aspectHeight = state.view === 'top' ? depth + 200 : height;
    const usableW = w * (scene === 'all' ? .86 : .79);
    const s = Math.min(usableW / aspectWidth, (h - 74) / aspectHeight) * zoom;
    return { w, h, s, pivot, right, up, toward, depthRange: scene === 'all' ? 30000 : 3200 };
  }

  function project(point) {
    const { pivot, right, up, toward, w, h, s } = frame;
    const p = subtract(point, pivot);
    return [w / 2 + dot(p, right) * s + state.pan[0], h / 2 - dot(p, up) * s + state.pan[1], dot(p, toward)];
  }

  function stroke(a, b, color, dash = []) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function label(x, y, text, color = '#e7f6ff') {
    ctx.font = '700 12px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const width = ctx.measureText(text).width + 12;
    ctx.fillStyle = '#071827eb';
    ctx.fillRect(x - width / 2, y - 9, width, 18);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y + 1);
  }

  function dimension(a, b, text) {
    const pa = project(a), pb = project(b);
    if (Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) < 30) return;
    const color = '#85afc6';
    stroke(pa, pb, color);
    for (const p of [pa, pb]) stroke([p[0] - 3, p[1] + 4], [p[0] + 3, p[1] - 4], color);
    label((pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2 + 13, text, '#cbecfb');
  }

  const indexTargets = [
    { scene: 'support', digit: '1', x: 80 },
    { scene: 'midspan', digit: '2', x: 9000 },
  ];
  let guideHits = [];
  function drawOverlay() {
    const { w, h } = frame;
    ctx.clearRect(0, 0, w, h);
    guideHits = [];
    if (!uniforms) return;
    if (state.guides && state.scene === 'all' && state.view !== 'end' && state.view !== 'top') {
      const offset = -Math.max(710, 33 / Math.max(.01, frame.s * Math.abs(frame.up[2])));
      const color = '#7699ad9e';
      stroke(project([0, 0, 0]), project([0, 0, offset - 75]), color, [4, 4]);
      stroke(project([span, 0, 0]), project([span, 0, offset - 75]), color, [4, 4]);
      dimension([0, 0, offset], [span, 0, offset], '18,000 mm');
      for (const target of indexTargets) {
        const p = project([target.x, 0, 0]);
        const y = p[1] + 18;
        ctx.beginPath();
        ctx.arc(p[0], y, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#102f40';
        ctx.fill();
        ctx.strokeStyle = '#8beeff';
        ctx.stroke();
        ctx.font = '700 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#b6f6ff';
        ctx.fillText(target.digit, p[0], y);
        guideHits.push({ ...target, px: p[0], py: y });
      }
    }

    const base = [34, h - 32];
    const origin = project([0, 0, 0]);
    for (const [index, axis, color] of [[0, 'X', '#ff927a'], [1, 'Y', '#7dd8b0'], [2, 'Z', '#53eafd']]) {
      const p = [0, 0, 0];
      p[index] = 21 / frame.s;
      const q = project(p);
      const tip = [base[0] + q[0] - origin[0], base[1] + q[1] - origin[1]];
      if (Math.hypot(tip[0] - base[0], tip[1] - base[1]) < 4) continue;
      stroke(base, tip, color);
      ctx.fillStyle = color;
      ctx.font = '700 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(axis, tip[0] + (tip[0] < base[0] ? -5 : 6), tip[1] - 4);
    }
  }

  function render() {
    drawPending = false;
    if (canvas.clientHeight < 1 || canvas.clientWidth < 1) return;
    frame = makeFrame();
    const { w, h, s, pivot, right, up, toward, depthRange } = frame;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    for (const surface of [canvas, overlay]) {
      const width = Math.round(w * dpr), height = Math.round(h * dpr);
      if (surface.width !== width || surface.height !== height) {
        surface.width = width;
        surface.height = height;
      }
    }
    if (uniforms) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniform3fv(uniforms.center, pivot);
      gl.uniform3fv(uniforms.right, right);
      gl.uniform3fv(uniforms.up, up);
      gl.uniform3fv(uniforms.toward, toward);
      gl.uniform2f(uniforms.screenScale, 2 * s / w, 2 * s / h);
      gl.uniform2f(uniforms.pan, 2 * state.pan[0] / w, -2 * state.pan[1] / h);
      gl.uniform1f(uniforms.depthRange, depthRange);
      gl.drawArrays(gl.TRIANGLES, 0, vertices);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawOverlay();
  }

  function requestRender() {
    if (drawPending) return;
    drawPending = true;
    requestAnimationFrame(render);
  }

  const toggleButtons = (selector, key, active) => $$(selector).forEach(button => {
    const on = button.dataset[key] === active;
    button.classList.toggle('active', on);
    button.setAttribute('aria-pressed', String(on));
  });

  function setView(view) {
    const presets = { iso: scenes[state.scene].iso, front: [0, 0], top: [0, Math.PI / 2], end: [-Math.PI / 2, 0] };
    state.view = view;
    [state.yaw, state.pitch] = presets[view];
    state.pan = [0, 0];
    state.zoom = 1;
    toggleButtons('[data-view]', 'view', view);
    requestRender();
  }

  function zoomBy(factor) {
    state.zoom = Math.max(.45, Math.min(5, state.zoom * factor));
    requestRender();
  }

  function rotateBy(yaw, pitch) {
    state.yaw += yaw;
    state.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, state.pitch + pitch));
    toggleButtons('[data-view]', 'view', '');
    requestRender();
  }

  function setAuto(on) {
    state.auto = on;
    $('auto-rotate').setAttribute('aria-pressed', String(on));
    cancelAnimationFrame(autoFrame);
    if (!on) return;
    if (state.view !== 'iso') setView('iso');
    let previous;
    const turn = time => {
      if (previous !== undefined) rotateBy(Math.min(30, time - previous) * .00028, 0);
      previous = time;
      autoFrame = requestAnimationFrame(turn);
    };
    autoFrame = requestAnimationFrame(turn);
  }

  function setExplosion(value) {
    state.explode = value;
    $('explode').value = value;
    $('explode-value').value = `${value}%`;
    rebuild();
  }

  function describePart(part) {
    if (joints[part.id]) return joints[part.id];
    const fallback = part.layer === 'plates' ? '图纸未逐一列出本组板件的剖面。' : '右半构件按简图杆系与左半立面的对应关系表达。';
    return { name: styles[part.layer].name, mark: part.mark, text: styles[part.layer].text + (part.mark ? '' : fallback) };
  }

  function syncSelection() {
    const part = parts.find(candidate => candidate.id === state.selected);
    const description = part ? describePart(part) : null;
    $('part-title').textContent = description ? description.name + (description.mark ? ` · 编号 ${description.mark}` : '') : '点选模型或立面上的构件';
    $('part-text').textContent = description ? description.text : '选择后可查看构件名称、图纸编号和对应位置。';
    $('clear-selection').hidden = !description;
    updateElevation();
  }

  function selectPart(id) {
    state.selected = id;
    syncSelection();
    vertices = uploadGeometry() ?? 0;
    requestRender();
  }

  function syncLayers() {
    layerInputs.forEach(input => { input.checked = state.layers.has(input.dataset.layer); });
  }

  function selectScene(scene, selection = null) {
    setAuto(false);
    state.scene = scene;
    state.selected = selection;
    if (scene !== 'all') state.layers = new Set(layerKeys);
    syncLayers();
    $('viewport').dataset.scene = scene;
    $('model-title').textContent = scenes[scene].title;
    toggleButtons('[data-scene]', 'scene', scene);
    $('explode-controls').hidden = scene === 'all';
    setView('iso');
    setExplosion(0);
    syncSelection();
  }

  function pickAt(x, y) {
    if (!frame || !uniforms) return;
    const hotspot = guideHits.find(hit => Math.hypot(x - hit.px, y - hit.py) <= 12);
    if (hotspot) {
      selectScene(hotspot.scene);
      return;
    }
    let picked = null;
    let nearest = -Infinity;
    for (const part of parts) {
      if (!state.layers.has(part.layer)) continue;
      for (const triangle of part.triangles) {
        const [a, b, c] = triangle.points.map(project);
        const [abx, aby] = subtract(b, a);
        const [acx, acy] = subtract(c, a);
        const det = abx * acy - aby * acx;
        if (Math.abs(det) < .00001) continue;
        const dx = x - a[0], dy = y - a[1];
        const u = (dx * acy - dy * acx) / det;
        const v = (abx * dy - aby * dx) / det;
        if (u < 0 || v < 0 || u + v > 1) continue;
        const depth = a[2] + u * (b[2] - a[2]) + v * (c[2] - a[2]);
        if (depth > nearest) {
          nearest = depth;
          picked = part.id;
        }
      }
    }
    selectPart(picked);
  }

  const elevation = $('elevation');
  const diagramMembers = new Map();
  const diagramIndices = new Map();
  const diagramX = x => 24 + x * 352 / span;
  const diagramY = z => 83 - z * 352 / span;

  function svgNode(name, attrs, text) {
    const node = document.createElementNS(svgNS, name);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    if (text) node.textContent = text;
    return node;
  }

  function actOnKey(element, action) {
    element.addEventListener('click', action);
    element.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      action();
    });
  }

  function buildElevation() {
    elevation.append(svgNode('path', { d: 'M24 87v27 M376 87v27 M24 107h352 M21 111l6 -8 M373 111l6 -8',
      fill: 'none', stroke: '#7696a9', 'stroke-width': '1' }));
    elevation.append(svgNode('text', { x: 200, y: 122, fill: '#bedaef', 'text-anchor': 'middle', 'font-size': '11' }, '18,000 mm'));
    for (const part of axes) {
      const coords = { x1: diagramX(part.a[0]), y1: diagramY(part.a[2]), x2: diagramX(part.b[0]), y2: diagramY(part.b[2]) };
      const hit = svgNode('line', { ...coords, class: 'member-hit', stroke: 'transparent', 'stroke-width': 12, role: 'button',
        tabindex: 0, 'aria-label': `${styles[part.layer].name}${part.mark ? ' ' + part.mark : ''}，距左端约 ${Math.round((part.a[0] + part.b[0]) / 2)} mm` });
      const line = svgNode('line', { ...coords, class: 'member-line', 'pointer-events': 'none', 'aria-hidden': 'true' });
      actOnKey(hit, () => {
        state.layers.add(part.layer);
        if (state.scene !== 'all' && !parts.some(p => p.id === part.id)) selectScene('all');
        syncLayers();
        selectPart(part.id);
      });
      diagramMembers.set(part.id, { hit, line });
      elevation.append(hit, line);
    }
    for (const { scene, digit, x } of indexTargets) {
      const index = svgNode('g', { class: 'index', role: 'button', tabindex: 0, 'aria-label': scenes[scene].title });
      const cx = diagramX(x) + (digit === '1' ? 12 : 0);
      const cy = 93;
      index.append(svgNode('circle', { cx, cy, r: 9, 'stroke-width': 1.3 }));
      index.append(svgNode('text', { x: cx, y: cy + 3.7, fill: '#e7f6ff', 'font-size': 10, 'text-anchor': 'middle' }, digit));
      diagramIndices.set(scene, index);
      actOnKey(index, () => selectScene(scene));
      elevation.append(index);
    }
  }

  function updateElevation() {
    for (const part of axes) {
      const { hit, line } = diagramMembers.get(part.id);
      const active = state.selected === part.id;
      const enabled = state.layers.has(part.layer);
      line.setAttribute('stroke', active ? '#fff0ac' : styles[part.layer].color);
      line.setAttribute('stroke-width', active ? '3.7' : '2');
      line.setAttribute('opacity', enabled ? (state.selected && !active ? '.57' : '1') : '.23');
      hit.setAttribute('aria-pressed', String(active));
    }
    for (const [scene, index] of diagramIndices) {
      const active = state.scene === scene;
      index.setAttribute('aria-pressed', String(active));
      index.firstChild.setAttribute('fill', active ? '#5e512b' : '#102e40');
      index.firstChild.setAttribute('stroke', active ? '#ffe586' : '#8beeff');
    }
  }

  function setStep(index, focus = false) {
    const step = steps[index];
    state.step = index;
    state.layers = new Set(step.layers ?? layerKeys);
    selectScene(step.scene ?? 'all', step.selected ?? null);
    $('step-counter').textContent = `${index + 1} / ${steps.length}`;
    $('step-title').textContent = step.title;
    $('step-text').textContent = step.text;
    $('step-points').replaceChildren(...step.points.map(text => {
      const li = document.createElement('li');
      li.textContent = text;
      return li;
    }));
    $('step-drawing').onclick = () => showDrawing(step.drawing);
    $('lesson-copy').setAttribute('aria-labelledby', `step-${index}`);
    $('prev-step').disabled = index === 0;
    $('next-step').disabled = index === steps.length - 1;
    $$('[data-step]').forEach((button, i) => {
      button.setAttribute('aria-selected', String(i === index));
      button.tabIndex = i === index ? 0 : -1;
      if (i === index && focus) button.focus();
    });
  }

  const stepTabs = document.querySelector('.steps');
  steps.forEach((step, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.id = `step-${i}`;
    button.dataset.step = i;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', 'lesson-copy');
    button.textContent = `${String(i + 1).padStart(2, '0')} ${step.tab}`;
    button.onclick = () => setStep(i);
    stepTabs.append(button);
  });
  stepTabs.addEventListener('keydown', event => {
    const destinations = {
      ArrowLeft: (state.step + steps.length - 1) % steps.length,
      ArrowRight: (state.step + 1) % steps.length, Home: 0, End: steps.length - 1,
    };
    if (!Object.hasOwn(destinations, event.key)) return;
    event.preventDefault();
    setStep(destinations[event.key], true);
  });

  const dialog = $('drawing-dialog');
  const drawingWrap = document.querySelector('.drawing-image-wrap');
  const drawingSelect = $('drawing-select');
  function setDrawingZoom(on) {
    drawingWrap.classList.toggle('zoomed', on);
    $('zoom-drawing').textContent = on ? '适合窗口' : '放大';
    $('zoom-drawing').setAttribute('aria-pressed', String(on));
    drawingWrap.scrollTo(0, 0);
  }

  function showDrawing(id) {
    $('drawing-title').textContent = drawings[id][0];
    $('drawing-image').src = drawingSrc(id);
    $('drawing-image').alt = drawings[id][0];
    $('drawing-original').href = drawingSrc(id);
    drawingSelect.value = id;
    setDrawingZoom(false);
    if (!dialog.open) dialog.showModal();
  }

  for (const [id, [title, note]] of Object.entries(drawings)) {
    drawingSelect.append(new Option(title, id));
    if (id === 'sheet') continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'drawing-card';
    button.dataset.drawing = id;
    const picture = new Image();
    picture.src = drawingSrc(id);
    picture.loading = 'lazy';
    picture.alt = '';
    const caption = document.createElement('strong');
    caption.textContent = title;
    const details = document.createElement('small');
    details.textContent = note;
    button.append(picture, caption, details);
    $('drawing-cards').append(button);
  }
  function changeDrawing(direction) {
    const i = drawingKeys.indexOf(drawingSelect.value);
    showDrawing(drawingKeys[(i + direction + drawingKeys.length) % drawingKeys.length]);
  }

  $$('[data-drawing]').forEach(button => { button.onclick = () => showDrawing(button.dataset.drawing); });
  $('close-drawing').onclick = () => dialog.close();
  $('prev-drawing').onclick = () => changeDrawing(-1);
  $('next-drawing').onclick = () => changeDrawing(1);
  $('zoom-drawing').onclick = () => setDrawingZoom(!drawingWrap.classList.contains('zoomed'));
  drawingSelect.onchange = () => showDrawing(drawingSelect.value);
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
  });

  $$('[data-color]').forEach(swatch => { swatch.style.background = styles[swatch.dataset.color].color; });
  $$('[data-view]').forEach(button => { button.onclick = () => { setAuto(false); setView(button.dataset.view); }; });
  $$('[data-scene]').forEach(button => { button.onclick = () => selectScene(button.dataset.scene); });
  layerInputs.forEach(input => input.onchange = () => {
    const key = input.dataset.layer;
    if (input.checked) state.layers.add(key);
    else state.layers.delete(key);
    const part = parts.find(item => item.id === state.selected);
    selectPart(part && state.layers.has(part.layer) ? state.selected : null);
  });
  $('show-guides').onchange = event => { state.guides = event.target.checked; requestRender(); };
  $('clear-selection').onclick = () => selectPart(null);
  $('explode').oninput = event => setExplosion(Number(event.target.value));
  $('auto-rotate').onclick = () => setAuto(!state.auto);
  $('fullscreen').hidden = !document.fullscreenEnabled;
  $('fullscreen').onclick = () => $('viewport').requestFullscreen().catch(() => {});
  $('zoom-in').onclick = () => zoomBy(1.18);
  $('zoom-out').onclick = () => zoomBy(1 / 1.18);
  $('reset-view').onclick = () => { setAuto(false); setView('iso'); };
  $('prev-step').onclick = () => setStep(state.step - 1);
  $('next-step').onclick = () => setStep(state.step + 1);

  canvas.addEventListener('pointerdown', event => {
    if (drag || ![0, 2].includes(event.button)) return;
    setAuto(false);
    canvas.setPointerCapture(event.pointerId);
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false, pan: event.shiftKey || event.button === 2 };
  });
  canvas.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    drag.moved = true;
    drag.x = event.clientX;
    drag.y = event.clientY;
    if (drag.pan) {
      state.pan[0] += dx;
      state.pan[1] += dy;
      requestRender();
    } else {
      rotateBy(dx * .009, dy * .009);
    }
  });
  canvas.addEventListener('pointerup', event => {
    if (!drag || drag.id !== event.pointerId) return;
    if (!drag.moved && !drag.pan) {
      const rect = canvas.getBoundingClientRect();
      pickAt(event.clientX - rect.left, event.clientY - rect.top);
    }
    drag = null;
  });
  canvas.addEventListener('lostpointercapture', () => { drag = null; });
  canvas.addEventListener('contextmenu', event => event.preventDefault());
  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    zoomBy(Math.exp(-Math.max(-160, Math.min(160, event.deltaY)) * .0023));
  }, { passive: false });
  canvas.addEventListener('keydown', event => {
    const actions = {
      ArrowLeft: () => rotateBy(-.11, 0), ArrowRight: () => rotateBy(.11, 0),
      ArrowUp: () => rotateBy(0, -.11), ArrowDown: () => rotateBy(0, .11),
      '+': () => zoomBy(1.18), '=': () => zoomBy(1.18), '-': () => zoomBy(1 / 1.18),
      Home: () => setView('iso'), Escape: () => selectPart(null),
    };
    if (!Object.hasOwn(actions, event.key)) return;
    event.preventDefault();
    setAuto(false);
    actions[event.key]();
  });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    uniforms = null;
    $('render-error').hidden = false;
    requestRender();
  });
  canvas.addEventListener('webglcontextrestored', () => {
    uniforms = setupRenderer();
    $('render-error').hidden = !uniforms;
    rebuild();
  });
  new ResizeObserver(requestRender).observe(canvas);
  buildElevation();
  setStep(0);
})();
