export default function Slider({ min, max, value, onChange, format, step = 1 }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="slider-wrap">
      <input type="range" className="range-input" min={min} max={max} step={step}
        value={value} style={{ '--val': pct + '%' }}
        onChange={e => onChange(Number(e.target.value))} />
      <div className="slider-ends">
        <span>{format ? format(min) : min}</span>
        <span>{format ? format(max) : max}</span>
      </div>
      <div className="slider-val">{format ? format(value) : value}</div>
    </div>
  )
}
