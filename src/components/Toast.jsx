export default function Toast({ msg, type }) {
  const icon = type==='success'?'✓':type==='info'?'ℹ':'◆'
  return (
    <div className={`toast${type?' '+type:''}`}>
      <span className="toast-icon">{icon}</span>
      <span>{msg}</span>
    </div>
  )
}
