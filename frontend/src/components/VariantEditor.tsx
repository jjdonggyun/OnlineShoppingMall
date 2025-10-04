// src/components/VariantEditor.tsx
import { useState } from 'react'
import type { Variant, VariantSize } from '../types/product'

type Props = {
  value: Variant[]
  onChange: (v: Variant[]) => void
}

export default function VariantEditor({ value, onChange }: Props) {
  const [local, setLocal] = useState<Variant[]>(value ?? [])

  function commit(next: Variant[]) {
    setLocal(next)
    onChange(next)
  }

  function addVariant() {
    commit([
      ...local,
      { color: '', colorHex: '', coverImage: '', sizes: [{ name: '', stock: 0, sku: '' }] }
    ])
  }
  function removeVariant(idx: number) {
    const next = local.slice()
    next.splice(idx, 1)
    commit(next)
  }
  function updateVariant<K extends keyof Variant>(idx: number, key: K, val: Variant[K]) {
    const next = local.slice()
    next[idx] = { ...next[idx], [key]: val }
    commit(next)
  }

  function addSize(vidx: number) {
    const next = local.slice()
    const sizes = next[vidx].sizes ?? []
    sizes.push({ name: '', stock: 0, sku: '' })
    next[vidx] = { ...next[vidx], sizes: [...sizes] }
    commit(next)
  }
  function removeSize(vidx: number, sidx: number) {
    const next = local.slice()
    const sizes = (next[vidx].sizes ?? []).slice()
    sizes.splice(sidx, 1)
    next[vidx] = { ...next[vidx], sizes }
    commit(next)
  }
  function updateSize(vidx: number, sidx: number, patch: Partial<VariantSize>) {
    const next = local.slice()
    const sizes = (next[vidx].sizes ?? []).slice()
    sizes[sidx] = { ...sizes[sidx], ...patch }
    next[vidx] = { ...next[vidx], sizes }
    commit(next)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium">옵션(색상/사이즈)</label>
        <button type="button" onClick={addVariant} className="px-2 py-1 rounded border text-sm">+ 색상 추가</button>
      </div>

      {local.length === 0 && (
        <div className="text-xs text-gray-500 border rounded p-3">
          색상을 추가해 옵션을 구성하세요. 예) Black(HEX: #000000) / 사이즈: S, M, L
        </div>
      )}

      {local.map((v, vidx) => (
        <div key={vidx} className="border rounded-lg p-3 space-y-3">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-500">색상명</label>
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="예: Black"
                value={v.color}
                onChange={(e) => updateVariant(vidx, 'color', e.target.value)}
              />
            </div>
            <div className="w-40">
              <label className="text-xs text-gray-500">HEX</label>
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="#000000"
                value={v.colorHex || ''}
                onChange={(e) => updateVariant(vidx, 'colorHex', e.target.value)}
              />
            </div>
            <div className="w-48">
              <label className="text-xs text-gray-500">대표 이미지 URL(선택)</label>
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="/uploads/xxxx.jpg"
                value={v.coverImage || ''}
                onChange={(e) => updateVariant(vidx, 'coverImage', e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={() => removeVariant(vidx)}
              className="self-start mt-5 px-2 py-2 rounded border hover:bg-red-50 text-red-600 text-sm"
            >
              삭제
            </button>
          </div>

          {/* Sizes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">사이즈</div>
              <button type="button" onClick={() => addSize(vidx)} className="px-2 py-1 rounded border text-sm">
                + 사이즈 추가
              </button>
            </div>

            {(v.sizes ?? []).map((s, sidx) => (
              <div key={sidx} className="grid grid-cols-12 gap-2">
                <div className="col-span-3">
                  <input
                    className="w-full border rounded px-3 py-2"
                    placeholder="예: S / Free"
                    value={s.name}
                    onChange={(e) => updateSize(vidx, sidx, { name: e.target.value })}
                  />
                </div>
                <div className="col-span-3">
                  <input
                    className="w-full border rounded px-3 py-2"
                    placeholder="재고수"
                    type="number"
                    value={Number.isFinite(Number(s.stock)) ? s.stock : 0}
                    onChange={(e) => updateSize(vidx, sidx, { stock: Number(e.target.value) })}
                  />
                </div>
                <div className="col-span-5">
                  <input
                    className="w-full border rounded px-3 py-2"
                    placeholder="SKU(선택)"
                    value={s.sku || ''}
                    onChange={(e) => updateSize(vidx, sidx, { sku: e.target.value })}
                  />
                </div>
                <div className="col-span-1">
                  <button
                    type="button"
                    onClick={() => removeSize(vidx, sidx)}
                    className="w-full h-full px-2 rounded border hover:bg-gray-50 text-sm"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
