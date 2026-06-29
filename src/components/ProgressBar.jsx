export default function ProgressBar({ value, max = 100, color = '#16A34A' }) {
  return (
    <div className="pbar-track">
      <div className="pbar-fill" style={{ width: Math.round((value / max) * 100) + '%', background: color }} />
    </div>
  )
}
