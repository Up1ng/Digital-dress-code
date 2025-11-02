<template>
  <div ref="container" class="stage-container">
    <v-stage ref="stageRef" :config="stageConfig" :style="stageStyle">
      <v-layer ref="layerRef">
        <template v-for="element in elements" :key="element.id">
          <v-text
              v-if="element.type === 'text'"
              :config="getTextConfig(element)"
              @mousedown="() => selectElement(element.id)"
              @dragend="(evt) => handleDragEnd(evt, element)"
              @transformend="(evt) => handleTransformEnd(evt, element)"
          />
          <v-rect
              v-else-if="element.type === 'image'"
              :config="getImageConfig(element)"
              @mousedown="() => selectElement(element.id)"
              @dragend="(evt) => handleDragEnd(evt, element)"
              @transformend="(evt) => handleTransformEnd(evt, element)"
          />
        </template>
        <v-transformer ref="transformerRef" :config="transformerConfig" />
      </v-layer>
    </v-stage>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

const props = defineProps({
  elements: {
    type: Array,
    default: () => []
  },
  stageWidth: {
    type: Number,
    default: 1920
  },
  stageHeight: {
    type: Number,
    default: 1080
  },
  selectedId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update-element', 'select'])

const container = ref(null)
const stageRef = ref(null)
const layerRef = ref(null)
const transformerRef = ref(null)
const scale = ref(1)
const imageCache = reactive(new Map())
let resizeObserver

const stageConfig = computed(() => ({
  width: props.stageWidth,
  height: props.stageHeight,
  draggable: false,
  scaleX: scale.value,
  scaleY: scale.value
}))

const stageStyle = computed(() => ({
  width: `${props.stageWidth * scale.value}px`,
  height: `${props.stageHeight * scale.value}px`
}))

const transformerConfig = {
  rotateEnabled: true,
  enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right']
}

function selectElement(id) {
  emit('select', id)
}

function handleDragEnd(evt, element) {
  const node = evt.target
  emit('update-element', {
    id: element.id,
    changes: {
      x: node.x(),
      y: node.y()
    }
  })
}

function handleTransformEnd(evt, element) {
  const node = evt.target
  const scaleX = node.scaleX()
  const scaleY = node.scaleY()

  const newAttrs = {
    x: node.x(),
    y: node.y(),
    rotation: node.rotation()
  }

  if (element.type === 'text' || element.type === 'image') {
    const width = Math.max(20, node.width() * scaleX)
    const height = Math.max(20, node.height() * scaleY)

    node.width(width)
    node.height(height)

    newAttrs.width = width
    newAttrs.height = height
  }

  node.scaleX(1)
  node.scaleY(1)

  emit('update-element', {
    id: element.id,
    changes: newAttrs
  })
}

function updateTransformer() {
  const transformerNode = transformerRef.value?.getNode()
  const stageNode = stageRef.value?.getNode()
  if (!transformerNode || !stageNode) return
  if (!props.selectedId) {
    transformerNode.nodes([])
    transformerNode.getLayer()?.batchDraw()
    return
  }
  const shape = stageNode.findOne(`#${props.selectedId}`)
  if (shape) {
    transformerNode.nodes([shape])
    transformerNode.getLayer()?.batchDraw()
  }
}

function getTextConfig(element) {
  return {
    id: element.id,
    draggable: true,
    ...element
  }
}

function getImageConfig(element) {
  return {
    id: element.id,
    draggable: true,
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
    rotation: element.rotation,
    fill: 'rgba(255, 255, 255, 0.1)',
    stroke: '#0094ff',
    strokeWidth: 2,
    dash: [5, 5],
    cornerRadius: 4
  }
}

function recalcScale() {
  if (!container.value) return
  const { width } = container.value.getBoundingClientRect()
  const stageWidth = props.stageWidth
  if (!stageWidth) return
  const nextScale = width / stageWidth
  scale.value = Math.min(nextScale, 1)
}

onMounted(() => {
  recalcScale()
  resizeObserver = new ResizeObserver(recalcScale)
  if (container.value) {
    resizeObserver.observe(container.value)
  }
})

onBeforeUnmount(() => {
  if (resizeObserver && container.value) {
    resizeObserver.unobserve(container.value)
  }
})

watch(
    () => props.selectedId,
    () => {
      setTimeout(updateTransformer)
    }
)

watch(
    () => props.elements.map((el) => `${el.id}-${el.src}`),
    () => {
      imageCache.clear()
    }
)
</script>

<style scoped>
.stage-container {
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, rgba(230, 245, 255, 0.6) 0%, rgba(255, 255, 255, 0.9) 100%);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(0, 148, 255, 0.2);
  overflow: hidden;
}
</style>
