"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { OpenEnvelope, EnvelopeFlap, SealedEnvelope } from "./envelope-svgs";

interface EnvelopeAnimationProps {
  modalRect: DOMRect;
  onComplete: () => void;
}

type Phase =
  | "shrink-modal"
  | "slide-up"
  | "flap-close"
  | "sealed"
  | "fly-away"
  | "done";

export function EnvelopeAnimation({ modalRect, onComplete }: EnvelopeAnimationProps) {
  const [phase, setPhase] = useState<Phase>("shrink-modal");

  // Envelope is sized relative to viewport — large enough to look good
  // but maintains its natural square proportions
  const envelopeSize = Math.min(window.innerWidth * 0.55, 500);
  const envelopeCenterX = window.innerWidth / 2;
  const envelopeCenterY = window.innerHeight / 2;

  // The flap is proportional to the envelope — roughly 40% of height
  const flapHeight = envelopeSize * 0.4;

  const advancePhase = useCallback(() => {
    setPhase((prev) => {
      switch (prev) {
        case "shrink-modal": return "slide-up";
        case "slide-up": return "flap-close";
        case "flap-close": return "sealed";
        case "sealed": return "fly-away";
        case "fly-away": return "done";
        default: return prev;
      }
    });
  }, []);

  useEffect(() => {
    if (phase === "sealed") {
      const t = setTimeout(advancePhase, 200);
      return () => clearTimeout(t);
    }
    if (phase === "done") {
      onComplete();
    }
  }, [phase, advancePhase, onComplete]);

  return createPortal(
    <div
      className="fixed inset-0"
      style={{ zIndex: 9999, pointerEvents: "none" }}
    >
      {/* Dark backdrop that fades in */}
      <motion.div
        className="absolute inset-0 bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === "fly-away" || phase === "done" ? 0 : 1 }}
        transition={{ duration: phase === "fly-away" ? 0.4 : 0.3 }}
      />

      {/* Modal representation that shrinks into the envelope position */}
      <AnimatePresence>
        {phase === "shrink-modal" && (
          <motion.div
            className="absolute rounded-lg bg-white shadow-xl"
            initial={{
              left: modalRect.left,
              top: modalRect.top,
              width: modalRect.width,
              height: modalRect.height,
            }}
            animate={{
              left: envelopeCenterX - envelopeSize * 0.35,
              top: envelopeCenterY - envelopeSize * 0.1,
              width: envelopeSize * 0.7,
              height: envelopeSize * 0.4,
              opacity: 0.7,
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            onAnimationComplete={() => {
              if (phase === "shrink-modal") advancePhase();
            }}
            style={{
              zIndex: 2,
              border: "1px solid hsl(220 13% 91%)",
            }}
          />
        )}
      </AnimatePresence>

      {/* Open envelope — slides up from below */}
      <AnimatePresence>
        {(phase === "slide-up" || phase === "flap-close" || phase === "sealed") && (
          <motion.div
            className="absolute"
            initial={{ y: window.innerHeight }}
            animate={{ y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            onAnimationComplete={() => {
              if (phase === "slide-up") advancePhase();
            }}
            style={{
              left: envelopeCenterX - envelopeSize / 2,
              top: envelopeCenterY - envelopeSize / 2 + flapHeight * 0.3,
              width: envelopeSize,
              height: envelopeSize,
              zIndex: 3,
            }}
          >
            {/* Envelope body */}
            <OpenEnvelope width={envelopeSize} height={envelopeSize} />

            {/* Flap that closes */}
            <div
              className="absolute"
              style={{
                left: 0,
                top: -flapHeight + envelopeSize * 0.38,
                width: envelopeSize,
                height: flapHeight,
                zIndex: 5,
                perspective: 600,
              }}
            >
              <motion.div
                animate={
                  phase === "flap-close" || phase === "sealed"
                    ? { rotateX: 180 }
                    : { rotateX: 0 }
                }
                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                onAnimationComplete={() => {
                  if (phase === "flap-close") advancePhase();
                }}
                style={{
                  width: "100%",
                  height: "100%",
                  transformOrigin: "bottom center",
                  backfaceVisibility: "hidden",
                }}
              >
                <EnvelopeFlap width={envelopeSize} height={flapHeight} />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sealed envelope — fades in then flies away */}
      <AnimatePresence>
        {(phase === "sealed" || phase === "fly-away") && (
          <motion.div
            className="absolute"
            initial={{ opacity: 0 }}
            animate={
              phase === "fly-away"
                ? {
                    opacity: 1,
                    y: -(window.innerHeight + 300),
                    scale: 0.6,
                    rotate: -5,
                  }
                : { opacity: 1 }
            }
            transition={
              phase === "fly-away"
                ? { duration: 0.8, ease: [0.4, 0, 1, 1] }
                : { duration: 0.2 }
            }
            onAnimationComplete={() => {
              if (phase === "fly-away") advancePhase();
            }}
            style={{
              left: envelopeCenterX - envelopeSize / 2,
              top: envelopeCenterY - envelopeSize / 2 + flapHeight * 0.05,
              width: envelopeSize,
              height: envelopeSize,
              zIndex: 10,
            }}
          >
            <SealedEnvelope width={envelopeSize} height={envelopeSize} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
}
