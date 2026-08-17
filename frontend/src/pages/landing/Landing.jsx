import { useEffect } from "react";
import CapabilityStrip from "./CapabilityStrip";
import FAQ from "./FAQ";
import Hero from "./Hero";
import HowItWorks from "./HowItWorks";
import LandingFooter from "./LandingFooter";
import LandingNav from "./LandingNav";
import LiveDemo from "./LiveDemo";
import Pricing from "./Pricing";
import ProblemSolution from "./ProblemSolution";

export default function Landing() {
  useEffect(() => {
    document.title = "WeCare — A receptionist that never sleeps";
  }, []);

  return (
    <div className="overflow-hidden bg-landing-paper text-landing-ink">
      <LandingNav />
      <Hero />
      <LiveDemo />
      <ProblemSolution />
      <HowItWorks />
      <CapabilityStrip />
      <Pricing />
      <FAQ />
      <LandingFooter />
    </div>
  );
}
