import type { CollectionSchema } from 'deepspace/schema'

export const submissionsSchema: CollectionSchema = {
  name: 'submissions',
  columns: [
    {
      name: 'reviewedBy',
      storage: 'text',
      interpretation: 'plain',
      default: '',
    },
    {
      name: 'reviewedAt',
      storage: 'text',
      interpretation: 'plain',
      default: '',
    },
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
      create: false,
      update: false,
      delete: false,
    },
    admin: { read: true, create: false, update: false, delete: false },
  },
}
