const FILE = 'sales-agent-data.json'
const EMPTY = { history: [], savedClients: [] }

export async function fetchGist(gistId, pat) {
  const headers = { Accept: 'application/vnd.github+json' }
  if (pat) headers.Authorization = `token ${pat}`
  const res = await fetch(`https://api.github.com/gists/${gistId}`, { headers })
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${res.statusText}`)
  const json = await res.json()

  // Try exact filename first, then any .json file in the Gist
  const fileEntry = json.files?.[FILE]
    || Object.values(json.files || {}).find(f => f.filename?.endsWith('.json'))

  if (!fileEntry?.content) return EMPTY   // no file yet — first-time setup, start empty
  try { return JSON.parse(fileEntry.content) } catch { return EMPTY }
}

export async function patchGist(gistId, pat, data) {
  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `token ${pat}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json',
    },
    body: JSON.stringify({ files: { [FILE]: { content: JSON.stringify(data, null, 2) } } }),
  })
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${res.statusText}`)
}
