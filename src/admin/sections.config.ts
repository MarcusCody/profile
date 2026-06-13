export type FieldType = 'text' | 'textarea' | 'list'

export interface FieldDef {
  name: string
  label: string
  type: FieldType
}

export interface AdminSection {
  path: string
  title: string
  /** Field used as the row heading in the list. */
  titleField: string
  fields: FieldDef[]
}

export const adminSections: AdminSection[] = [
  {
    path: 'skill-groups',
    title: 'Skill Groups',
    titleField: 'title',
    fields: [
      { name: 'title', label: 'Group title', type: 'text' },
      { name: 'skills', label: 'Skills (one per line)', type: 'list' },
    ],
  },
  {
    path: 'experiences',
    title: 'Experience',
    titleField: 'company',
    fields: [
      { name: 'company', label: 'Company', type: 'text' },
      { name: 'role', label: 'Role', type: 'text' },
      { name: 'period', label: 'Period', type: 'text' },
      { name: 'location', label: 'Location', type: 'text' },
      { name: 'highlights', label: 'Highlights (one per line)', type: 'list' },
    ],
  },
  {
    path: 'projects',
    title: 'Projects',
    titleField: 'name',
    fields: [
      { name: 'name', label: 'Name', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'tags', label: 'Tags (one per line)', type: 'list' },
    ],
  },
  {
    path: 'education',
    title: 'Education',
    titleField: 'qualification',
    fields: [
      { name: 'institution', label: 'Institution', type: 'text' },
      { name: 'qualification', label: 'Qualification', type: 'text' },
      { name: 'period', label: 'Period', type: 'text' },
      { name: 'detail', label: 'Detail (optional)', type: 'text' },
    ],
  },
  {
    path: 'awards',
    title: 'Awards',
    titleField: 'title',
    fields: [
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'issuer', label: 'Issuer', type: 'text' },
      { name: 'date', label: 'Date', type: 'text' },
      { name: 'description', label: 'Description (optional)', type: 'textarea' },
    ],
  },
]

export const profileFields: FieldDef[] = [
  { name: 'name', label: 'Name', type: 'text' },
  { name: 'title', label: 'Title', type: 'text' },
  { name: 'location', label: 'Location', type: 'text' },
  { name: 'email', label: 'Email', type: 'text' },
  { name: 'phone', label: 'Phone', type: 'text' },
  { name: 'whatsapp', label: 'WhatsApp URL', type: 'text' },
  { name: 'linkedin', label: 'LinkedIn URL', type: 'text' },
  { name: 'github', label: 'GitHub URL', type: 'text' },
  { name: 'summary', label: 'Summary', type: 'textarea' },
]
