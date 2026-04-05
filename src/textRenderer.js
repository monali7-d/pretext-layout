import { prepareWithSegments, layoutNextLine, layoutWithLines } from '@chenglou/pretext'

export function renderTextToCanvas(text, {
  font = '18px "Georgia", serif',
  color = '#e0d6c8',
  lineHeight = 28,
  maxWidth = 500,
  padding = 30,
  whiteSpace = 'normal',
  glowColor = null,
  glowBlur = 0,
} = {}) {
  const prepared = prepareWithSegments(text, font, { whiteSpace })
  const result = layoutWithLines(prepared, maxWidth, lineHeight)
  const lines = result.lines

  const canvasWidth = maxWidth + padding * 2
  const canvasHeight = lines.length * lineHeight + padding * 2

  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth * 2
  canvas.height = canvasHeight * 2
  const ctx = canvas.getContext('2d')
  ctx.scale(2, 2)

  ctx.textBaseline = 'top'

  // Glow pass
  if (glowColor && glowBlur > 0) {
    ctx.font = font
    ctx.fillStyle = glowColor
    ctx.shadowColor = glowColor
    ctx.shadowBlur = glowBlur
    lines.forEach((line, i) => {
      ctx.fillText(line.text, padding, padding + i * lineHeight)
    })
    ctx.shadowBlur = 0
  }

  // Main text pass
  ctx.font = font
  ctx.fillStyle = color
  lines.forEach((line, i) => {
    ctx.fillText(line.text, padding, padding + i * lineHeight)
  })

  return { canvas, width: canvasWidth, height: canvasHeight, lineCount: lines.length }
}

export function renderDropCapToCanvas(text, {
  bodyFont = '16px "Georgia", serif',
  dropCapFont = 'bold 72px "Georgia", serif',
  color = '#e0d6c8',
  accentColor = '#c4956a',
  lineHeight = 24,
  maxWidth = 460,
  padding = 30,
  glowColor = null,
  glowBlur = 0,
} = {}) {
  const firstChar = text[0]
  const restText = text.slice(1)

  const measureCanvas = document.createElement('canvas')
  const measureCtx = measureCanvas.getContext('2d')
  measureCtx.font = dropCapFont
  const dropCapMetrics = measureCtx.measureText(firstChar)
  const dropCapWidth = dropCapMetrics.width + 12

  const prepared = prepareWithSegments(restText, bodyFont)
  const lines = []
  let cursor = { segmentIndex: 0, graphemeIndex: 0 }
  let lineIndex = 0

  while (true) {
    const isDropCapLine = lineIndex < 3
    const currentMaxWidth = isDropCapLine ? maxWidth - dropCapWidth : maxWidth
    const line = layoutNextLine(prepared, cursor, currentMaxWidth)
    if (line === null) break
    lines.push({ ...line, indented: isDropCapLine })
    cursor = line.end
    lineIndex++
  }

  const canvasWidth = maxWidth + padding * 2
  const canvasHeight = lines.length * lineHeight + padding * 2 + 10

  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth * 2
  canvas.height = canvasHeight * 2
  const ctx = canvas.getContext('2d')
  ctx.scale(2, 2)
  ctx.textBaseline = 'top'

  // Drop cap glow
  if (glowColor && glowBlur > 0) {
    ctx.font = dropCapFont
    ctx.fillStyle = glowColor
    ctx.shadowColor = glowColor
    ctx.shadowBlur = glowBlur * 2
    ctx.fillText(firstChar, padding, padding)
    ctx.shadowBlur = 0
  }

  // Drop cap
  ctx.font = dropCapFont
  ctx.fillStyle = accentColor
  ctx.fillText(firstChar, padding, padding)

  // Body text glow
  if (glowColor && glowBlur > 0) {
    ctx.font = bodyFont
    ctx.fillStyle = glowColor
    ctx.shadowColor = glowColor
    ctx.shadowBlur = glowBlur
    lines.forEach((line, i) => {
      const x = line.indented ? padding + dropCapWidth : padding
      ctx.fillText(line.text, x, padding + i * lineHeight)
    })
    ctx.shadowBlur = 0
  }

  // Body text
  ctx.font = bodyFont
  ctx.fillStyle = color
  lines.forEach((line, i) => {
    const x = line.indented ? padding + dropCapWidth : padding
    ctx.fillText(line.text, x, padding + i * lineHeight)
  })

  return { canvas, width: canvasWidth, height: canvasHeight }
}

