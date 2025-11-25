// src/components/Dashboard/StatCard.tsx
import React, { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color?: "red" | "orange" | "yellow" | "teal";
  glow?: boolean;
}

const colorMap = {
  red: "from-red-500 to-red-600",
  orange: "from-orange-500 to-orange-600",
  yellow: "from-yellow-500 to-yellow-600",
  teal: "from-teal-500 to-teal-600",
};

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color = "teal", glow = false }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useTransform(y, [-50, 50], [8, -8]);
  const rotateY = useTransform(x, [-50, 50], [-8, 8]);

  // Smooth count-up animation for numbers
  useEffect(() => {
    if (typeof value === "number") {
      let start = 0;
      const duration = 800;
      const increment = value / (duration / 20);

      const counter = setInterval(() => {
        start += increment;
        if (start >= value) {
          setDisplayValue(value);
          clearInterval(counter);
        } else {
          setDisplayValue(Math.floor(start));
        }
      }, 20);

      return () => clearInterval(counter);
    } else {
      setDisplayValue(value);
    }
  }, [value]);

  return (
    <motion.div
      className="
        relative p-6 rounded-2xl 
        bg-dark-surface/40 backdrop-blur-md 
        border border-dark-secondary 
        shadow-lg 
        transition-shadow duration-300 
        cursor-pointer select-none
      "
      style={{ rotateX, rotateY }}
      onMouseMove={(e) => {
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        x.set(e.clientX - (rect.left + rect.width / 2));
        y.set(e.clientY - (rect.top + rect.height / 2));
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      whileHover={{
        scale: 1.03,
        transition: { duration: 0.2 },
      }}
    >
      {/* Neon Glow Border */}
      {glow && (
        <motion.div
          className={`
            absolute inset-0 rounded-2xl opacity-40 blur-xl 
            bg-gradient-to-br ${colorMap[color]}
          `}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.45 }}
          transition={{ duration: 0.6 }}
        />
      )}

      {/* Icon Circle */}
      <motion.div
        whileHover={{ scale: 1.15 }}
        className={`
          w-12 h-12 rounded-xl flex items-center justify-center
          bg-gradient-to-br ${colorMap[color]} shadow-lg relative z-10
        `}
      >
        <Icon className="w-6 h-6 text-white" />
      </motion.div>

      {/* Text Content */}
      <div className="mt-4 relative z-10">
        <div className="text-gray-400 text-sm tracking-wide">{title}</div>
        <div className="text-3xl font-bold text-cream mt-1">
          {displayValue}
        </div>
      </div>
    </motion.div>
  );
};

export default StatCard;
