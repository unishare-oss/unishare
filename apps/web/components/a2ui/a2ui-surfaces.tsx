'use client'

import { useEffect, useRef, useState, type ComponentProps } from 'react'
import { A2uiSurface, MarkdownComponentContext, type MarkdownComponentProps } from '@a2ui/react'
import { MessageProcessor } from '@a2ui/web_core'
import { basicCatalog } from '@a2ui/web_core/catalogs/basic/v1'
import './a2ui-theme.css'

/**
 * One A2UI v1.0 message: `createSurface`, `updateComponents` or `updateDataModel`.
 *
 * Typed loosely on purpose. The SDK validates each message against the catalog when it is
 * processed, and its own payload types are generic over the catalog, which would force a cast at
 * every call site instead of here.
 */
export type A2uiMessage = Record<string, unknown>

/** An action a surface raised, such as a button press. */
export interface A2uiAction {
  name: string
  surfaceId: string
  context: Record<string, unknown>
}

/** Read and write one surface's data model, the values its components are bound to. */
export interface A2uiDataModel {
  get: (path: string) => unknown
  set: (path: string, value: unknown) => void
}

type Surface = ComponentProps<typeof A2uiSurface>['surface']

/**
 * Text in a surface is shown as text.
 *
 * The catalog's `Text` renders Markdown and needs a renderer from the app. Surface text comes from
 * a model working on user-uploaded documents, so this one deliberately renders none: a link in it
 * stays a string a student can read, not an anchor one click away, for the same reason `AiReply`
 * drops links and images.
 */
function PlainText({ markdown }: MarkdownComponentProps) {
  return <span className="whitespace-pre-wrap">{markdown}</span>
}

/**
 * Draws the surfaces described by a list of A2UI messages, using the basic catalog.
 *
 * Messages are applied in order to one processor, and only the ones not yet applied are sent, so
 * the same component can take a whole reply or one that is still arriving and re-render as
 * messages are appended.
 *
 * `onAction` runs when a component raises an action. It gets the surface's data model, so the
 * app can read what the student chose and write a result back for the surface to show.
 */
export function A2uiSurfaces({
  messages,
  onAction,
}: {
  messages: A2uiMessage[]
  onAction?: (action: A2uiAction, dataModel: A2uiDataModel) => void
}) {
  const onActionRef = useRef(onAction)
  useEffect(() => {
    onActionRef.current = onAction
  }, [onAction])

  const [processor] = useState(() => new MessageProcessor([basicCatalog as never]))
  const [surfaces, setSurfaces] = useState<Surface[]>([])
  const applied = useRef(0)

  useEffect(() => {
    const sync = () =>
      setSurfaces(Array.from(processor.model.surfacesMap.values()) as unknown as Surface[])
    const actionSubscriptions: { unsubscribe: () => void }[] = []

    const created = processor.onSurfaceCreated((surface) => {
      actionSubscriptions.push(
        surface.onAction.subscribe((action) => {
          onActionRef.current?.(
            { name: action.name, surfaceId: action.surfaceId, context: action.context },
            {
              get: (path) => surface.dataModel.get(path),
              set: (path, value) => {
                surface.dataModel.set(path, value)
              },
            },
          )
        }),
      )
      sync()
    })
    const deleted = processor.onSurfaceDeleted(sync)

    return () => {
      created.unsubscribe()
      deleted.unsubscribe()
      actionSubscriptions.forEach((subscription) => subscription.unsubscribe())
    }
  }, [processor])

  useEffect(() => {
    if (messages.length <= applied.current) return
    const pending = messages.slice(applied.current)
    applied.current = messages.length
    processor.processMessages(pending as never)
  }, [messages, processor])

  return (
    <MarkdownComponentContext.Provider value={PlainText}>
      <div className="a2ui-themed">
        {surfaces.map((surface) => (
          <A2uiSurface key={surface.id} surface={surface} />
        ))}
      </div>
    </MarkdownComponentContext.Provider>
  )
}
