const PRIVACY_ORDER = ['low', 'medium', 'high']

function isLeaf(node) {
  return node && typeof node === 'object' && 'value' in node && 'privacy_level' in node
}

export function filterByPrivacy(data, targetLevel) {
  if (Array.isArray(data)) {
    return data
      .map((item) => filterByPrivacy(item, targetLevel))
      .filter((item) => item !== undefined)
  }

  if (isLeaf(data)) {
    const allowedIndex = PRIVACY_ORDER.indexOf(targetLevel)
    const nodeIndex = PRIVACY_ORDER.indexOf(data.privacy_level || 'low')
    if (nodeIndex <= allowedIndex || nodeIndex === -1) {
      return { ...data }
    }
    return undefined
  }

  if (data && typeof data === 'object') {
    const result = {}
    Object.entries(data).forEach(([key, value]) => {
      const filteredValue = filterByPrivacy(value, targetLevel)
      if (filteredValue !== undefined) {
        result[key] = filteredValue
      }
    })
    return Object.keys(result).length > 0 ? result : undefined
  }

  return data
}

export function resolvePath(object, path) {
  if (!path) return undefined
  const cleanedPath = path.replace(/^{{|}}$/g, '').trim()
  const segments = cleanedPath.split('.')
  return segments.reduce((acc, segment) => (acc ? acc[segment] : undefined), object)
}
