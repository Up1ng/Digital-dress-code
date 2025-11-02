<template>
  <div class="preview-shell">
    <div class="preview">
      <div v-if="error" class="status status-error">{{ error }}</div>
      <div v-else-if="!ready" class="status">Загружается модель виртуального фона…</div>

      <canvas
          v-show="ready"
          ref="outputCanvas"
          class="output"
          aria-label="Видео с заменой фона"
      ></canvas>

      <div v-if="ready" class="fps-indicator" aria-live="polite">
        {{ fpsLabel }}
      </div>

      <video ref="videoEl" class="hidden-video" playsinline muted></video>
    </div>

  </div>
</template>

<script setup>
import {computed, onBeforeUnmount, onMounted, ref, watch} from 'vue'

const props = defineProps({
  modelUrl: {type: String, required: true},
  backgroundUrl: {type: String, required: true},
  active: {type: Boolean, default: false},
  adjustLighting: {type: Boolean, default: false},
  lightingCoeff: {type: Number, default: 1.5}, // 1.0 = как сейчас; 2–3 = намного сильнее
  bgBrightness: {type: Number, default: 1.0}
})

const videoEl = ref(null)
const outputCanvas = ref(null)
const ready = ref(false)
const error = ref('')
const fps = ref(0)

let segmenter = null
let resolver = null
let animId = null
let videoStream = null
let outCtx = null
let running = false
let lastFrameTime = 0

const fpsLabel = computed(() => {
  const current = fps.value
  if (!current || !Number.isFinite(current)) {
    return 'FPS: —'
  }
  return `FPS: ${current.toFixed(1)}`
})

// фон: поддержка URL-изображения и HEX-цвета
let bgImage = null
let bgReady = false

const isHexColor = (v) => typeof v === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)
const normalizedBackground = computed(() => props.backgroundUrl || '')

watch(
    normalizedBackground,
    (v) => {
      bgReady = false
      bgImage = null
      if (!v) {
        bgReady = true;
        return
      }
      if (isHexColor(v)) {
        bgReady = true;
        return
      }
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        bgImage = img;
        bgReady = true;
        error.value = ''
      }
      img.onerror = () => {
        bgReady = true;
        error.value = 'Не удалось загрузить фон'
      }
      img.src = v
    },
    {immediate: true}
)

function hexToRgb(hex) {
  const v = hex.replace('#', '')
  const h = v.length === 3 ? v.split('').map(c => c + c).join('') : v
  const n = parseInt(h, 16)
  return {r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255}
}

async function initCamera() {
  const video = videoEl.value
  if (!video) return

  // Перезапустим камеру, если что-то осталось
  if (videoStream) {
    try {
      video.pause()
    } catch {
    }
    try {
      video.srcObject = null
    } catch {
    }
    try {
      videoStream.getTracks().forEach(t => t.stop())
    } catch {
    }
    videoStream = null
  }

  video.muted = true
  video.playsInline = true
  video.setAttribute('playsinline', '')
  video.setAttribute('muted', '')

  // Можно убрать ограничения — пусть берёт дефолтное разрешение устройства
  videoStream = await navigator.mediaDevices.getUserMedia({video: true, audio: false})
  video.srcObject = videoStream

  await new Promise((resolve) => {
    const onReady = () => {
      video.removeEventListener('loadedmetadata', onReady)
      resolve()
    }
    if (video.readyState >= video.HAVE_METADATA) resolve()
    else video.addEventListener('loadedmetadata', onReady, {once: true})
  })

  // Воспроизведение
  try {
    await video.play()
  } catch (e) {
    await new Promise(r => setTimeout(r, 0))
    await video.play()
  }
}

// Добавь рядом с другими константами/функциями:
const FALLBACK_TFLITE =
    'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite'

function isTfliteUrl(u) {
  if (!u || typeof u !== 'string') return false
  // допускаем querystring, но путь должен оканчиваться на .tflite
  try {
    const url = new URL(u, window.location.href)
    return url.pathname.toLowerCase().endsWith('.tflite')
  } catch {
    return u.toLowerCase().endsWith('.tflite')
  }
}

