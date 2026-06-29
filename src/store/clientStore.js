// Derived analytics over the search history. Pure functions — the caller
// passes the history array (from the Redux `history` slice). The slice owns
// storage; these just compute dashboard numbers and insights from the data.

const DAY = 86400000

export function getDashboardStats(history = []) {
  const now = Date.now()
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0)

  const uniqueClients = new Set(
    history.map(e => (e.profile.name || '').trim().toLowerCase()).filter(Boolean)
  )

  const recsToday = history.filter(e => new Date(e.timestamp) >= startOfToday).length
  const recsThisWeek = history.filter(e => now - new Date(e.timestamp).getTime() <= 7 * DAY).length

  const scores = history.map(e => e.score || 0).filter(Boolean)
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

  const totalCoverAdvised = history.reduce((sum, e) => sum + (e.profile.sa || 0), 0)
  const protectionGaps = history.filter(e => e.profile.hasIns === 'No').length

  return {
    totalProfiles: history.length,
    uniqueClients: uniqueClients.size || history.length,
    recsToday,
    recsThisWeek,
    avgScore,
    totalCoverAdvised,
    protectionGaps,
    isEmpty: history.length === 0,
  }
}

export function getGoalDistribution(history = []) {
  const counts = {}
  history.forEach(e => {
    const g = e.profile.goal || 'Unspecified'
    counts[g] = (counts[g] || 0) + 1
  })
  return Object.entries(counts)
    .map(([goal, count]) => ({ goal, count }))
    .sort((a, b) => b.count - a.count)
}

export function getAIInsights(history = []) {
  if (history.length === 0) return []
  const stats = getDashboardStats(history)
  const dist = getGoalDistribution(history)
  const insights = []

  if (dist[0]) {
    insights.push({
      tag: 'Trend',
      text: `"${dist[0].goal}" is your most common client goal — ${dist[0].count} of ${stats.totalProfiles} profile${stats.totalProfiles > 1 ? 's' : ''}.`,
    })
  }
  if (stats.protectionGaps > 0) {
    insights.push({
      tag: 'Opportunity',
      text: `${stats.protectionGaps} client${stats.protectionGaps > 1 ? 's have' : ' has'} no existing life cover — a protection-first term plan is the natural next conversation.`,
    })
  }
  insights.push({
    tag: 'Confidence',
    text: `Average AI match confidence across your book is ${stats.avgScore}%${stats.avgScore >= 85 ? ' — strong product-fit alignment.' : '.'}`,
  })
  if (stats.totalCoverAdvised > 0) {
    insights.push({
      tag: 'Pipeline',
      text: `₹${(stats.totalCoverAdvised / 10000000).toFixed(2)} Cr of sum-assured cover advised across all profiles.`,
    })
  }
  return insights
}

export function getNextActions(history = []) {
  if (history.length === 0) return []
  const actions = []
  const now = Date.now()

  const gap = history.find(e => e.profile.hasIns === 'No')
  if (gap) actions.push(`Follow up with ${gap.profile.name || 'an unnamed client'} on a baseline term protection plan.`)

  const oldest = [...history].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))[0]
  const days = Math.floor((now - new Date(oldest.timestamp).getTime()) / DAY)
  if (days >= 1) actions.push(`Re-engage ${oldest.profile.name || 'your earliest profile'} — last profiled ${days} day${days > 1 ? 's' : ''} ago.`)

  const highValue = [...history].sort((a, b) => (b.profile.sa || 0) - (a.profile.sa || 0))[0]
  if (highValue && highValue.profile.sa >= 10000000) {
    actions.push(`Prioritise ${highValue.profile.name || 'a high-cover client'} — ₹${(highValue.profile.sa / 10000000).toFixed(1)} Cr cover requirement.`)
  }
  if (actions.length === 0) actions.push('Build another client profile to unlock more AI-driven recommendations.')
  return actions
}
