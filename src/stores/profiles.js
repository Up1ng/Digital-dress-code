import { defineStore } from 'pinia'
import { db } from '../services/database'

export const useProfilesStore = defineStore('profiles', {
  state: () => ({
    profiles: [],
    isLoaded: false
  }),
  getters: {
    getById: (state) => (id) => state.profiles.find((profile) => profile.id === id)
  },
  actions: {
    async load() {
      if (this.isLoaded) return
      this.profiles = await db.profiles.toArray()
      this.isLoaded = true
    },
    async upsert(profile) {
      const index = this.profiles.findIndex((item) => item.id === profile.id)
      if (index >= 0) {
        this.profiles.splice(index, 1, { ...profile })
      } else {
        this.profiles.push({ ...profile })
      }
      await db.profiles.put(profile)
    },
    async remove(id) {
      this.profiles = this.profiles.filter((item) => item.id !== id)
      await db.profiles.delete(id)
    }
  }
})
