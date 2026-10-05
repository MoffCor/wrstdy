// The equipment Drip props up to get around: ladders, stairs, a trampoline, a
// grappling rope, a slide, a fire pole, and the occasional puddle. Positioned
// in the app's own CSS pixels (left/bottom from the app's bottom-left), the
// same coordinates he moves in. Purely visual; it never takes clicks.

export function DripGear({ gear }) {
  if (!gear) return null;
  const { type, state = 'up' } = gear;
  const cls = `buddy-gear no-print gear-${type} gear-${state}${gear.dir ? ` gear-${gear.dir}` : ''}`;

  if (type === 'ladder') {
    return <div key={gear.key} className={cls} style={{ left: gear.left, bottom: gear.bottom, height: gear.height }} aria-hidden="true" />;
  }

  if (type === 'stairs') {
    // A staircase that builds itself step by step from (x0,y0) up to (x1,y1).
    const { x0, y0, x1, y1 } = gear;
    const dir = x1 >= x0 ? 1 : -1;
    const width = Math.abs(x1 - x0) + 44;
    const rise = Math.max(1, y1 - y0);
    const n = Math.max(3, Math.min(14, Math.round(rise / 16)));
    const stepW = width / n;
    return (
      <div key={gear.key} className={cls} style={{ left: Math.min(x0, x1) + 10, bottom: y0 + 8, width, height: rise }} aria-hidden="true">
        {Array.from({ length: n }, (_, i) => (
          <i
            key={i}
            style={{
              left: dir > 0 ? i * stepW : width - (i + 1) * stepW,
              width: stepW + 1,
              height: ((i + 1) * rise) / n,
              animationDelay: `${i * 45}ms`,
            }}
          />
        ))}
      </div>
    );
  }

  if (type === 'trampoline') {
    return (
      <svg key={gear.key} className={cls} style={{ left: gear.left, bottom: gear.bottom }} viewBox="0 0 60 18" width="60" height="18" aria-hidden="true">
        <path d="M6 6 l-4 11 M54 6 l4 11 M18 7 l-2 10 M42 7 l2 10" className="tr-leg" />
        <path className="tr-mat" d="M4 6 Q30 9 56 6" />
        <rect x="2" y="4" width="56" height="3" rx="1.5" className="tr-frame" />
      </svg>
    );
  }

  if (type === 'rope') {
    // Thrown up from his hand: a hook at the top, the rope hanging from it.
    return <div key={gear.key} className={cls} style={{ left: gear.left, bottom: gear.bottom, height: gear.height }} aria-hidden="true" />;
  }

  if (type === 'slide') {
    // A playground slide from the top point (x0,y0) down to (x1,y1).
    const { x0, y0, x1, y1 } = gear;
    const w = Math.abs(x1 - x0) + 60;
    const h = Math.abs(y0 - y1) + 30;
    const left = Math.min(x0, x1) + 2;
    const bottom = Math.min(y0, y1) + 4;
    const goingRight = x1 >= x0;
    const top = { x: goingRight ? 30 : w - 30, y: 14 };
    const end = { x: goingRight ? w - 6 : 6, y: h - 4 };
    const d = `M${top.x} ${top.y} C ${top.x + (end.x - top.x) * 0.25} ${top.y + (end.y - top.y) * 0.75}, ${top.x + (end.x - top.x) * 0.6} ${end.y}, ${end.x} ${end.y}`;
    return (
      <svg key={gear.key} className={cls} style={{ left, bottom }} viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
        <path d={`M${top.x} ${top.y} V ${h}`} className="sl-post" />
        <path d={d} className="sl-bed" />
        <path d={d} className="sl-rail" transform="translate(0 -4)" />
      </svg>
    );
  }

  if (type === 'pole') {
    return <div key={gear.key} className={cls} style={{ left: gear.left, bottom: gear.bottom, height: gear.height }} aria-hidden="true" />;
  }

  if (type === 'puddle') {
    return <div key={gear.key} className={cls} style={{ left: gear.left, bottom: gear.bottom }} aria-hidden="true" />;
  }

  return null;
}
