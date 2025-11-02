import { defineStore } from 'pinia'
import { db } from '../services/database'

export const useEnvironmentsStore = defineStore('environments', {
  state: () => ({
    environments: [],
    isLoaded: false
  }),
  getters: {
    getById: (state) => (id) => state.environments.find((environment) => environment.id === id)
  },
  actions: {
    async load() {
      if (this.isLoaded) return
      this.environments = await db.environments.toArray()
      this.isLoaded = true
    },
    async upsert(environment) {
      const index = this.environments.findIndex((item) => item.id === environment.id)
      if (index >= 0) {
        this.environments.splice(index, 1, { ...environment })
      } else {
        this.environments.push({ ...environment })
      }
      await db.environments.put(environment)
    },
    async remove(id) {
      this.environments = this.environments.filter((item) => item.id !== id)
      await db.environments.delete(id)
    },
    async importMany(items) {
      const normalized = items.map((item) => ({ ...item, id: item.id || crypto.randomUUID() }))
      normalized.forEach((item) => {
        const index = this.environments.findIndex((existing) => existing.id === item.id)
        if (index >= 0) {
          this.environments.splice(index, 1, item)
        } else {
          this.environments.push(item)
        }
      })
      await db.environments.bulkPut(normalized)
    }
  }
})
