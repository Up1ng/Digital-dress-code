<template>
  <div class="properties-panel" v-if="element">
    <h3 class="panel-title">Свойства элемента</h3>
    <div class="field">
      <label for="x">X</label>
      <InputNumber id="x" :model-value="element.x" @update:model-value="(val) => update('x', val ?? 0)" />
    </div>
    <div class="field">
      <label for="y">Y</label>
      <InputNumber id="y" :model-value="element.y" @update:model-value="(val) => update('y', val ?? 0)" />
    </div>
    <div class="field" v-if="element.type === 'text' || element.type === 'image'">
      <label for="width">Ширина</label>
      <InputNumber id="width" :model-value="element.width" @update:model-value="(val) => update('width', val ?? 0)" />
    </div>
    <div class="field" v-if="element.type === 'text' || element.type === 'image'">
      <label for="height">Высота</label>
      <InputNumber id="height" :model-value="element.height" @update:model-value="(val) => update('height', val ?? 0)" />
    </div>
    <div class="field">
      <label for="rotation">Поворот</label>
      <InputNumber id="rotation" :model-value="element.rotation" @update:model-value="(val) => update('rotation', val ?? 0)" />
    </div>
    <template v-if="element.type === 'text'">
      <div class="field">
        <label for="text">Текст / плейсхолдер</label>
        <InputText id="text" :model-value="element.text" @update:model-value="(val) => update('text', val)" />
      </div>
      <div class="field">
        <label for="fontSize">Размер шрифта</label>
        <InputNumber id="fontSize" :model-value="element.fontSize" @update:model-value="(val) => update('fontSize', val ?? 16)" />
      </div>
      <div class="field">
        <label for="fontFamily">Шрифт</label>
        <InputText id="fontFamily" :model-value="element.fontFamily" @update:model-value="(val) => update('fontFamily', val)" />
      </div>
      <div class="field color-field">
        <label for="fill">Цвет</label>
        <div class="color-inputs">
          <ColorPicker
            id="fill"
            format="hex"
            :model-value="normalizeColor(element.fill)"
            @update:model-value="(val) => update('fill', formatColorValue(val))"
          />
          <InputText
            aria-label="HEX-значение цвета"
            :model-value="formatColorValue(element.fill)"
            @update:model-value="(val) => update('fill', formatColorValue(val))"
          />
        </div>
      </div>
    </template>
    <template v-else-if="element.type === 'image'">
      <div class="field">
        <label for="src">Источник изображения</label>
        <InputText id="src" :model-value="element.src" @update:model-value="(val) => update('src', val)" />
      </div>
    </template>
  </div>
  <div class="properties-panel placeholder" v-else>
    <p>Выберите элемент на холсте, чтобы редактировать его свойства.</p>
  </div>
</template>

<script setup>
import ColorPicker from 'primevue/colorpicker'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'

const props = defineProps({
  element: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update'])

function update(key, value) {
  emit('update', { key, value })
}

function normalizeColor(value) {
  if (typeof value !== 'string') return '1E1E1E'
  const sanitized = value.trim().replace(/^#/, '').replace(/[^0-9a-fA-F]/g, '').toUpperCase()
  return sanitized || '1E1E1E'
}

function formatColorValue(value) {
  if (typeof value !== 'string') {
    return '#1E1E1E'
  }
  const cleaned = value.trim().replace(/^#/, '').replace(/[^0-9a-fA-F]/g, '').toUpperCase()
  const hex = cleaned.slice(0, 6) || '1E1E1E'
  return `#${hex.toUpperCase()}`
}
</script>

<style scoped>
.properties-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0;
  color: var(--color-text);
}

.panel-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-secondary);
}

.color-inputs {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.color-inputs :deep(.p-colorpicker .p-colorpicker-preview) {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.08);
}

.color-inputs :deep(.p-inputtext) {
  flex: 1;
}

.color-inputs :deep(.p-colorpicker-panel) {
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-card);
}

.placeholder {
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 2.5rem 1.25rem;
  color: var(--color-text-secondary);
}

.placeholder p {
  max-width: 240px;
}

.properties-panel :deep(.p-inputtext),
.properties-panel :deep(.p-inputnumber-input) {
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  padding: 0.65rem 0.85rem;
}

.properties-panel :deep(.p-inputtext:focus),
.properties-panel :deep(.p-inputnumber-input:focus) {
  border-color: rgba(0, 148, 255, 0.6);
  box-shadow: 0 0 0 3px rgba(0, 148, 255, 0.15);
}

.properties-panel :deep(.p-inputnumber) {
  width: 100%;
}
</style>
