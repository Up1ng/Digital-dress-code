import Dexie from 'dexie'

class DressCodeDatabase extends Dexie {
  constructor() {
    super('digital-dress-code')
    this.version(1).stores({
      templates: 'id',
      environments: 'id',
      profiles: 'id'
    })
  }
}

export const db = new DressCodeDatabase()