export function renderColumnsToCanvas(text, {
  font = '14px "Georgia", serif',
  color = '#d4c9b8',
  lineHeight = 22,
  columnWidth = 260,
  columnGap = 30,
  columns = 2,
  padding = 30,
  glowColor = null,
  glowBlur = 0,
  dividerColor = 'rgba(200, 160, 100, 0.2)',
} = {}) {
  const prepared = prepareWithSegments(text, font)

  const allLines = []
  let cursor = { segmentIndex: 0, graphemeIndex: 0 }
  while (true) {
    const line = layoutNextLine(prepared, cursor, columnWidth)
    if (line === null) break
    allLines.push(line)
    cursor = line.end
  }

  const linesPerColumn = Math.ceil(allLines.length / columns)
  const totalWidth = columns * columnWidth + (columns - 1) * columnGap + padding * 2
  const totalHeight = linesPerColumn * lineHeight + padding * 2

  const canvas = document.createElement('canvas')
  canvas.width = totalWidth * 2
  canvas.height = totalHeight * 2
  const ctx = canvas.getContext('2d')
  ctx.scale(2, 2)
  ctx.textBaseline = 'top'

  // Glow pass
  if (glowColor && glowBlur > 0) {
    ctx.font = font
    ctx.fillStyle = glowColor
    ctx.shadowColor = glowColor
    ctx.shadowBlur = glowBlur
    allLines.forEach((line, i) => {
      const col = Math.floor(i / linesPerColumn)
      const row = i % linesPerColumn
      ctx.fillText(line.text, padding + col * (columnWidth + columnGap), padding + row * lineHeight)
    })
    ctx.shadowBlur = 0
  }

  // Main text
  ctx.font = font
  ctx.fillStyle = color
  allLines.forEach((line, i) => {
    const col = Math.floor(i / linesPerColumn)
    const row = i % linesPerColumn
    ctx.fillText(line.text, padding + col * (columnWidth + columnGap), padding + row * lineHeight)
  })

  // Column dividers with glow
  for (let c = 1; c < columns; c++) {
    const x = padding + c * columnWidth + (c - 0.5) * columnGap
    ctx.strokeStyle = dividerColor
    ctx.lineWidth = 1
    ctx.shadowColor = glowColor || dividerColor
    ctx.shadowBlur = 4
    ctx.beginPath()
    ctx.moveTo(x, padding)
    ctx.lineTo(x, totalHeight - padding)
    ctx.stroke()
    ctx.shadowBlur = 0
  }

  return { canvas, width: totalWidth, height: totalHeight }
}

export function renderHeadlineToCanvas(text, {
  font = 'bold 36px "Georgia", serif',
  color = '#ff8844',
  maxWidth = 600,
  lineHeight = 48,
  padding = 20,
  glowColor = '#ff6622',
  glowBlur = 15,
} = {}) {
  const prepared = prepareWithSegments(text, font)
  const result = layoutWithLines(prepared, maxWidth, lineHeight)
  const lines = result.lines

  const canvasWidth = maxWidth + padding * 2
  const canvasHeight = lines.length * lineHeight + padding * 2

  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth * 2
  canvas.height = canvasHeight * 2
  const ctx = canvas.getContext('2d')
  ctx.scale(2, 2)
  ctx.textBaseline = 'top'

  // Heavy glow pass
  ctx.font = font
  ctx.fillStyle = glowColor
  ctx.shadowColor = glowColor
  ctx.shadowBlur = glowBlur
  for (let pass = 0; pass < 3; pass++) {
    lines.forEach((line, i) => {
      ctx.fillText(line.text, padding, padding + i * lineHeight)
    })
  }
  ctx.shadowBlur = 0

  // Crisp text on top
  ctx.fillStyle = color
  lines.forEach((line, i) => {
    ctx.fillText(line.text, padding, padding + i * lineHeight)
  })

  return { canvas, width: canvasWidth, height: canvasHeight }
}