async function initMediaPipe() {
  const vision = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14')
  const mp = vision || window.mediapipe?.tasksVision
  if (!mp) throw new Error('Не удалось инициализировать MediaPipe Tasks')

  // проверим URL модели
  let modelPath = props.modelUrl
  if (!isTfliteUrl(modelPath)) {
    console.warn('[VideoMatting] modelUrl не похож на .tflite, используем fallback', modelPath)
    modelPath = FALLBACK_TFLITE
  }

  // (необязательно) быстрая проверка HEAD — поможет поймать 404/HTML до MediaPipe
  try {
    const head = await fetch(modelPath, {method: 'HEAD'})
    if (!head.ok) throw new Error(`HTTP ${head.status}`)
    const ct = head.headers.get('content-type') || ''
    if (!ct.includes('application/octet-stream') && !ct.includes('application/x-tflite')) {
      // не все CDN ставят корректный content-type — просто предупредим
      console.warn('[VideoMatting] content-type необычный:', ct)
    }
  } catch (e) {
    console.warn('[VideoMatting] HEAD на модель не удался, пробуем fallback:', e)
    modelPath = FALLBACK_TFLITE
  }

  const resolver = await mp.FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
  )

  try {
    segmenter = await mp.ImageSegmenter.createFromOptions(resolver, {
      baseOptions: {
        modelAssetPath: modelPath, // обязательно .tflite
        delegate: 'GPU'
      },
      runningMode: 'VIDEO',
      outputCategoryMask: true
    })
  } catch (e) {
    // последняя попытка — если вдруг модель из props битая, попробуем fallback
    if (modelPath !== FALLBACK_TFLITE) {
      console.warn('[VideoMatting] первичная инициализация не удалась, пробуем fallback:', e)
      segmenter = await mp.ImageSegmenter.createFromOptions(resolver, {
        baseOptions: {
          modelAssetPath: FALLBACK_TFLITE,
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        outputCategoryMask: true
      })
    } else {
      throw new Error(
          'Модель не прошла валидацию как FlatBuffer (.tflite). ' +
          'Укажи корректный .tflite или оставь пустым и используй встроенный fallback.'
      )
    }
  }
}


function setupCanvasToVideoSize() {
  const video = videoEl.value
  const canvas = outputCanvas.value
  if (!video || !canvas) return
  const w = video.videoWidth || 640
  const h = video.videoHeight || 480
  canvas.width = w
  canvas.height = h
  outCtx = canvas.getContext('2d')
}

