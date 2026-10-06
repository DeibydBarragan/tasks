"use client";

import { Children } from "react";
import { LazyMotion, MotionConfig, domAnimation, m } from "framer-motion";

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
};

// Tope de animados: con muchos hijos se muestran directo (rendimiento móvil).
const STAGGER_CAP = 12;

export function Stagger({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const count = Children.count(children);
  return (
    <m.ul
      className={className}
      initial={count > STAGGER_CAP ? false : "hidden"}
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.06 } } }}
    >
      {children}
    </m.ul>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <m.li className={className} variants={item} transition={{ duration: 0.32, ease: "easeOut" }}>
      {children}
    </m.li>
  );
}

export function FadeIn({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay }}
    >
      {children}
    </m.div>
  );
}
