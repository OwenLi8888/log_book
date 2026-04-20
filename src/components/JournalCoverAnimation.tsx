"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SESSION_KEY = "lifelog-journal-opened";

function todayFormatted() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

interface Props {
  displayName?: string | null;
  children: React.ReactNode;
}

export default function JournalCoverAnimation({ displayName, children }: Props) {
  const [phase, setPhase] = useState<"cover" | "opening" | "done">("cover");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Check if animation already played this session
    const played = sessionStorage.getItem(SESSION_KEY);
    if (played) {
      setPhase("done");
    } else {
      setPhase("cover");
    }
    setMounted(true);
  }, []);

  function startOpen() {
    sessionStorage.setItem(SESSION_KEY, "1");
    setPhase("opening");
    setTimeout(() => setPhase("done"), 1100);
  }

  if (!mounted) {
    // Avoid hydration flash — render children immediately on server
    return <>{children}</>;
  }

  const showCover = phase !== "done";

  return (
    <>
      {/* Children rendered behind — visible after cover opens */}
      <div style={{ visibility: showCover && phase !== "opening" ? "hidden" : "visible" }}>
        {children}
      </div>

      <AnimatePresence>
        {showCover && (
          <motion.div
            key="cover"
            className="fixed inset-0 z-[100] flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #2c1a0e 0%, #3d2512 40%, #4a2e18 70%, #3a2010 100%)",
              perspective: "1200px",
              transformStyle: "preserve-3d",
            }}
            initial={{ rotateY: 0 }}
            animate={
              phase === "opening"
                ? { rotateY: -180, opacity: 0 }
                : { rotateY: 0 }
            }
            transition={
              phase === "opening"
                ? { duration: 0.95, ease: [0.4, 0, 0.2, 1] }
                : {}
            }
            onAnimationComplete={() => {
              if (phase === "opening") setPhase("done");
            }}
          >
            {/* Leather texture overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, rgba(0,0,0,0.04) 0px, rgba(0,0,0,0.04) 1px, transparent 1px, transparent 4px), repeating-linear-gradient(90deg, rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 1px, transparent 1px, transparent 6px)",
                mixBlendMode: "multiply",
              }}
            />

            {/* Spine shadow on left edge */}
            <div
              className="absolute top-0 bottom-0 left-0 w-16 pointer-events-none"
              style={{
                background: "linear-gradient(to right, rgba(0,0,0,0.45) 0%, transparent 100%)",
              }}
            />

            {/* Cover content */}
            <div className="relative z-10 flex flex-col items-center text-center select-none">
              {/* Decorative border */}
              <div
                className="relative px-16 py-14"
                style={{
                  border: "1.5px solid rgba(201,168,76,0.35)",
                  borderRadius: "4px",
                  boxShadow: "inset 0 0 40px rgba(0,0,0,0.3)",
                }}
              >
                <div
                  className="absolute inset-3 pointer-events-none"
                  style={{
                    border: "0.5px solid rgba(201,168,76,0.18)",
                    borderRadius: "2px",
                  }}
                />

                {/* Corner ornaments */}
                {["top-2 left-2", "top-2 right-2", "bottom-2 left-2", "bottom-2 right-2"].map((pos, i) => (
                  <span
                    key={i}
                    className={`absolute ${pos} text-gold/50 text-xs leading-none`}
                    style={{ color: "rgba(201,168,76,0.5)" }}
                  >
                    ✦
                  </span>
                ))}

                <p
                  className="font-sans text-xs tracking-[0.35em] uppercase mb-4"
                  style={{ color: "rgba(201,168,76,0.6)" }}
                >
                  Personal Journal
                </p>

                <h1
                  className="font-serif text-5xl font-semibold mb-2"
                  style={{ color: "rgba(250,248,244,0.92)", letterSpacing: "-0.01em" }}
                >
                  LifeLog
                </h1>

                {displayName && (
                  <p
                    className="font-sans text-sm mt-3"
                    style={{ color: "rgba(250,248,244,0.55)" }}
                  >
                    {displayName}&apos;s journal
                  </p>
                )}

                <div
                  className="mt-6 pt-5"
                  style={{ borderTop: "0.5px solid rgba(201,168,76,0.2)" }}
                >
                  <p
                    className="font-sans text-xs"
                    style={{ color: "rgba(250,248,244,0.4)" }}
                  >
                    {todayFormatted()}
                  </p>
                </div>
              </div>

              {/* Open prompt */}
              <motion.button
                onClick={startOpen}
                className="mt-10 font-sans text-xs tracking-widest uppercase transition-opacity"
                style={{ color: "rgba(201,168,76,0.55)" }}
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              >
                Open journal →
              </motion.button>
            </div>

            {/* Shadow sweep — casts a moving shadow as cover rotates */}
            {phase === "opening" && (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.6, 0] }}
                transition={{ duration: 0.95, ease: "easeInOut" }}
                style={{
                  background: "linear-gradient(to left, rgba(0,0,0,0.8) 0%, transparent 60%)",
                }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
