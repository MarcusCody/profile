import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import type { AdminSection, FieldDef } from './sections.config'

type Item = Record<string, any> & { id: number }

function emptyForm(fields: FieldDef[]) {
  const f: Record<string, string> = {}
  for (const field of fields) f[field.name] = ''
  return f
}

function itemToForm(item: Item, fields: FieldDef[]) {
  const f: Record<string, string> = {}
  for (const field of fields) {
    const v = item[field.name]
    f[field.name] = field.type === 'list' ? (v ?? []).join('\n') : (v ?? '')
  }
  return f
}

function formToPayload(form: Record<string, string>, fields: FieldDef[]) {
  const payload: Record<string, unknown> = {}
  for (const field of fields) {
    payload[field.name] =
      field.type === 'list'
        ? form[field.name].split('\n').map((s) => s.trim()).filter(Boolean)
        : form[field.name]
  }
  return payload
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldDef
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{field.label}</Label>
      {field.type === 'text' ? (
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Textarea
          value={value}
          rows={field.type === 'list' ? 4 : 3}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  )
}

export default function SectionEditor({
  section,
  items,
  onChanged,
}: {
  section: AdminSection
  items: Item[]
  onChanged: () => void
}) {
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState<Record<string, string>>(emptyForm(section.fields))
  const [busy, setBusy] = useState(false)

  function startAdd() {
    setForm(emptyForm(section.fields))
    setEditingId('new')
  }

  function startEdit(item: Item) {
    setForm(itemToForm(item, section.fields))
    setEditingId(item.id)
  }

  async function save() {
    setBusy(true)
    try {
      const payload = formToPayload(form, section.fields)
      if (editingId === 'new') {
        await api.createItem(section.path, payload)
      } else if (typeof editingId === 'number') {
        await api.updateItem(section.path, editingId, payload)
      }
      setEditingId(null)
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: number) {
    if (!confirm('Delete this item?')) return
    setBusy(true)
    try {
      await api.deleteItem(section.path, id)
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{section.title}</CardTitle>
        <Button size="sm" onClick={startAdd} disabled={busy}>
          Add
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {editingId === 'new' && (
          <div className="flex flex-col gap-3 rounded-md border border-border p-4">
            {section.fields.map((f) => (
              <FieldInput
                key={f.name}
                field={f}
                value={form[f.name]}
                onChange={(v) => setForm((s) => ({ ...s, [f.name]: v }))}
              />
            ))}
            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={busy}>
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingId(null)}
                disabled={busy}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {items.map((item) =>
          editingId === item.id ? (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-md border border-border p-4"
            >
              {section.fields.map((f) => (
                <FieldInput
                  key={f.name}
                  field={f}
                  value={form[f.name]}
                  onChange={(v) => setForm((s) => ({ ...s, [f.name]: v }))}
                />
              ))}
              <div className="flex gap-2">
                <Button size="sm" onClick={save} disabled={busy}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingId(null)}
                  disabled={busy}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-md border border-border px-4 py-3"
            >
              <span className="text-sm font-medium">{item[section.titleField]}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => startEdit(item)}>
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(item.id)}>
                  Delete
                </Button>
              </div>
            </div>
          ),
        )}
      </CardContent>
    </Card>
  )
}
