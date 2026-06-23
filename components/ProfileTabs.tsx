'use client'

import { useState } from 'react'
import type { PinWithMeta, CollectionGroup } from '@/lib/pins'
import PinCard from './PinCard'
import CollectionCard from './CollectionCard'

type Tab = 'pins' | 'collections' | 'saved'

function MasonryGrid({ pins }: { pins: PinWithMeta[] }) {
  if (pins.length === 0) return null
  const cols: PinWithMeta[][] = [[], [], []]
  pins.forEach((p, i) => cols[i % 3].push(p))
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
      {cols.map((col, idx) => (
        <div key={idx}>{col.map((p) => <PinCard key={p.id} pin={p} />)}</div>
      ))}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="caption" style={{ color: 'var(--text-faint)', padding: '48px', textAlign: 'center' }}>
      {message}
    </p>
  )
}

export default function ProfileTabs({
  authorPins,
  savedPins,
  collections,
  isOwnProfile,
}: {
  authorPins: PinWithMeta[]
  savedPins: PinWithMeta[]
  collections: CollectionGroup[]
  isOwnProfile: boolean
}) {
  const [activeTab, setActiveTab] = useState<Tab>('pins')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'pins',        label: 'MEUS PINS' },
    { id: 'collections', label: 'COLEÇÕES' },
    ...(isOwnProfile ? [{ id: 'saved' as Tab, label: 'SALVOS' }] : []),
  ]

  function renderContent() {
    if (activeTab === 'pins') {
      return authorPins.length > 0
        ? <MasonryGrid pins={authorPins} />
        : <EmptyState message="NENHUM PIN PUBLICADO" />
    }

    if (activeTab === 'collections') {
      if (collections.length === 0) return <EmptyState message="NENHUMA COLEÇÃO CRIADA" />
      const cols: CollectionGroup[][] = [[], [], []]
      collections.forEach((c, i) => cols[i % 3].push(c))
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
          {cols.map((col, idx) => (
            <div key={idx}>
              {col.map((c) => <CollectionCard key={c.name} group={c} />)}
            </div>
          ))}
        </div>
      )
    }

    if (activeTab === 'saved') {
      return savedPins.length > 0
        ? <MasonryGrid pins={savedPins} />
        : <EmptyState message="NENHUM PIN SALVO" />
    }

    return null
  }

  return (
    <>
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 20px',
      }}>
        {tabs.map((tab) => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'none', border: 'none',
                borderBottom: active ? '2px solid var(--text)' : '2px solid transparent',
                color: active ? 'var(--text)' : 'var(--text-muted)',
                fontFamily: 'var(--font)', fontSize: '9px', fontWeight: 700,
                letterSpacing: '1.2px', textTransform: 'uppercase',
                padding: '10px 14px', cursor: 'pointer', marginBottom: '-1px',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      <div style={{ padding: '12px 20px' }}>
        {renderContent()}
      </div>
    </>
  )
}
