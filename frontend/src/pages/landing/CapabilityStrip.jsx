import { Clock, HeartHandshake, Languages, UserPlus, Zap } from "lucide-react";

const CAPABILITIES = [
  { icon: Clock, label: "24/7" },
  { icon: Languages, label: "Khmer · English · Chinese" },
  { icon: Zap, label: "Instant answers" },
  { icon: UserPlus, label: "Leads sent to your phone" },
  { icon: HeartHandshake, label: "Human handoff when needed" },
];

export default function CapabilityStrip() {
  return (
    <section className="border-y border-white/10 bg-base py-8">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-8 gap-y-4 px-5 sm:px-8">
        {CAPABILITIES.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-accent" strokeWidth={2} />
            <span className="text-sm font-medium text-shell-text-muted">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
