'use client'

import { useState } from 'react'
import EditPinDrawer from '@/components/EditPinDrawer'
import DeleteConfirmModal from '@/components/DeleteConfirmModal'
import type { PinWithMeta } from '@/lib/pins'

export default function PinOwnerActions({ pin }: { pin: PinWithMeta }) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <button type="button" className="btn-ghost" onClick={() => setEditOpen(true)}>
        EDITAR
      </button>
      <button type="button" className="btn-ghost" onClick={() => setDeleteOpen(true)}>
        EXCLUIR
      </button>

      {editOpen && <EditPinDrawer pin={pin} onClose={() => setEditOpen(false)} />}
      {deleteOpen && <DeleteConfirmModal pinId={pin.id} onClose={() => setDeleteOpen(false)} />}
    </>
  )
}
