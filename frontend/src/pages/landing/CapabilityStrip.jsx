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
    <section className="border-b border-landing-ink bg-landing-ink py-5">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-3 px-6 min-[420px]:grid-cols-2 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-8 sm:gap-y-4 sm:px-8">
        {CAPABILITIES.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-landing-lime" strokeWidth={2} />
            <span className="text-sm font-semibold text-white/75">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
