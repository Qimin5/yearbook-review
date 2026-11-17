import type { CollectionSchema } from 'deepspace/schema'

export const submissionsSchema: CollectionSchema = {
  name: 'submissions',
  columns: [
    {
      name: 'photoKey',
      storage: 'text',
      interpretation: 'plain',
      required: true,
    },
    {
      name: 'caption',
      storage: 'text',
      interpretation: 'plain',
      required: true,
    },
    {
      name: 'status',
      storage: 'text',
      interpretation: {
        kind: 'select',
        options: ['pending', 'approved', 'needs_revision'],
      },
      default: 'pending',
    },
    {
      name: 'feedback',
      storage: 'text',
      interpretation: 'plain',
      default: '',
    },
  ],
  permissions: {
    '*': { read: false, create: false, update: false, delete: false },
    viewer: { read: false, create: false, update: false, delete: false },
    member: {
      read: 'own',
      create: true,
      update: false,
      delete: false,
      writableFields: ['photoKey', 'caption'],
    },
    admin: { read: true, create: true, update: true, delete: false },
  },
}