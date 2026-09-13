import { Link2, MessageSquareText, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { APP_SOURCES, PERMISSION_CATALOG } from "@/lib/analyzer";
import type { AppDetails, AppSource, InputKind } from "@/lib/analyzer";
import { cn } from "@/lib/utils";

export function Intake({
  kind,
  text,
  app,
  busy,
  disabled,
  onKind,
  onText,
  onApp,
  onSubmit,
}: {
  kind: InputKind;
  text: string;
  app: AppDetails;
  busy: boolean;
  disabled?: boolean;
  onKind: (kind: InputKind) => void;
  onText: (text: string) => void;
  onApp: (app: AppDetails) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="rounded-xl bg-surface p-3 shadow-[var(--shadow-border)] sm:p-4"
    >
      <Tabs
        value={kind}
        onValueChange={(value) => onKind(value as InputKind)}
      >
        <TabsList aria-label="What to check">
          <TabsTrigger value="link" className="gap-2">
            <Link2 className="size-4" />
            Link
          </TabsTrigger>
          <TabsTrigger value="message" className="gap-2">
            <MessageSquareText className="size-4" />
            Message
          </TabsTrigger>
          <TabsTrigger value="app" className="gap-2">
            <Smartphone className="size-4" />
            App
          </TabsTrigger>
        </TabsList>

        <TabsContent value="link">
          <Label htmlFor="link-input" className="sr-only">
            Suspicious link
          </Label>
          <Textarea
            id="link-input"
            value={text}
            onChange={(e) => onText(e.target.value)}
            placeholder="Paste a full address, or a message that contains one."
            className="min-h-32 font-mono text-sm leading-relaxed"
          />
        </TabsContent>

        <TabsContent value="message">
          <Label htmlFor="message-input" className="sr-only">
            Suspicious message
          </Label>
          <Textarea
            id="message-input"
            value={text}
            onChange={(e) => onText(e.target.value)}
            placeholder="Paste the SMS, chat, email, or what the caller said."
            className="min-h-32 leading-relaxed"
          />
        </TabsContent>

        <TabsContent value="app">
          <AppFields app={app} onChange={onApp} />
        </TabsContent>
      </Tabs>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-mono text-xs text-subtle">
          Runs only when you press Check. The text stays on your device; the
          domain is verified against live public feeds.
        </p>
        <Button type="submit" disabled={busy || disabled} className="w-full sm:w-auto">
          {busy ? "Checking…" : "Check this"}
        </Button>
      </div>
    </form>
  );
}

function AppFields({
  app,
  onChange,
}: {
  app: AppDetails;
  onChange: (app: AppDetails) => void;
}) {
  const patch = (partial: Partial<AppDetails>) => onChange({ ...app, ...partial });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="App name" htmlFor="app-name">
          <Input
            id="app-name"
            value={app.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="e.g. Instant loan"
          />
        </Field>
        <Field label="Publisher" htmlFor="app-dev">
          <Input
            id="app-dev"
            value={app.developer}
            onChange={(e) => patch({ developer: e.target.value })}
            placeholder="Who made it, if you know"
          />
        </Field>
      </div>

      <Field label="Where did it come from?">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {APP_SOURCES.map((source) => {
            const selected = app.source === source.id;
            return (
              <button
                key={source.id}
                type="button"
                onClick={() => patch({ source: source.id as AppSource })}
                className={cn(
                  "h-11 rounded-md px-3 text-left text-sm transition-[background-color,box-shadow,color] duration-[150ms]",
                  selected
                    ? "bg-accent text-accent-fg"
                    : "bg-elevated text-muted shadow-[var(--shadow-border)] hover:text-fg",
                )}
                aria-pressed={selected}
              >
                {source.label}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Permissions it asked for">
        <div className="flex flex-wrap gap-2">
          {PERMISSION_CATALOG.map((perm) => {
            const on = app.permissions.includes(perm.id);
            return (
              <button
                key={perm.id}
                type="button"
                onClick={() =>
                  patch({
                    permissions: on
                      ? app.permissions.filter((id) => id !== perm.id)
                      : [...app.permissions, perm.id],
                  })
                }
                className={cn(
                  "h-11 rounded-full px-3 text-sm transition-[background-color,color,box-shadow] duration-[150ms]",
                  on
                    ? "bg-accent text-accent-fg"
                    : "bg-elevated text-muted shadow-[var(--shadow-border)] hover:text-fg",
                )}
                aria-pressed={on}
                title={perm.hint}
              >
                {perm.label}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="What does it claim to do?" htmlFor="app-purpose">
        <Textarea
          id="app-purpose"
          value={app.claimedPurpose}
          onChange={(e) => patch({ claimedPurpose: e.target.value })}
          placeholder="Loan, job tasks, cleaner, torch…"
          className="min-h-24"
        />
      </Field>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor} className="text-muted">
        {label}
      </Label>
      {children}
    </div>
  );
}
