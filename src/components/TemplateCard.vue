<template>
  <Card class="entity-card">
    <template #title>
      <div class="card-header">
        <span>{{ template.name }}</span>
        <Tag v-if="template.width && template.height" :value="`${template.width}×${template.height}`" />
      </div>
    </template>
    <template #content>
      <p class="description">Элементов: {{ template.elements?.length || 0 }}</p>
    </template>
    <template #footer>
      <div class="card-footer">
        <div class="action-group primary">
          <Button icon="pi pi-pencil" label="Редактировать" text @click="() => emit('edit')" />
          <Button icon="pi pi-download" label="Экспорт" text @click="() => emit('export')" />
        </div>
        <div class="action-group secondary">
          <Button icon="pi pi-trash" label="Удалить" text severity="danger" @click="() => emit('delete')" />
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup>
import Button from 'primevue/button'
import Card from 'primevue/card'
import Tag from 'primevue/tag'

const props = defineProps({
  template: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['edit', 'export', 'delete'])
</script>

<style scoped>
.description {
  margin: 0;
}

.card-footer :deep(.p-button-text) {
  font-weight: 600;
}
</style>
