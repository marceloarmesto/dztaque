'use client'

import { useState } from 'react'
import CreatePinDrawer from './CreatePinDrawer'

export default function CreatePinButton() {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <>
      <button
        className="btn-ghost"
        onClick={() => setIsOpen(true)}
        style={{ fontSize: '9px' }}
      >
        + PIN
      </button>
      {isOpen && <CreatePinDrawer onClose={() => setIsOpen(false)} />}
    </>
  )
}
