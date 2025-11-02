<template>
  <div class="page">
    <div class="page-header">
      <div class="header-left">
        <Button icon="pi pi-arrow-left" label="Назад" text @click="goBack" />
        <InputText v-model="localTemplate.name" placeholder="Название шаблона" class="name-input" />
      </div>
      <div class="header-right">
        <span class="resolution-badge" aria-label="Текущие размеры холста">
          <i class="pi pi-desktop" aria-hidden="true" />
          {{ resolutionLabel }}
        </span>
        <Button
          v-if="isCompactLayout"
          icon="pi pi-sliders-h"
          :label="showProperties ? 'Скрыть свойства' : 'Свойства'"
          text
          class="properties-toggle"
          @click="toggleProperties"
          :aria-expanded="showProperties"
        />
        <div class="header-actions">
          <Button icon="pi pi-save" label="Сохранить" severity="success" @click="saveTemplate" />
          <Button icon="pi pi-times" label="Отмена" text @click="goBack" />
          <Button icon="pi pi-download" label="Экспорт" text @click="exportTemplate" />
        </div>
      </div>
    </div>
    <div
      class="editor-body"
      :class="{
        'is-compact': isCompactLayout,
        'properties-open': showProperties
      }"
    >
      <aside class="toolbar">
        <h3>Элементы</h3>
        <Button icon="pi pi-font" label="Добавить текст" @click="addTextElement" />
        <Button icon="pi pi-image" label="Добавить изображение" @click="addImageElement" />
        <Button icon="pi pi-trash" label="Удалить элемент" severity="danger" text @click="removeSelected" :disabled="!selectedElement" />
      </aside>
      <section class="canvas">
        <div class="canvas-inner">
          <KonvaStage
            :elements="localTemplate.elements"
            :stage-width="localTemplate.width"
            :stage-height="localTemplate.height"
            :selected-id="selectedId"
            @select="onSelect"
            @update-element="onUpdateElement"
          />
        </div>
      </section>
      <aside
        class="properties"
        :class="{ 'is-floating': isCompactLayout, 'is-open': !isCompactLayout || showProperties }"
        :aria-hidden="isCompactLayout && !showProperties"
      >
        <Button
          v-if="isCompactLayout"
          icon="pi pi-times"
          text
          rounded
          class="properties-close"
          @click="toggleProperties"
          aria-label="Скрыть панель свойств"
        />
        <PropertiesPanel :element="selectedElement" @update="onUpdateProperty" />
      </aside>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { useTemplatesStore } from '../stores/templates'
import KonvaStage from '../components/KonvaStage.vue'
import PropertiesPanel from '../components/PropertiesPanel.vue'

const router = useRouter()
const route = useRoute()
const templatesStore = useTemplatesStore()

const templateId = route.params.id

const localTemplate = reactive({
  id: templateId || crypto.randomUUID(),
  name: 'Новый шаблон',
  width: 1280,
  height: 720,
  elements: []
})

if (templateId) {
  const stored = templatesStore.getById(templateId)
  if (stored) {
    Object.assign(localTemplate, JSON.parse(JSON.stringify(stored)))
  }
}

const selectedId = ref('')
const isCompactLayout = ref(false)
const showProperties = ref(true)

const resolutionLabel = computed(() => `${localTemplate.width} × ${localTemplate.height}`)

const selectedElement = computed(() =>
  localTemplate.elements.find((element) => element.id === selectedId.value)
)

function toggleProperties() {
  if (!isCompactLayout.value) return
  showProperties.value = !showProperties.value
}

function goBack() {
  router.push({ name: 'dashboard' })
}

function addTextElement() {
  localTemplate.elements.push({
    id: crypto.randomUUID(),
    type: 'text',
    x: 50,
    y: 50,
    width: 300,
    height: 100,
    rotation: 0,
    text: '{{employee.full_name.value}}',
    fontSize: 32,
    fontFamily: 'Arial',
    fill: '#1e1e1e'
  })
}

function addImageElement() {
  localTemplate.elements.push({
    id: crypto.randomUUID(),
    type: 'image',
    x: 100,
    y: 100,
    width: 300,
    height: 200,
    rotation: 0,
    src: '{{branding.logo_url.value}}'
  })
}

function removeSelected() {
  if (!selectedId.value) return
  const index = localTemplate.elements.findIndex((element) => element.id === selectedId.value)
  if (index >= 0) {
    localTemplate.elements.splice(index, 1)
    selectedId.value = ''
  }
}

function onSelect(id) {
  selectedId.value = id
}

function onUpdateElement(payload) {
  const element = localTemplate.elements.find((item) => item.id === payload.id)
  if (element) {
    Object.assign(element, payload.changes)
  }
}

