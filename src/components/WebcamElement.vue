<template>
  <div class="webcam-container">
    <video 
      ref="videoElement" 
      :width="width" 
      :height="height" 
      autoplay 
      playsinline
      :style="{
        transform: `rotate(${rotation}deg)`,
        borderRadius: '8px',
        objectFit: 'cover', /* ВАЖНО: заполняет весь контейнер */
        width: '100%',
        height: '100%'
      }"
    />
    <div v-if="!isCameraActive" class="webcam-fallback">
      <div class="fallback-content">
        <span class="fallback-icon">📷</span>
        <span class="fallback-text">Вебкамера</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  width: {
    type: Number,
    default: 320
  },
  height: {
    type: Number,
    default: 240
  },
  rotation: {
    type: Number,
    default: 0
  },
  cameraSource: {
    type: String,
    default: 'user'
  }
})

const videoElement = ref(null)
const isCameraActive = ref(false)
let stream = null

async function startCamera() {
  try {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }

    const constraints = {
      video: { 
        facingMode: props.cameraSource,
        width: { ideal: props.width },
        height: { ideal: props.height }
      }
    }

    stream = await navigator.mediaDevices.getUserMedia(constraints)
    
    if (videoElement.value) {
      videoElement.value.srcObject = stream
      isCameraActive.value = true
    }
  } catch (error) {
    console.error('Ошибка доступа к вебкамере:', error)
    isCameraActive.value = false
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
    stream = null
  }
  isCameraActive.value = false
}

onMounted(() => {
  startCamera()
})

onUnmounted(() => {
  stopCamera()
})

watch(() => props.cameraSource, () => {
  startCamera()
})

watch(() => [props.width, props.height], () => {
  if (isCameraActive.value) {
    startCamera()
  }
})

defineExpose({
  startCamera,
  stopCamera,
  captureFrame: () => {
    if (!videoElement.value || !isCameraActive.value) return null
    
    const canvas = document.createElement('canvas')
    canvas.width = props.width
    canvas.height = props.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(videoElement.value, 0, 0, props.width, props.height)
    
    return canvas.toDataURL('image/png')
  }
})
</script>

<style scoped>
.webcam-container {
  position: relative;
  display: inline-block;
  width: 100%;
  height: 100%;
}

.webcam-fallback {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #1e40af, #38bdf8);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.fallback-content {
  text-align: center;
}

.fallback-icon {
  font-size: 2rem;
  display: block;
  margin-bottom: 0.5rem;
}

.fallback-text {
  font-size: 0.9rem;
  font-weight: bold;
}

video {
  border-radius: 8px;
  background: transparent;
  width: 100%;
  height: 100%;
}
</style>