function luma(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function clamp255(value) {
  return Math.max(0, Math.min(255, value))
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}

const FPS_SMOOTHING = 0.12

function updateFps() {
  const now = performance.now()
  if (lastFrameTime) {
    const delta = now - lastFrameTime
    if (delta > 0) {
      const instant = 1000 / delta
      const smoothing = FPS_SMOOTHING
      if (fps.value > 0) {
        fps.value += (instant - fps.value) * smoothing
      } else {
        fps.value = instant
      }
    }
  }
  lastFrameTime = now
}

function resetFps() {
  lastFrameTime = 0
  fps.value = 0
}


function blendFrameWithBackground(video, mask) {
  const canvas = outputCanvas.value
  if (!canvas || !outCtx) return
  const w = canvas.width
  const h = canvas.height

  // Рисуем фон (картинка или цвет)
  const bg = normalizedBackground.value
  if (bgImage && bgReady) {
    outCtx.drawImage(bgImage, 0, 0, w, h)
  } else if (isHexColor(bg)) {
    const {r, g, b} = hexToRgb(bg)
    outCtx.fillStyle = `rgb(${r},${g},${b})`
    outCtx.fillRect(0, 0, w, h)
  } else {
    // дефолтный фон — тёмный
    outCtx.fillStyle = '#1e1e1e'
    outCtx.fillRect(0, 0, w, h)
  }

  // Сверху — текущее видео
  outCtx.drawImage(video, 0, 0, w, h)

  // Достаём пиксели и маску
  const frame = outCtx.getImageData(0, 0, w, h)
  const data = frame.data
  const maskU8 = mask.getAsUint8Array()

  // Где mask == 0 (background) — оставляем фон, а видео пиксель заменяем фоном.
  // Мы уже нарисовали фон и поверх — видео. Значит нам нужно "стереть" видео там, где фон.
  // Сделаем это, заменив цвет на фон. Чтобы не читать фон второй раз — отрисуем в два прохода:
  // 1) Сохраним фон отдельно
  // Для простоты — перечитаем фон в буфер и будем смешивать по месту.
  // Но мы уже перерисовали видео поверх — поэтому лучше инвертировать порядок:
  //   Сначала рисуем видео в буфер, потом по маске заменяем пиксели на фон.
  // Перерисуем правильно:

  // Перерисуем: сначала фон
  if (bgImage && bgReady) {
    outCtx.drawImage(bgImage, 0, 0, w, h)
  } else if (isHexColor(bg)) {
    const {r, g, b} = hexToRgb(bg)
    outCtx.fillStyle = `rgb(${r},${g},${b})`
    outCtx.fillRect(0, 0, w, h)
  } else {
    outCtx.fillStyle = '#1e1e1e'
    outCtx.fillRect(0, 0, w, h)
  }
  const bgImageData = outCtx.getImageData(0, 0, w, h)
  const bgData = bgImageData.data

  // Теперь положим сверху видео в буфер frame ещё раз
  outCtx.drawImage(video, 0, 0, w, h)
  const videoImageData = outCtx.getImageData(0, 0, w, h)
  const vd = videoImageData.data

  let lightingScale = 1

  if (props.adjustLighting) {
    let subjectSum = 0, subjectCount = 0
    let backgroundSum = 0, backgroundCount = 0

    for (let i = 0, p = 0; p < maskU8.length; i += 4, p++) {
      if (maskU8[p] === 0) {
        backgroundSum += luma(bgData[i], bgData[i + 1], bgData[i + 2])
        backgroundCount++
      } else {
        subjectSum += luma(vd[i], vd[i + 1], vd[i + 2])
        subjectCount++
      }
    }

    if (subjectCount > 0 && backgroundCount > 0) {
      const subjectAvg = subjectSum / subjectCount
      const backgroundAvg = backgroundSum / backgroundCount
      if (backgroundAvg > 0) {
        const ratio = subjectAvg / backgroundAvg
        if (Number.isFinite(ratio) && ratio > 0) {
          const amplified = 1 + (ratio - 1) * (props.lightingCoeff ?? 1)
          lightingScale = clamp(amplified, 0.2, 2.5)
        }
      }
    }
  }

  const totalScale = clamp((props.bgBrightness ?? 1) * lightingScale, 0.1, 3.0)


  // Собираем итог: если mask==0 => фон, иначе — видео
  for (let i = 0, p = 0; p < maskU8.length; i += 4, p++) {
    if (maskU8[p] === 0) {
      // фон
      const scaledR = bgData[i] * totalScale
      const scaledG = bgData[i + 1] * totalScale
      const scaledB = bgData[i + 2] * totalScale
      vd[i] = clamp255(scaledR)
      vd[i + 1] = clamp255(scaledG)
      vd[i + 2] = clamp255(scaledB)
      vd[i + 3] = 255
    } else {
      // видео оставляем как есть
      // (vd уже содержит пиксели видео)
    }
  }
  outCtx.putImageData(videoImageData, 0, 0)
}

function renderLoop() {
  if (!running) return
  const video = videoEl.value
  if (!video) {
    animId = requestAnimationFrame(renderLoop);
    return
  }

  const ts = performance.now()
  segmenter.segmentForVideo(video, ts, (result) => {
    if (result?.categoryMask) {
      blendFrameWithBackground(video, result.categoryMask)
      updateFps()
    }
  })
  animId = requestAnimationFrame(renderLoop)
}

async function start() {
  if (running) return
  error.value = ''
  try {
    await initCamera()
    await initMediaPipe()
    setupCanvasToVideoSize()
    // Если фон — картинка, дождёмся загрузки (если уже не готово)
    if (!bgReady && normalizedBackground.value && !isHexColor(normalizedBackground.value)) {
      await new Promise((resolve) => {
        const check = () => (bgReady ? resolve() : requestAnimationFrame(check))
        check()
      })
    }
    ready.value = true
    resetFps()
    running = true
    renderLoop()
  } catch (e) {
    error.value = 'Ошибка инициализации: ' + (e?.message || e)
    stop()
  }
}

function stop() {
  resetFps()
  running = false
  ready.value = false
  if (animId) {
    cancelAnimationFrame(animId);
    animId = null
  }
  if (videoStream) {
    try {
      videoStream.getTracks().forEach(t => t.stop())
    } catch {
    }
    videoStream = null
  }
}

watch(() => props.active, (v) => (v ? start() : stop()), {immediate: true})

onMounted(() => {
  if (props.active) start()
})
onBeforeUnmount(() => {
  stop()
})
</script>

<style scoped>
.preview-shell {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.preview {
  position: relative;
  width: 100%;
  min-height: 360px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.1);
  border-radius: var(--radius-lg, 18px);
  overflow: hidden;
}

.output {
  width: 100%;
  height: auto;
  display: block;
}

.hidden-video {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.status {
  padding: 1.5rem;
  text-align: center;
  font-size: 0.95rem;
  color: var(--color-text-secondary, #4f6379);
}

.status-error {
  color: #ff4d4f;
}

.fps-indicator {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.65);
  color: #f8fafc;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  pointer-events: none;
}

</style>
