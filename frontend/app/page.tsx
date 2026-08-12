"use client";

import { useState } from "react";
import ConverterView from "@/components/ConverterView";
import Header from "@/components/Header";
import HomeView from "@/components/HomeView";
import type { Feature } from "@/lib/features";

export default function Page() {
  // Views are swapped client-side — this stays a single page, no route changes.
  const [activeFeature, setActiveFeature] = useState<Feature | null>(null);

  const goHome = () => {
    setActiveFeature(null);
    window.scrollTo({ top: 0 });
  };

  const openFeature = (feature: Feature) => {
    setActiveFeature(feature);
    window.scrollTo({ top: 0 });
  };

  return (
    <>
      <Header onHome={goHome} showHomeButton={activeFeature !== null} />
      {activeFeature ? (
        <ConverterView feature={activeFeature} onBack={goHome} />
      ) : (
        <HomeView onSelectFeature={openFeature} />
      )}
    </>
  );
}
