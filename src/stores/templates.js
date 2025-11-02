import { defineStore } from 'pinia'
import { db } from '../services/database'

export const useTemplatesStore = defineStore('templates', {
  state: () => ({
    templates: [],
    isLoaded: false
  }),
  getters: {
    getById: (state) => (id) => state.templates.find((template) => template.id === id)
  },
  actions: {
    async load() {
      if (this.isLoaded) return
      this.templates = await db.templates.toArray()
      this.isLoaded = true
    },
    async upsert(template) {
      const existingIndex = this.templates.findIndex((item) => item.id === template.id)
      if (existingIndex >= 0) {
        this.templates.splice(existingIndex, 1, { ...template })
      } else {
        this.templates.push({ ...template })
      }
      await db.templates.put(template)
    },
    async remove(id) {
      this.templates = this.templates.filter((item) => item.id !== id)
      await db.templates.delete(id)
    },
    async importMany(items) {
      const normalized = items.map((item) => ({ ...item, id: item.id || crypto.randomUUID() }))
      normalized.forEach((item) => {
        const index = this.templates.findIndex((existing) => existing.id === item.id)
        if (index >= 0) {
          this.templates.splice(index, 1, item)
        } else {
          this.templates.push(item)
        }
      })
      await db.templates.bulkPut(normalized)
    }
  }
})
