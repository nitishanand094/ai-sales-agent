const FILE = 'sales-agent-data.json'
const EMPTY = { history: [], savedClients: [] }

export async function fetchGist(gistId, pat) {
  const headers = { Accept: 'application/vnd.github+json' }
  if (pat) headers.Authorization = `token ${pat}`
  const res = await fetch(`https://api.github.com/gists/${gistId}`, { headers })
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${res.statusText}`)
  const json = await res.json()
  const raw = json.files?.[FILE]?.content
  if (!raw) throw new Error(`File "${FILE}" not found in the Gist. Make sure you created it with that exact filename.`)
  try { return JSON.parse(raw) } catch { return EMPTY }
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