function onUpdateProperty({ key, value }) {
  if (!selectedElement.value) return
  selectedElement.value[key] = value
}

function updateLayout() {
  const compact = window.innerWidth < 1280
  if (compact === isCompactLayout.value) return
  isCompactLayout.value = compact
  showProperties.value = compact ? false : true
}

async function saveTemplate() {
  await templatesStore.upsert(JSON.parse(JSON.stringify(localTemplate)))
  goBack()
}

function exportTemplate() {
  const data = JSON.stringify(localTemplate, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${localTemplate.name || 'template'}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

watch(
  () => [localTemplate.width, localTemplate.height],
  () => {
    selectedId.value = ''
  }
)

watch(selectedElement, (value) => {
  if (value && isCompactLayout.value) {
    showProperties.value = true
  }
})

onMounted(() => {
  updateLayout()
  window.addEventListener('resize', updateLayout)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateLayout)
})
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: clamp(1.5rem, 3vw, 2.75rem);
  padding: clamp(1.5rem, 3vw, 3rem);
  color: var(--color-text);
}

.page-header {
  display: flex;
  justify-content: space-between;
  gap: clamp(1rem, 2vw, 1.75rem);
  align-items: stretch;
  flex-wrap: wrap;
  background: var(--color-surface);
  border: 1px solid rgba(0, 148, 255, 0.2);
  border-radius: var(--radius-xl);
  padding: clamp(1.5rem, 2.5vw, 2.25rem);
  box-shadow: 0 32px 64px rgba(0, 148, 255, 0.12);
  position: relative;
  overflow: hidden;
}

.page-header::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 110% -10%, rgba(0, 148, 255, 0.14), transparent 60%);
  pointer-events: none;
}

.header-left {
  display: flex;
  gap: 0.85rem;
  align-items: center;
  position: relative;
  z-index: 1;
  flex-wrap: wrap;
}

.header-left :deep(.p-button) {
  flex-shrink: 0;
  white-space: nowrap;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  position: relative;
  z-index: 1;
}

.name-input {
  min-width: min(320px, 100%);
}

.resolution-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: var(--radius-pill);
  background: rgba(0, 148, 255, 0.1);
  color: var(--color-primary);
  border: 1px solid rgba(0, 148, 255, 0.3);
  font-weight: 600;
}

.resolution-badge i {
  font-size: 0.9rem;
}

.properties-toggle {
  margin-left: auto;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.header-actions :deep(.p-button-text) {
  color: var(--color-text-secondary);
}

.editor-body {
  display: grid;
  grid-template-columns: minmax(220px, 280px) minmax(0, 1fr) minmax(260px, 340px);
  gap: clamp(1.25rem, 2.5vw, 2rem);
  min-height: 70vh;
}

.editor-body.is-compact {
  grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
}

.toolbar,
.canvas,
.properties {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-card);
}

.toolbar {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: clamp(1.25rem, 2.5vw, 1.75rem);
  position: sticky;
  top: clamp(1.5rem, 2.5vw, 2rem);
  align-self: start;
}

.toolbar h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
}

.toolbar :deep(.p-button) {
  justify-content: flex-start;
  width: 100%;
}

.canvas {
  padding: clamp(1.25rem, 2.5vw, 2rem);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: relative;
  overflow: hidden;
}

.canvas-inner {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.canvas :deep(.stage-container) {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: clamp(0.75rem, 1.5vw, 1.25rem);
  border-radius: var(--radius-lg);
  background: linear-gradient(180deg, rgba(230, 245, 255, 0.8) 0%, rgba(255, 255, 255, 0.95) 100%);
  border: 1px solid rgba(0, 148, 255, 0.2);
  box-shadow: inset 0 0 0 1px rgba(0, 148, 255, 0.08);
}

.canvas :deep(canvas) {
  border-radius: var(--radius-md);
  box-shadow: 0 24px 48px rgba(0, 148, 255, 0.18);
}

.properties {
  min-width: 0;
  padding: clamp(1.25rem, 2vw, 1.75rem);
  max-height: calc(100vh - 6rem);
  overflow-y: auto;
  position: sticky;
  top: clamp(1.5rem, 2vw, 2rem);
}

.properties.is-floating {
  position: fixed;
  right: clamp(1rem, 4vw, 2.5rem);
  bottom: clamp(1rem, 4vw, 2.5rem);
  width: min(360px, 80vw);
  max-height: 80vh;
  z-index: 10;
}

.properties.is-floating:not(.is-open) {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translateY(20px);
}

.properties-close {
  align-self: flex-end;
}

@media (max-width: 1280px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }
}

@media (max-width: 960px) {
  .editor-body {
    gap: 1rem;
  }

  .toolbar {
    position: static;
  }

  .properties {
    position: static;
    max-height: none;
  }
}
</style>
