'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import CreatePinDrawer from './CreatePinDrawer'

export default function CreatePinButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const dragCounter = useRef(0)

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) {
        dragCounter.current++
        setDragActive(true)
      }
    }
    const handleDragLeave = () => {
      dragCounter.current--
      if (dragCounter.current === 0) setDragActive(false)
    }
    const handleDragOver = (e: DragEvent) => { e.preventDefault() }
    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      dragCounter.current = 0
      setDragActive(false)
      const file = e.dataTransfer?.files[0]
      if (file && file.type.startsWith('image/')) {
        setPendingFile(file)
        setIsOpen(true)
      }
    }

    window.addEventListener('dragenter', handleDragEnter)
    window.addEventListener('dragleave', handleDragLeave)
    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('drop', handleDrop)
    return () => {
      window.removeEventListener('dragenter', handleDragEnter)
      window.removeEventListener('dragleave', handleDragLeave)
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('drop', handleDrop)
    }
  }, [])

  function handleClose() {
    setIsOpen(false)
    setPendingFile(null)
  }

  return (
    <>
      <button
        data-tour="create-pin"
        className="btn-ghost"
        onClick={() => setIsOpen(true)}
        style={{ fontSize: '9px' }}
      >
        + PIN
      </button>

      {dragActive && createPortal(
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', letterSpacing: '0.08em' }}>
              SOLTE PARA CRIAR UM PIN
            </p>
          </div>
        </div>,
        document.body
      )}

      {isOpen && (
        <CreatePinDrawer
          initialFile={pendingFile ?? undefined}
          onClose={handleClose}
        />
      )}
    </>
  )
}
