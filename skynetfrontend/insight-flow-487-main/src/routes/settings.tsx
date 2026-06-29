import { createFileRoute } from "@tanstack/react-router";
import { Sun, Moon, Monitor, Bell, Globe, KeyRound, Info, User, ExternalLink } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — SKYNET" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="scrollbar-thin h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage workspace preferences and integrations.
        </p>

        <Section icon={User} title="Profile" description="How others see you in the workspace.">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/20 backdrop-blur-md border border-primary/30 text-sm font-bold text-foreground shadow-sm">
              KK
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <Label className="text-xs">Display name</Label>
                <Input defaultValue="Kiran Kumar" className="mt-1 h-9 rounded-lg bg-card" />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input defaultValue="kirankumarpetlu48@gmai.com" className="mt-1 h-9 rounded-lg bg-card" />
              </div>
            </div>
          </div>
        </Section>

        <Section
          icon={Sun}
          title="Appearance"
          description="Customize how SKYNET looks on your device."
        >
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "light", label: "Light", Icon: Sun },
              { id: "dark", label: "Dark", Icon: Moon },
              { id: "system", label: "System", Icon: Monitor },
            ].map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setTheme(id)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border p-4 text-sm transition-all",
                  theme === id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40",
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            ))}
          </div>
        </Section>

        <Section icon={Globe} title="Language" description="Choose your interface language.">
          <select className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm">
            <option>English (US)</option>
            <option>Français</option>
            <option>Español</option>
            <option>Deutsch</option>
          </select>
        </Section>

        <Section
          icon={Bell}
          title="Notifications"
          description="Choose what you want to be alerted about."
        >
          {["Upload complete", "Risk detected", "CRM sync finished", "Comparison reports"].map(
            (label, i) => (
              <div
                key={label}
                className="flex items-center justify-between border-t border-border py-3 first:border-0 first:pt-0"
              >
                <span className="text-sm">{label}</span>
                <Switch defaultChecked={i !== 3} />
              </div>
            ),
          )}
        </Section>



        <Section icon={Info} title="About">
          <div className="space-y-3 text-sm text-muted-foreground">
            <div>SKYNET Document Intelligence · v0.1.0 (preview)</div>
            <div className="pt-3 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span>Developed by <strong className="font-medium text-foreground">Kiran Kumar Petlu</strong></span>
              <a 
                href="https://kiran-kumarp.vercel.app/" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                Portfolio <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass-panel mt-6 rounded-2xl p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
