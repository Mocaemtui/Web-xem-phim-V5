import { motion, AnimatePresence } from 'framer-motion';
import type { Reaction } from '@/hooks/useWatchTogether';

interface FloatingReactionsProps {
  reactions: Reaction[];
}

export default function FloatingReactions({ reactions }: FloatingReactionsProps) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      <AnimatePresence mode="popLayout">
        {reactions.map((reaction) => {
          // Randomize curve and rotation for natural feel
          const xOffset = (Math.random() * 40) - 20;
          const rotateAngle = (Math.random() * 60) - 30;

          return (
            <motion.div
              key={reaction.id}
              initial={{ opacity: 0, y: 50, scale: 0.5, x: `${reaction.x}%`, rotate: 0 }}
              animate={{
                opacity: [0, 1, 0],
                y: -200,
                scale: [0.5, 1.2, 1],
                x: [`${reaction.x}%`, `${reaction.x + xOffset}%`],
                rotate: rotateAngle
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, ease: "easeOut" }}
              className="absolute bottom-0 text-4xl drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] will-change-transform"
              style={{ left: 0, right: 0 }}
            >
              {reaction.emoji}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
