export function Reveal() {
  return (
    <section id="reveal" className="tall reveal">
      <div className="sticky">
        <div className="frame-ticks" aria-hidden="true"><span /><span /><span /><span /></div>

        <svg className="reticle" viewBox="0 0 400 400" aria-hidden="true">
          <circle cx="200" cy="200" r="190" />
          <circle cx="200" cy="200" r="150" strokeDasharray="2 8" />
          <path d="M200 0v26M200 374v26M0 200h26M374 200h26" />
        </svg>

        <div className="cap cap--a">
          <span className="mono eyebrow">I &mdash; Approach</span>
          <h2 className="display">Closer.</h2>
          <p>The camera moves in on the case. Every surface you see is geometry from the model file, lit like a bench inspection.</p>
        </div>
        <div className="cap cap--b">
          <span className="mono eyebrow">II &mdash; Rotation</span>
          <h2 className="display">Turn it <em>over.</em></h2>
          <p>The watch rotates to show its profile: thickness, proportions and the way each part sits against the next.</p>
        </div>
        <div className="cap cap--c">
          <span className="mono eyebrow">III &mdash; Construction</span>
          <h2 className="display">Now, take it <em>apart.</em></h2>
          <p>Keep scrolling. The parts separate along the axis of the watch face, and come back together as you leave.</p>
        </div>
      </div>
    </section>
  )
}
