'use client'

import { useEffect, useRef, useState, type ComponentProps } from 'react'
import { A2uiSurface } from '@a2ui/react'
import { MessageProcessor } from '@a2ui/web_core'
import { basicCatalog } from '@a2ui/web_core/catalogs/basic/v1'

/**
 * One A2UI v1.0 message: `createSurface`, `updateComponents` or `updateDataModel`.
 *
 * Typed loosely on purpose. The SDK validates each message against the catalog when it is
 * processed, and its own payload types are generic over the catalog, which would force a cast at
 * every call site instead of here.
 */
export type A2uiMessage = Record<string, unknown>

type Surface = ComponentProps<typeof A2uiSurface>['surface']

/**
 * Draws the surfaces described by a list of A2UI messages, using the basic catalog.
 *
 * Messages are applied in order to one processor, and only the ones not yet applied are sent, so
 * the same component can take a whole reply or one that is still arriving and re-render as
 * messages are appended.
 */
export function A2uiSurfaces({ messages }: { messages: A2uiMessage[] }) {
  const [processor] = useState(() => new MessageProcessor([basicCatalog as never]))
  const [surfaces, setSurfaces] = useState<Surface[]>([])
  const applied = useRef(0)

  useEffect(() => {
    const sync = () =>
      setSurfaces(Array.from(processor.model.surfacesMap.values()) as unknown as Surface[])
    const created = processor.onSurfaceCreated(sync)
    const deleted = processor.onSurfaceDeleted(sync)
    return () => {
      created.unsubscribe()
      deleted.unsubscribe()
    }
  }, [processor])

  useEffect(() => {
    if (messages.length <= applied.current) return
    const pending = messages.slice(applied.current)
    applied.current = messages.length
    processor.processMessages(pending as never)
  }, [messages, processor])

  return (
    <div>
      {surfaces.map((surface) => (
        <A2uiSurface key={surface.id} surface={surface} />
      ))}
    </div>
  )
}
