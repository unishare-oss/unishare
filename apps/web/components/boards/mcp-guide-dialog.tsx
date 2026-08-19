'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { McpClientGuide, OsSwitcher, type OsKey } from '@/components/boards/mcp-client-guide'
import { cn } from '@/lib/utils'

interface McpGuideDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ProviderKey = 'claude' | 'cursor' | 'chatgpt' | 'antigravity' | 'vscode'
type ModeKey = 'desktop' | 'cli'

export function McpGuideDialog({ open, onOpenChange }: McpGuideDialogProps) {
  const [provider, setProvider] = useState<ProviderKey>('claude')
  const [mode, setMode] = useState<ModeKey>('desktop')
  const [os, setOs] = useState<OsKey>('mac')
  const [copiedEndpoint, setCopiedEndpoint] = useState(false)

  const mcpUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/mcp` : 'http://localhost:3000/mcp'

  const jsonConfig = JSON.stringify(
    {
      mcpServers: {
        unishare: {
          url: mcpUrl,
        },
      },
    },
    null,
    2,
  )

  const claudePath: Record<OsKey, string> = {
    mac: '~/Library/Application Support/Claude/claude_desktop_config.json',
    windows: '%APPDATA%\\Claude\\claude_desktop_config.json',
    linux: '~/.config/Claude/claude_desktop_config.json',
  }

  const handleCopyEndpoint = () => {
    navigator.clipboard.writeText(mcpUrl)
    setCopiedEndpoint(true)
    toast.success('Copied endpoint to clipboard')
    setTimeout(() => setCopiedEndpoint(false), 2000)
  }

  const providers: { key: ProviderKey; label: string }[] = [
    { key: 'claude', label: 'Claude' },
    { key: 'cursor', label: 'Cursor' },
    { key: 'chatgpt', label: 'ChatGPT' },
    { key: 'antigravity', label: 'Antigravity' },
    { key: 'vscode', label: 'VS Code' },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[6px] border-border bg-card sm:max-w-xl p-0 gap-0 overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-card shrink-0">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-semibold text-foreground">
              Connect AI Assistants (MCP)
            </DialogTitle>
            <DialogDescription className="font-mono text-xs text-text-muted">
              Connect external AI tools to view, create, and draw on your UniShare boards and manage
              posts.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 pt-4 space-y-4 flex-1 overflow-y-auto min-h-0">
          {/* MCP Endpoint URL */}
          <div className="space-y-1.5">
            <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
              Server Endpoint
            </label>
            <div className="flex items-center justify-between bg-muted border border-border px-3 py-2 rounded-[6px] font-mono text-xs text-foreground">
              <span className="select-all truncate">{mcpUrl}</span>
              <button
                type="button"
                onClick={handleCopyEndpoint}
                className="text-text-muted hover:text-foreground ml-2 shrink-0 transition-colors p-1 rounded-[4px] hover:bg-card border border-transparent hover:border-border"
                title="Copy Endpoint"
              >
                {copiedEndpoint ? (
                  <Check className="size-3.5 text-success" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </button>
            </div>
          </div>

          <Separator />

          {/* Assistant & Mode Selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
                Assistant
              </span>

              {/* Mode Toggle (Desktop vs CLI) */}
              <div className="inline-flex items-center gap-1 bg-muted p-0.5 rounded-[6px] border border-border">
                <button
                  type="button"
                  onClick={() => setMode('desktop')}
                  className={cn(
                    'font-mono text-[11px] px-2.5 py-1 rounded-[4px] font-medium transition-colors',
                    mode === 'desktop'
                      ? 'bg-card text-foreground font-semibold shadow-xs'
                      : 'text-text-muted hover:text-foreground',
                  )}
                >
                  Desktop / GUI
                </button>
                <button
                  type="button"
                  onClick={() => setMode('cli')}
                  className={cn(
                    'font-mono text-[11px] px-2.5 py-1 rounded-[4px] font-medium transition-colors',
                    mode === 'cli'
                      ? 'bg-card text-foreground font-semibold shadow-xs'
                      : 'text-text-muted hover:text-foreground',
                  )}
                >
                  CLI / Terminal
                </button>
              </div>
            </div>

            {/* Provider Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {providers.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setProvider(p.key)}
                  className={cn(
                    'font-mono text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-[6px] border transition-colors whitespace-nowrap',
                    provider === p.key
                      ? 'border-amber bg-amber-subtle text-amber font-semibold'
                      : 'border-border bg-card text-text-muted hover:text-foreground hover:bg-muted',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Provider Content */}
          <div className="pt-1">
            {provider === 'claude' && (
              <McpClientGuide
                mode={mode}
                desktop={{
                  customHeader: (
                    <div className="flex items-center justify-between pb-1">
                      <span className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
                        Operating System
                      </span>
                      <OsSwitcher active={os} onChange={setOs} />
                    </div>
                  ),
                  configPathLabel: 'Config File Path',
                  configPath: claudePath[os],
                  configSnippetLabel: 'Add to mcpServers in your configuration',
                  configSnippet: jsonConfig,
                  note: 'Restart Claude Desktop after saving. An authorization tab will prompt you to connect your UniShare account on first tool call.',
                }}
                cli={{
                  title: 'Claude Code CLI',
                  description: 'Add UniShare to your Claude Code workspace:',
                  command: `claude mcp add --transport http unishare ${mcpUrl}`,
                }}
              />
            )}

            {provider === 'cursor' && (
              <McpClientGuide
                mode={mode}
                desktop={{
                  title: 'Cursor Settings (GUI)',
                  steps: [
                    <>
                      Open <strong className="text-foreground">Cursor Settings</strong> →{' '}
                      <strong className="text-foreground">Features</strong> →{' '}
                      <strong className="text-foreground">MCP</strong>.
                    </>,
                    <>
                      Click <strong className="text-foreground">+ Add New MCP Server</strong>.
                    </>,
                    <>
                      Name: <code className="font-mono text-foreground">unishare</code>, Type:{' '}
                      <code className="font-mono text-foreground">sse</code> or{' '}
                      <code className="font-mono text-foreground">http</code>, URL:{' '}
                      <code className="font-mono text-foreground">{mcpUrl}</code>.
                    </>,
                  ],
                  configSnippetLabel: 'Or add via workspace config (.cursor/mcp.json)',
                  configSnippet: jsonConfig,
                }}
                cli={{
                  title: 'Cursor Terminal',
                  description: 'Register UniShare directly in Cursor:',
                  command: `cursor mcp add unishare ${mcpUrl}`,
                }}
              />
            )}

            {provider === 'chatgpt' && (
              <McpClientGuide
                mode={mode}
                desktop={{
                  title: 'ChatGPT & Codex Desktop',
                  steps: [
                    <>
                      Open <strong className="text-foreground">Settings</strong> →{' '}
                      <strong className="text-foreground">Connected Apps (MCP)</strong>.
                    </>,
                    <>
                      Click <strong className="text-foreground">Add MCP Server</strong>.
                    </>,
                    <>
                      Enter Server URL: <code className="font-mono text-foreground">{mcpUrl}</code>.
                    </>,
                    'Approve the authorization prompt with your UniShare account.',
                  ],
                }}
                cli={{
                  title: 'Codex CLI',
                  description: 'Add UniShare to your Codex CLI environment:',
                  command: `codex mcp add unishare --url ${mcpUrl}`,
                }}
              />
            )}

            {provider === 'antigravity' && (
              <McpClientGuide
                mode={mode}
                desktop={{
                  title: 'Antigravity Configuration',
                  configPathLabel: 'Global Config Path (~/.gemini/antigravity/mcp_config.json)',
                  configPath: '~/.gemini/antigravity/mcp_config.json',
                  configSnippetLabel: 'Add unishare to mcpServers in your configuration:',
                  configSnippet: JSON.stringify(
                    {
                      mcpServers: {
                        unishare: {
                          command: 'npx',
                          args: ['mcp-remote', mcpUrl],
                        },
                      },
                    },
                    null,
                    2,
                  ),
                  note: 'Antigravity connects via mcp-remote stdio transport and will prompt you to authenticate your UniShare account on first tool call.',
                }}
                cli={{
                  title: 'Workspace Project Config (.agents/mcp_config.json)',
                  description:
                    'Add to .agents/mcp_config.json in your project root or ~/.gemini/antigravity/mcp_config.json:',
                  command: JSON.stringify(
                    {
                      mcpServers: {
                        unishare: {
                          command: 'npx',
                          args: ['mcp-remote', mcpUrl],
                        },
                      },
                    },
                    null,
                    2,
                  ),
                  commandLabel: 'Copy JSON',
                }}
              />
            )}

            {provider === 'vscode' && (
              <McpClientGuide
                mode={mode}
                desktop={{
                  title: 'Cline & Roo Code Extensions',
                  steps: [
                    <>
                      Open Cline or Roo Code → Click{' '}
                      <strong className="text-foreground">MCP Servers</strong>.
                    </>,
                    <>
                      Click <strong className="text-foreground">Configure MCP Servers</strong>{' '}
                      (opens{' '}
                      <code className="font-mono text-foreground">cline_mcp_settings.json</code>).
                    </>,
                    'Paste the unishare entry below:',
                  ],
                  configSnippet: jsonConfig,
                }}
                cli={{
                  title: 'MCP Inspector CLI',
                  description: 'Test UniShare MCP tools interactively from your terminal:',
                  command: `npx -y @modelcontextprotocol/inspector ${mcpUrl}`,
                }}
              />
            )}
          </div>
        </div>

        <DialogFooter className="px-6 py-3 border-t border-border bg-card flex justify-end shrink-0">
          <Button variant="default" size="sm" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
