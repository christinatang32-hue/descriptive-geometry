/* Dimensions in mm. The XZ plane is the truss elevation. Y is through its thickness. */
window.SteelTruss = (() => {
  'use strict';

  const span = 18000;
  const rise = x => 1990 + Math.min(x, span - x) / 10;
  const lowerStations = [150, 3000, 6000, 9000, 12000, 15000, 17850];
  const top = x => [x, 0, rise(x)];
  const bottom = x => [x, 0, 0];
  const axes = [];
  const member = (id, layer, mark, a, b, leg) => {
    axes.push({ id, layer, mark, a, b, leg });
  };

  // The elevation labels the left half. Opposite members retain the mirrored positions.
  member('top-left', 'top', '1', top(0), top(9000), 110);
  member('top-right', 'top', '1', top(9000), top(span), 110);
  member('bottom-left', 'bottom', '2', bottom(80), bottom(9000), 56);
  member('bottom-right', 'bottom', '2', bottom(9000), bottom(17920), 56);
  const webColumns = [80, 3000, 6000, 9000, 12000, 15000, 17920];
  const verticalMarks = ['3', '6', '9', '13', '', '', ''];
  webColumns.forEach((x, i) => member(`vertical-${i}`, 'vertical', verticalMarks[i],
    bottom(x), top(x), i === 0 || i === 6 ? 55 : 69));
  const diagonalMarks = ['4', '5', '7', '8', '10', '11', '12', '', '', '', '', ''];
  for (let bay = 0; bay < 6; bay++) {
    const apex = top(1500 + bay * 3000);
    for (let side = 0; side < 2; side++) {
      const index = 2 * bay + side;
      member(`diagonal-${index}`, 'diagonal', diagonalMarks[index],
        bottom(lowerStations[bay + side]), apex, bay === 0 && side === 0 ? 100 : 64);
    }
  }

  const styles = {
    top: { name: '上弦杆', color: '#53eafd', text: '沿屋坡布置。简图中的斜线是杆件轴线，立面图给出双角钢的外轮廓。' },
    bottom: { name: '下弦杆', color: '#ffd236', text: '沿屋架底部水平布置。跨中两段下弦在 ② 节点处拼接。' },
    diagonal: { name: '斜腹杆', color: '#ff927a', text: '每两根斜腹杆在上弦相会，与相邻下弦和竖杆组成三角形。' },
    vertical: { name: '竖腹杆', color: '#c7aaff', text: '连接上下弦对应位置。观察端部和跨中的竖杆在节点处如何让开连接板。' },
    plates: { name: '连接板', color: '#7dd8b0', text: '位于杆件交会或拼接处。用拆分滑杆观察连接板与两侧角钢的相对位置。' },
    bearing: { name: '支座构造', color: '#8ebfef', text: '在端部承接节点。原图分别画出底板、孔位及其上方板件。' },
  };
  const joints = {
    'support-gusset': { name: '支座节点板', mark: '17', text: '位于双角钢之间，向下与支座底板相接。详图中的竖杆与斜杆止于板内不同位置。' },
    'support-stiffener': { name: '加劲板', mark: '19', text: '支座正视和侧视中的红色板件。侧视由板件轮廓和遮挡线交代其横向位置。' },
    'support-level': { name: '支座横板', mark: '20', text: '在详图中对照下弦轴线附近的横板及其引线。' },
    'support-base': { name: '支座底板', mark: '18', text: '原图标注厚 20 mm。侧视中的两处孔中心距中线各为 160 mm。' },
    'support-washers': { name: '底板上垫板', mark: '21', text: '原图标注垫板宽 100 mm、孔宽 26 mm。切换端视可核对两侧位置。' },
    'support-cleats': { name: '支座侧连接板', mark: '31', text: '端视图显示两侧成对布置的孔。外侧孔中心距中线各为 115 mm，上下孔距 80 mm。' },
    'midspan-gusset': { name: '跨中节点板', mark: '28', text: '在屋架中面连接两侧斜腹杆、跨中竖杆与下弦。' },
    'midspan-splice': { name: '下弦拼接件', mark: '15', text: '跨中两段下弦留缝，拼接件跨过接头。端视可核对双角钢与拼接件的相对位置。' },
    'midspan-cleats': { name: '跨中侧连接板', mark: '35', text: '观察 ② 详图右侧视图，两旁连接板各有两个孔。' },
  };

  const subtract = (a, b) => a.map((value, i) => value - b[i]);
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const scale = (a, s) => a.map(value => s * value);
  const unit = a => scale(a, 1 / Math.hypot(...a));
  const along = (a, b, t) => a.map((value, i) => value + (b[i] - value) * t);
  const xyz = (x, y, z) => [x, y, z];

  function build(scene, explode) {
    const parts = new Map();
    const shift = explode * 2.8;
    const isOverview = scene === 'all';
    const centerX = scene === 'support' ? 80 : 9000;

    function part(id, layer, mark = '') {
      if (!parts.has(id)) parts.set(id, { id, layer, mark, triangles: [] });
      return parts.get(id).triangles;
    }

    function triangle(out, a, b, c) {
      const normal = unit(cross(subtract(b, a), subtract(c, a)));
      out.push({ points: [a, b, c], normal });
    }

    function quad(out, a, b, c, d) {
      triangle(out, a, b, c);
      triangle(out, a, c, d);
    }

    // Extrude a convex face. Every end and side uses the same local section coordinates.
    function prism(out, points, at) {
      const front = points.map(p => at(p[0], p[1], 0));
      const back = points.map(p => at(p[0], p[1], 1));
      for (let i = 1; i < points.length - 1; i++) {
        triangle(out, front[0], front[i + 1], front[i]);
        triangle(out, back[0], back[i], back[i + 1]);
      }
      for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length;
        quad(out, front[i], front[j], back[j], back[i]);
      }
    }

    const rectangle = (u0, u1, v0, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
    const yz = (x, depth, yShift = 0) => (y, z, t) => xyz(x + t * depth, y + yShift, z);
    const xy = (z, depth) => (x, y, t) => xyz(x, y, z + t * depth);
    const xz = (y, depth) => (x, z, t) => xyz(x, y - t * depth, z);

    // Mesh an opening through a rectangular plate using the same contour on both faces.
    function perforated(out, u0, u1, v0, v1, u, v, radius, at, square = false) {
      const corners = rectangle(u0, u1, v0, v1);
      const angles = corners.map(([x, y]) => (Math.atan2(y - v, x - u) + Math.PI * 2) % (Math.PI * 2));
      for (let i = 0; i < 20; i++) angles.push(i * Math.PI / 10);
      if (square) for (let i = 0; i < 4; i++) angles.push(Math.PI / 4 + i * Math.PI / 2);
      angles.sort((a, b) => a - b);
      const rings = angles.filter((t, i) => i === 0 || t - angles[i - 1] > 1e-7).map(t => {
        const dx = Math.cos(t), dy = Math.sin(t);
        const edgeU = Math.abs(dx) < 1e-7 ? Infinity : ((dx > 0 ? u1 : u0) - u) / dx;
        const edgeV = Math.abs(dy) < 1e-7 ? Infinity : ((dy > 0 ? v1 : v0) - v) / dy;
        const outer = Math.min(edgeU, edgeV);
        const inner = square ? radius / Math.max(Math.abs(dx), Math.abs(dy)) : radius;
        return { o: [u + dx * outer, v + dy * outer], i: [u + dx * inner, v + dy * inner] };
      });
      const point = (pair, side) => at(pair[0], pair[1], side);
      rings.forEach((a, i) => {
        const b = rings[(i + 1) % rings.length];
        quad(out, point(a.o, 0), point(a.i, 0), point(b.i, 0), point(b.o, 0));
        quad(out, point(a.o, 1), point(b.o, 1), point(b.i, 1), point(a.i, 1));
        quad(out, point(a.o, 0), point(b.o, 0), point(b.o, 1), point(a.o, 1));
        quad(out, point(a.i, 0), point(a.i, 1), point(b.i, 1), point(b.i, 0));
      });
    }

    function anglePair(out, a, b, leg, layer) {
      const axis = unit(subtract(b, a));
      const normal = [-axis[2], 0, axis[0]];
      const isChord = layer === 'bottom' || layer === 'top';
      const factor = isOverview ? 1.9 : 1;
      const width = leg * factor;
      const flange = (layer === 'top' ? 100 : leg) * factor;
      const thickness = (layer === 'top' ? 10 : 7) * factor;
      const offset = (isOverview ? 11 : 4) + shift;
      const near = isChord ? -14 * factor : -.36 * width;
      const far = near + width;
      const toe = layer === 'top' ? far - thickness : near;
      for (const side of [-1, 1]) {
        const at = (y, z, t) => {
          const p = along(a, b, t);
          return [p[0] + normal[0] * z, side * (offset + y), p[2] + normal[2] * z];
        };
        prism(out, rectangle(0, thickness, near, far), at);
        prism(out, rectangle(thickness, flange, toe, toe + thickness), at);
      }
    }

    for (const axis of axes) {
      // Shared part IDs keep both angles and both representations linked.
      if (!isOverview && ![axis.a, axis.b].some(p => Math.abs(p[0] - centerX) < 160 && p[2] < 1)) continue;
      if (scene === 'support' && axis.id === 'bottom-right') continue;
      let { a, b } = axis;
      const start = Math.abs(a[0] - centerX) < 160 && a[2] < 1;
      const end = Math.abs(b[0] - centerX) < 160 && b[2] < 1;
      const length = Math.hypot(...subtract(b, a));
      if (!isOverview) {
        const reach = axis.layer === 'bottom' ? 490 : 605;
        const gap = axis.layer === 'bottom' ? (scene === 'support' ? 35 : 2.5) :
          axis.layer === 'vertical' ? (scene === 'support' ? 50 : 55) : (scene === 'support' ? 100 : 194);
        const anchor = start ? a : b;
        const far = start ? b : a;
        const from = along(anchor, far, gap / length);
        const to = along(anchor, far, reach / length);
        [a, b] = end ? [to, from] : [from, to];
      } else if (axis.layer === 'vertical' || axis.layer === 'diagonal') {
        const gap = axis.layer === 'vertical' ? 65 : 112;
        [a, b] = [along(a, b, gap / length), along(a, b, 1 - gap / length)];
      }
      anglePair(part(axis.id, axis.layer, axis.mark), a, b, axis.leg, axis.layer);
    }

    const facePlate = (out, points, thickness = 8) => prism(out, points, xz(thickness / 2, thickness));
    if (isOverview) {
      // Secondary gussets are diagrammatic. Nodes ① and ② use their own detail geometry.
      const outline = (x, z, w, h) => rectangle(x - w, x + w, z - h, z + h);
      for (let x = 0; x <= span; x += 1500) {
        const z = rise(x);
        facePlate(part('top-gussets', 'plates'), outline(x, z - 95, 225, 138), 24);
      }
      for (const x of lowerStations.slice(1, -1)) {
        const id = x === 9000 ? 'midspan-gusset' : 'bottom-gussets';
        facePlate(part(id, 'plates', x === 9000 ? '28' : ''), outline(x, 80, 265, 170), 24);
      }
      for (const end of [80, 17920]) {
        facePlate(part('support-gusset', 'plates', '17'), outline(end, 22, 176, 270), 24);
        prism(part('support-base', 'bearing', '18'), outline(end, 0, 200, 275), xy(-235, 42));
      }
    }

    function sidePlates(id, x, z, z1, width, mark) {
      const out = part(id, 'plates', mark);
      for (const side of [-1, 1]) {
        const center = side * 115;
        const u0 = center - width / 2;
        const u1 = center + width / 2;
        const split = (z + z1) / 2;
        const at = yz(x, 8, side * shift * 1.4);
        perforated(out, u0, u1, z - 57, split, center, z, 10.75, at);
        perforated(out, u0, u1, split, z1 + 54, center, z1, 10.75, at);
      }
    }

    if (scene === 'support') {
      const x = centerX;
      facePlate(part('support-gusset', 'plates', '17'), rectangle(x - 140, x + 175, -190, 240));
      for (const side of [-1, 1]) {
        const offset = side * shift * .5;
        prism(part('support-stiffener', 'bearing', '19'),
          [[-85, -190], [85, -190], [85, 28], [42, 240], [-42, 240], [-85, 28]], yz(x - 63, 8, offset));
        const y0 = side < 0 ? -190 : 0;
        const y1 = side < 0 ? 0 : 190;
        perforated(part('support-base', 'bearing', '18'), x - 140, x + 160, y0, y1, x, side * 160, 25, xy(-210, 20), true);
        perforated(part('support-washers', 'bearing', '21'), x - 50, x + 50, side * 160 - 50, side * 160 + 50,
          x, side * 160, 13, xy(-190 + explode * .42, 20));
      }
      prism(part('support-level', 'bearing', '20'), rectangle(x - 140, x + 1, -85, 85), xy(-5, 10));
      sidePlates('support-cleats', x - 73, 65, 145, 135, '31');
    }

    if (scene === 'midspan') {
      const x = centerX;
      facePlate(part('midspan-gusset', 'plates', '28'), rectangle(x - 185, x + 185, -30, 260));
      for (const side of [-1, 1]) {
        const y = side * (6 + shift * .68);
        const y0 = Math.min(y, y + side * 90);
        const y1 = y0 + 90;
        const out = part('midspan-splice', 'plates', '15');
        prism(out, rectangle(x - 205, x + 205, y0, y1), xy(-24, 8));
        prism(out, rectangle(x - 205, x + 205, -16, 30), xz(y + 4, 8));
      }
      sidePlates('midspan-cleats', x + 43, 65, 145, 140, '35');
    }

    // Preserve stable colours while selecting individual pieces.
    return [...parts.values()];
  }

  return { axes, build, styles, joints, span, subtract, cross, dot, scale, unit };
})();
