import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, MessageCircle, MoveRight, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface HeroProps {
  /** Static first line of the H1, before the rotating word. */
  lead?: string;
  /** Words that rotate inside the H1 (first one is rendered server-side). */
  titles?: string[];
  /** Static closing line of the H1, after the rotating word. */
  tail?: string;
  /** Small badge above the H1. */
  badge?: string;
  badgeHref?: string;
  /** Paragraph under the H1. */
  description?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  /** Opens the secondary link in a new tab with rel="nofollow noopener". */
  secondaryExternal?: boolean;
  secondaryIcon?: "phone" | "chat";
  /** Short trust claims rendered under the buttons. */
  trust?: string[];
}

const ROTATE_MS = 2000;

// Keep every entry ≤15 chars: the rotating box is one line high and clips
// (overflow-hidden) — at text-4xl on a 375px viewport ~15 chars is the limit.
const DEFAULT_TITLES = [
  "écht werkt",
  "24/7 opneemt",
  "klanten brengt",
  "werk overneemt",
  "afspraken plant",
];

function Hero({
  lead = "AI bureau in Nederland dat",
  titles: titlesProp,
  tail = "voor het MKB.",
  badge = "Vanaf €149/mnd · 14 dagen geld terug",
  badgeHref = "/tarieven/",
  description = "Wij bouwen de AI-receptionist die uw telefoon aanneemt, de website die klanten brengt en de AI automatisering die repetitief werk overneemt. Live in 7 werkdagen.",
  primaryLabel = "Boek een gratis demo",
  primaryHref = "/demo-aanvragen/",
  secondaryLabel = "Plan een gesprek",
  secondaryHref = "/demo-inplannen/",
  secondaryExternal = false,
  secondaryIcon = "phone",
  trust,
}: HeroProps) {
  const [titleNumber, setTitleNumber] = useState(0);
  const reduceMotion = useReducedMotion();
  const titles = useMemo(() => titlesProp ?? DEFAULT_TITLES, [titlesProp]);
  const SecondaryIcon = secondaryIcon === "chat" ? MessageCircle : PhoneCall;

  useEffect(() => {
    // WCAG 2.2.2: no auto-rotation when the visitor prefers reduced motion.
    if (reduceMotion) return;
    const timeoutId = setTimeout(() => {
      if (titleNumber === titles.length - 1) {
        setTitleNumber(0);
      } else {
        setTitleNumber(titleNumber + 1);
      }
    }, ROTATE_MS);
    return () => clearTimeout(timeoutId);
  }, [titleNumber, titles, reduceMotion]);

  return (
    <div className="w-full">
      <div className="container mx-auto">
        <div className="flex gap-8 py-20 lg:py-40 items-center justify-center flex-col">
          <div>
            <Button variant="secondary" size="sm" className="gap-4" asChild>
              <a href={badgeHref}>
                {badge} <MoveRight className="w-4 h-4" />
              </a>
            </Button>
          </div>
          <div className="flex gap-4 flex-col">
            <h1 className="w-full text-4xl sm:text-5xl md:text-7xl max-w-3xl tracking-tighter text-center font-normal text-foreground">
              <span>{lead}</span>
              <span className="relative flex w-full justify-center overflow-hidden text-center md:pb-4 md:pt-1">
                &nbsp;
                {titles.map((title, index) => (
                  <motion.span
                    key={index}
                    className="absolute font-semibold whitespace-nowrap"
                    aria-hidden={titleNumber !== index}
                    // Active word gets `initial={false}` so the server-rendered
                    // HTML already shows it (no blank H1 before hydration / no-JS).
                    initial={titleNumber === index ? false : { opacity: 0, y: -100 }}
                    transition={{ type: "spring", stiffness: 50 }}
                    animate={
                      titleNumber === index
                        ? {
                            y: 0,
                            opacity: 1,
                          }
                        : {
                            y: titleNumber > index ? -150 : 150,
                            opacity: 0,
                          }
                    }
                  >
                    {title}
                  </motion.span>
                ))}
              </span>
              <span className="block">{tail}</span>
            </h1>

            <p className="text-lg md:text-xl leading-relaxed tracking-tight text-muted-foreground max-w-2xl text-center">
              {description}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button size="lg" className="gap-4" variant="outline" asChild>
              <a
                href={secondaryHref}
                id="hero-agenda-btn"
                {...(secondaryExternal
                  ? { target: "_blank", rel: "nofollow noopener" }
                  : {})}
              >
                {secondaryLabel} <SecondaryIcon className="w-4 h-4" />
              </a>
            </Button>
            <Button size="lg" className="gap-4" asChild>
              <a href={primaryHref} id="hero-demo-btn">
                {primaryLabel} <MoveRight className="w-4 h-4" />
              </a>
            </Button>
          </div>
          {trust && trust.length > 0 ? (
            <ul className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-muted-foreground">
              {trust.map((item) => (
                <li key={item} className="inline-flex items-center gap-2">
                  <Check className="w-4 h-4 text-brand-emerald" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export { Hero };
