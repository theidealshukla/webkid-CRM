"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";
import { getSetting, upsertSetting, revalidatePublic } from "@/lib/cms/queries";
import type { HeroLaunches, CtaConfig } from "@/lib/cms/types";

type HeroForm = {
  count: number;
  label: string;
  subtext: string;
  ctaPrimary: CtaConfig;
  ctaSecondary: CtaConfig;
  trustLine: string;
};

const DEFAULTS: HeroForm = {
  count: 3,
  label: "businesses launched this month",
  subtext: "We design and build websites that turn visitors into paying customers. Fast delivery. No templates. Built for results.",
  ctaPrimary:   { label: "Get a Free Quote", url: "/contact" },
  ctaSecondary: { label: "See Our Work",     url: "/projects" },
  trustLine:    "Trusted by clinics, solar companies, gyms & restaurants across India",
};

export default function HeroSettingsPage() {
  const [form, setForm] = useState<HeroForm>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [launches, subtext, p, s, trust] = await Promise.all([
          getSetting<HeroLaunches>("hero.launches"),
          getSetting<string>("hero.subtext"),
          getSetting<CtaConfig>("hero.cta_primary"),
          getSetting<CtaConfig>("hero.cta_secondary"),
          getSetting<string>("site.trust_line"),
        ]);
        setForm({
          count: launches?.count ?? DEFAULTS.count,
          label: launches?.label ?? DEFAULTS.label,
          subtext: subtext ?? DEFAULTS.subtext,
          ctaPrimary: p ?? DEFAULTS.ctaPrimary,
          ctaSecondary: s ?? DEFAULTS.ctaSecondary,
          trustLine: trust ?? DEFAULTS.trustLine,
        });
      } catch (e: any) {
        toast.error("Failed to load: " + (e?.message ?? "unknown"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save() {
    setSaving(true);
    try {
      await Promise.all([
        upsertSetting("hero.launches", { count: Number(form.count), label: form.label }),
        upsertSetting("hero.subtext", form.subtext),
        upsertSetting("hero.cta_primary", form.ctaPrimary),
        upsertSetting("hero.cta_secondary", form.ctaSecondary),
        upsertSetting("site.trust_line", form.trustLine),
      ]);
      await revalidatePublic("cms:hero");
      toast.success("Saved. Public site will refresh shortly.");
    } catch (e: any) {
      toast.error("Save failed: " + (e?.message ?? "unknown"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex items-center gap-2 text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Section title="Launches counter">
        <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-3">
          <Field label="Count">
            <input type="number" min={0} value={form.count}
              onChange={(e) => setForm(f => ({ ...f, count: Number(e.target.value) }))}
              className="input"/>
          </Field>
          <Field label="Label">
            <input type="text" value={form.label}
              onChange={(e) => setForm(f => ({ ...f, label: e.target.value }))}
              className="input"/>
          </Field>
        </div>
        <p className="text-xs text-gray-500 mt-2">Renders as: <b>{form.count}+</b> {form.label}</p>
      </Section>

      <Section title="Subtext">
        <textarea rows={3} value={form.subtext}
          onChange={(e) => setForm(f => ({ ...f, subtext: e.target.value }))}
          className="input resize-y"/>
      </Section>

      <Section title="Primary CTA">
        <CtaInputs value={form.ctaPrimary} onChange={(v) => setForm(f => ({ ...f, ctaPrimary: v }))} />
      </Section>

      <Section title="Secondary CTA">
        <CtaInputs value={form.ctaSecondary} onChange={(v) => setForm(f => ({ ...f, ctaSecondary: v }))} />
      </Section>

      <Section title="Trust line (mobile-only on hero)">
        <input type="text" value={form.trustLine}
          onChange={(e) => setForm(f => ({ ...f, trustLine: e.target.value }))}
          className="input"/>
      </Section>

      <div className="flex justify-end pt-2 border-t border-gray-100">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-md"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save changes
        </button>
      </div>

      <style jsx>{`
        .input {
          width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.5rem;
          font-size: 0.875rem; outline: none;
        }
        .input:focus { border-color: #9ca3af; box-shadow: 0 0 0 3px rgba(156,163,175,0.15); }
      `}</style>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{title}</h3>
      {children}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-600">{label}</span>
      {children}
    </label>
  );
}
function CtaInputs({ value, onChange }: { value: CtaConfig; onChange: (v: CtaConfig) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label="Label">
        <input type="text" value={value.label}
          onChange={(e) => onChange({ ...value, label: e.target.value })}
          className="input"/>
      </Field>
      <Field label="URL">
        <input type="text" value={value.url}
          onChange={(e) => onChange({ ...value, url: e.target.value })}
          className="input"/>
      </Field>
    </div>
  );
}
