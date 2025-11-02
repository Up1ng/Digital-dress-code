import Konva from 'konva'
import { filterByPrivacy, resolvePath } from './privacy'

const DEFAULT_TEXT_STYLE = {
  fontSize: 24,
  fontFamily: 'Arial',
  fill: '#ffffff',
  align: 'left'
}

function hydrateElement(element, data) {
  const hydrated = { ...element }
  if (element.type === 'text') {
    const resolved = resolvePath(data, element.text)
    hydrated.text = resolved?.value ?? resolved ?? element.text ?? ''
  }
  if (element.type === 'image') {
    const resolved = resolvePath(data, element.src)
    hydrated.src = resolved?.value ?? resolved ?? element.src ?? ''
  }
  return hydrated
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    if (!url) {
      resolve(null)
      return
    }
    const image = new window.Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = url
  })
}

export async function generateImageFromProfile({
  template,
  environment,
  privacyLevel,
  background
}) {
  const filteredEnvironment = filterByPrivacy(environment.data, privacyLevel) || {}
  const stageContainer = document.createElement('div')
  stageContainer.style.position = 'fixed'
  stageContainer.style.opacity = '0'
  stageContainer.style.pointerEvents = 'none'
  stageContainer.style.left = '-10000px'
  document.body.appendChild(stageContainer)

  const stage = new Konva.Stage({
    container: stageContainer,
    width: template.width,
    height: template.height
  })

  const layer = new Konva.Layer()
  stage.add(layer)

  if (background?.mode === 'static' && background.src) {
    try {
      const bgImage = await loadImage(background.src)
      if (bgImage) {
        const backgroundNode = new Konva.Image({
          x: 0,
          y: 0,
          width: template.width,
          height: template.height,
          image: bgImage,
          listening: false
        })
        layer.add(backgroundNode)
      }
    } catch (error) {
      console.warn('Background image load failed', error)
    }
  }

  for (const element of template.elements || []) {
    const hydrated = hydrateElement(element, filteredEnvironment)
    if (hydrated.type === 'text') {
      const textNode = new Konva.Text({
        ...DEFAULT_TEXT_STYLE,
        ...hydrated,
        text: hydrated.text ?? ''
      })
      layer.add(textNode)
    } else if (hydrated.type === 'image') {
      try {
        const image = await loadImage(hydrated.src)
        if (image) {
          const imageNode = new Konva.Image({
            ...hydrated,
            image
          })
          layer.add(imageNode)
        }
      } catch (error) {
        console.error('Image load failed', error)
      }
    }
  }

  layer.draw()
  const dataUrl = stage.toDataURL({ pixelRatio: 1 })
  stage.destroy()
  document.body.removeChild(stageContainer)
  return dataUrl
}
